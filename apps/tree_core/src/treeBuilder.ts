import { rangeCheckProgram } from "circuits/dist/programs";
import { Node } from "./nodeContent";
import { Height, NodePosition } from "./position";
import { DBRecord, Direction, newPaddingNodeParams } from "./types";
import { Store } from "./store";
import { Bytes32 } from "./bytes";
import { XCordGenerator } from "./xCordGen";
import { kdf } from "./kdf";
type paddingNodeContent = (nodePos: NodePosition) => newPaddingNodeParams;
interface Pair {
    left?: [NodePosition, Node];
    right?: [NodePosition, Node];
}

async function padIfNotMatched(pair: Pair, paddingNodeContent: paddingNodeContent): Promise<Pair> {
    if (pair.left && pair.right) {
        return pair
    } else if (pair.left && pair.right === undefined) {
        const rightPos = pair.left[0].getSiblingPosition()
        return { left: pair.left, right: [rightPos, await Node.newPaddingNode(paddingNodeContent(rightPos))] }
    } else if (pair.left === undefined && pair.right) {
        const leftPos = pair.right[0].getSiblingPosition()
        return { left: [leftPos, await Node.newPaddingNode(paddingNodeContent(leftPos))], right: pair.right }
    } else {
        throw new Error("Both left and right are undefined")
    }
}

async function mergePair(pair: Pair, paddingNodeContent: paddingNodeContent): Promise<[NodePosition, Node]> {
    const paddedPair = await padIfNotMatched(pair, paddingNodeContent)
    if (paddedPair.left && paddedPair.right) {
        return [paddedPair.left[0].getParentPosition(), await Node.merge(paddedPair.left[1], paddedPair.right[1])]
    } else {
        throw new Error("Both left and right are undefined")
    }
}

async function singleThreadedTreeBuilder(
    leafNodes: [NodePosition, Node][],
    height: Height,
    paddingNodeClosure: paddingNodeContent,
    storeDepth?: number,
) {
    const nodeMap = new Map<NodePosition, Node>();
    const maxLeafs = height.maxNodes()
    if (leafNodes.length > maxLeafs) {
        throw new Error(`Too many leaf nodes, max is ${maxLeafs}`)
    }
    let nodes = leafNodes
    for (let y = 0; y < height._inner; y++) {
        let pairs: Pair[] = []
        for (let i = 0; i < nodes.length; i += 1) {
            if (y <= (storeDepth ?? 0)) {
                nodeMap.set(nodes[i]![0], nodes[i]![1])
            }
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
        const newNodes = []
        for (let i = 0; i < pairs.length; i++) {
            newNodes.push(await mergePair(pairs[i]!, paddingNodeClosure))
        }
        nodes = newNodes
    }
    return new Store(nodes.pop()![1], nodeMap, height)
}

export interface TreeParams {
    masterSecret: Bytes32,
    saltS: Bytes32,
    saltB: Bytes32,
}

export class TreeBuilder<N extends number> {
    records: DBRecord<N>[];
    xCordGen: XCordGenerator;
    height: Height;
    treeParams: TreeParams;

    constructor(records: DBRecord<N>[], height: Height, treeParams: TreeParams) {
        this.records = records;
        this.xCordGen = new XCordGenerator(records.length);
        this.height = height;
        this.treeParams = treeParams;
    }

    static fromRecords<N extends number>(records: DBRecord<N>[], height: Height, treeParams: TreeParams): TreeBuilder<N> {
        return new TreeBuilder(records, height, treeParams)
    }

    public async buildSingleThreaded(compileRangeCheckProgram: typeof rangeCheckProgram): Promise<Store> {
        const recordMap = new Map<string, NodePosition>();
        const zeroHeight = new Height(0);


        const leafNodes: [NodePosition, Node][] = []
        for (let i = 0; i < this.records.length; i++) {
            const newXCord = this.xCordGen.genXCord();
            const nodePos = new NodePosition(newXCord, zeroHeight);
            const masterSecret = kdf(null, Bytes32.fromNumber(newXCord), this.treeParams.masterSecret);
            const blindingFactor = kdf(this.treeParams.saltB, null, masterSecret)
            const userSecret = kdf(this.treeParams.saltS, null, masterSecret)
            recordMap.set(this.records[i]!.user, nodePos)
            leafNodes.push([nodePos, await Node.newLeaf({ record: this.records[i]!, compileRangeCheckProgram, userSecret, blindingFactor })])
        }

        const paddingNodeFn = (position: NodePosition): newPaddingNodeParams => {
            const padSecret = kdf(null, Bytes32.fromNodePos(position), this.treeParams.masterSecret)
            const blindingFactor = kdf(this.treeParams.saltB, null, padSecret)
            const userSecret = kdf(this.treeParams.saltS, null, padSecret)
            return { userSecret, blindingFactor, compiledRangeCheckProgram: compileRangeCheckProgram, position }
        }
        const height = Height.fromNodesLen(leafNodes.length)

        return await singleThreadedTreeBuilder(leafNodes, height, paddingNodeFn)
    }
}
