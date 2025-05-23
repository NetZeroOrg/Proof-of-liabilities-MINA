import { rangeCheckProgram } from "@netzero/circuits/dist/index.js";
import { merge, mergePathNodes, newLeaf, newPaddingNode, newPadPathNode, Node, PathNode } from "./node.js";
import { Height, NodePosition } from "./position.js";
import { DBRecord, Direction, newPaddingNodeParams, newPaddingPathNode } from "./types.js";
import { Store } from "./store.js";
import { Bytes32 } from "./bytes.js";
import { XCordGenerator } from "./xCordGen.js";
import { kdf } from "./kdf.js";
import { createClient } from "redis";
import fs from "fs"
import path from "path"


const USER_KEY_PREFIX = "user"
export type paddingNodeContent = (nodePos: NodePosition) => newPaddingNodeParams;
export type paddingPathNodeContent = (nodePos: NodePosition) => newPaddingPathNode;
interface Pair {
    left?: [NodePosition, Node];
    right?: [NodePosition, Node];
}

interface PathPair {
    left?: [NodePosition, PathNode]
    right?: [NodePosition, PathNode];
}

async function padIfNotMatched(pair: Pair, paddingNodeContent: paddingNodeContent): Promise<Pair> {
    if (pair.left && pair.right) {
        return pair
    } else if (pair.left && pair.right === undefined) {
        const rightPos = pair.left[0].getSiblingPosition()
        return { left: pair.left, right: [rightPos, await newPaddingNode(paddingNodeContent(rightPos))] }
    } else if (pair.left === undefined && pair.right) {
        const leftPos = pair.right[0].getSiblingPosition()
        return { left: [leftPos, await newPaddingNode(paddingNodeContent(leftPos))], right: pair.right }
    } else {
        throw new Error("Both left and right are undefined")
    }
}

async function mergePair(pair: Pair, paddingNodeContent: paddingNodeContent): Promise<[NodePosition, Node]> {
    const paddedPair = await padIfNotMatched(pair, paddingNodeContent)
    if (paddedPair.left && paddedPair.right) {
        return [paddedPair.left[0].getParentPosition(), await merge(paddedPair.left[1], paddedPair.right[1])]
    } else {
        throw new Error("Both left and right are undefined")
    }
}

function padPathIfNotMatched(pair: PathPair, paddingNodeContent: paddingPathNodeContent): PathPair {
    if (pair.left && pair.right) {
        return pair
    } else if (pair.left && pair.right === undefined) {
        const rightPos = pair.left[0].getSiblingPosition()
        return { left: pair.left, right: [rightPos, newPadPathNode(paddingNodeContent(rightPos))] }
    } else if (pair.left === undefined && pair.right) {
        const leftPos = pair.right[0].getSiblingPosition()
        return { left: [leftPos, newPadPathNode(paddingNodeContent(leftPos))], right: pair.right }
    } else {
        throw new Error("Both left and right are undefined")
    }
}

function mergePathPair(pair: PathPair, paddingNodeContent: paddingPathNodeContent): [NodePosition, PathNode] {
    const paddedPair = padPathIfNotMatched(pair, paddingNodeContent)
    if (paddedPair.left && paddedPair.right) {
        return [paddedPair.left[0].getParentPosition(), mergePathNodes(paddedPair.left[1], paddedPair.right[1])]
    } else {
        throw new Error("Both left and right are undefined")
    }
}


async function singleThreadedTreeBuilder(
    leafNodes: [NodePosition, Node][],
    height: Height,
    paddingNodeClosure: paddingNodeContent,
    treeParams: TreeParams,
    storeDepth?: number,
) {
    const nodeMap = new Map<number, Node>();
    const maxLeafs = height.maxNodes()
    if (leafNodes.length > maxLeafs) {
        throw new Error(`Too many leaf nodes, max is ${maxLeafs}`)
    }
    let nodes = leafNodes
    for (let y = 0; y < height._inner; y++) {
        let pairs: Pair[] = []
        for (let i = 0; i < nodes.length; i += 1) {
            if (y < (storeDepth ?? height._inner)) {
                console.log(`setting node in nodemap for ${i} at height ${y}`)
                nodeMap.set(nodes[i]![0].toMapKey(), nodes[i]![1])
            }
            const nodePos = nodes[i]![0]
            if (nodePos.getDirection() == Direction.Left) {
                pairs.push({ left: nodes[i]!, right: undefined })
            } else if (nodePos.getDirection() == Direction.Right) {
                const lastPair = pairs[pairs.length - 1]
                if (lastPair) {
                    const isSibling = lastPair.left ? lastPair.left[0].getSiblingPosition().equals(nodePos) && lastPair.right === undefined : false
                    if (isSibling) {
                        lastPair.right = nodes[i]!
                    } else {
                        pairs.push({ left: undefined, right: nodes[i]! })
                    }
                }
            } else {
                pairs.push({ left: undefined, right: nodes[i]! })
            }
        }
        const newNodes: [NodePosition, Node][] = []
        for (let i = 0; i < pairs.length; i++) {
            newNodes.push(await mergePair(pairs[i]!, paddingNodeClosure))
        }
        nodes = newNodes
    }
    return new Store(nodes.pop()![1], nodeMap, height, treeParams)
}

/**
 * Builds a tree with path nodes this is seperate method as this does not involve any range check operation 
 * @param leafNodes 
 * @param height 
 * @param paddingNodeClosure
 * @param storeDepth 
 * 
 * @returns PathNode the root of the sub tree builded
 */
export function buildPathTree(
    leafNodes: [NodePosition, PathNode][],
    height: Height,
    paddingNodeClosure: paddingPathNodeContent,
): PathNode {
    const maxLeafs = height.maxNodes()
    if (leafNodes.length > maxLeafs) {
        throw new Error(`Too many leaf nodes, max is ${maxLeafs}`)
    }
    let nodes = leafNodes
    for (let y = 0; y <= height._inner; y++) {
        let pairs: PathPair[] = []
        for (let i = 0; i < nodes.length; i += 1) {
            const nodePos = nodes[i]![0]
            if (nodePos.getDirection() == Direction.Left) {
                pairs.push({ left: nodes[i]!, right: undefined })
            } else if (nodePos.getDirection() == Direction.Right) {
                const lastPair = pairs[pairs.length - 1]
                if (lastPair) {
                    if (lastPair.left) {
                        const leftPos = lastPair.left[0]
                        const isSibling = leftPos.getSiblingPosition().equals(nodePos)
                        if (isSibling) {
                            lastPair.right = nodes[i]!
                        } else {
                            pairs.push({ left: undefined, right: nodes[i]! })
                        }
                    } else {
                        pairs.push({ left: undefined, right: nodes[i]! })
                    }
                } else {
                    pairs.push({ left: undefined, right: nodes[i]! })
                }
            }
        }
        nodes = pairs.map((pair) => mergePathPair(pair, paddingNodeClosure))
    }
    return nodes.pop()![1]
}

export interface TreeParams {
    masterSecret: Bytes32,
    saltS: Bytes32,
    saltB: Bytes32,
}

export function treeParamsToJSON(treeParams: TreeParams) {
    return {
        masterSecret: treeParams.masterSecret.toString(),
        saltS: treeParams.saltS.toString(),
        saltB: treeParams.saltB.toString()
    }
}

export class TreeBuilder<N extends number> {
    records: DBRecord<N>[];
    xCordGen: XCordGenerator;
    height: Height;
    treeParams: TreeParams;

    constructor(records: DBRecord<N>[], height: Height, treeParams: TreeParams) {
        this.records = records;
        this.xCordGen = new XCordGenerator(height.maxNodes());
        this.height = height;
        this.treeParams = treeParams;
    }

    static fromRecords<N extends number>(records: DBRecord<N>[], height: Height, treeParams: TreeParams): TreeBuilder<N> {
        return new TreeBuilder(records, height, treeParams)
    }

    public async buildSingleThreaded(compileRangeCheckProgram: typeof rangeCheckProgram, saveRecordMap?: boolean, reddisConnectionURI?: string): Promise<[Store, Map<string, NodePosition>]> {
        console.log("Starting tree build...")

        const recordMap = new Map<string, NodePosition>();
        const zeroHeight = new Height(0);

        console.time("Leaf nodes created in")
        const leafNodes: [NodePosition, Node][] = []
        for (let i = 0; i < this.records.length; i++) {
            const newXCord = this.xCordGen.genXCord();
            const nodePos = new NodePosition(newXCord, zeroHeight);
            // limit this to 2^15 as this causes precision errors will fix later
            const masterSecret = kdf(null, Bytes32.fromBigInt(BigInt(this.records[i]!.user)), this.treeParams.masterSecret).shrink(15);
            console.log("Master secret: ", masterSecret.toString())
            const blindingFactor = kdf(this.treeParams.saltB, null, masterSecret).shrink(15)
            console.log("Blinding factor: ", blindingFactor.toString())
            const userSecret = kdf(this.treeParams.saltS, null, masterSecret).shrink(15)
            console.log("User secret: ", userSecret.toString())
            recordMap.set(this.records[i]!.user, nodePos)
            const leafNode = await newLeaf({ record: this.records[i]!, compileRangeCheckProgram, userSecret, blindingFactor })
            leafNodes.push([nodePos, leafNode])
        }
        console.timeEnd("Leaf nodes created in")


        const paddingNodeFn = (position: NodePosition): newPaddingNodeParams => {
            const padSecret = kdf(null, Bytes32.fromNodePos(position), this.treeParams.masterSecret).shrink(15);
            const blindingFactor = kdf(this.treeParams.saltB, null, padSecret).shrink(15)
            const userSecret = kdf(this.treeParams.saltS, null, padSecret).shrink(15)
            return { userSecret, blindingFactor, compiledRangeCheckProgram: compileRangeCheckProgram, position }
        }

        // fill out all the leaf nodes with remaining x positions left with padding nodes
        const maxLeafs = this.height.maxNodes()
        if (leafNodes.length < maxLeafs) {
            for (let x = leafNodes.length; x < maxLeafs; x++) {
                let newXCord = this.xCordGen.genXCord();
                const nodePos = new NodePosition(newXCord, zeroHeight);
                leafNodes.push([nodePos, await newPaddingNode(paddingNodeFn(nodePos))])
            }
        }

        leafNodes.sort((a, b) => a[0].xCord() - b[0].xCord());

        this.xCordGen.flush()
        if (saveRecordMap) {
            // saving to redis
            const client = createClient({ url: reddisConnectionURI });
            await client.connect();
            for (const [user, position] of recordMap.entries()) {
                await client.set(`${USER_KEY_PREFIX}:${user}`, position.toString());
            }
        }

        return [await singleThreadedTreeBuilder(leafNodes, this.height, paddingNodeFn, this.treeParams), recordMap]
    }
}
