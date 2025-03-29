import { merge, mergePathNodes, newLeaf, newPaddingNode, newPadPathNode } from "./node.js";
import { Height, NodePosition } from "./position.js";
import { Direction } from "./types.js";
import { Store } from "./store.js";
import { Bytes32 } from "./bytes.js";
import { XCordGenerator } from "./xCordGen.js";
import { kdf } from "./kdf.js";
import { createClient } from "redis";
const USER_KEY_PREFIX = "user";
async function padIfNotMatched(pair, paddingNodeContent) {
    if (pair.left && pair.right) {
        return pair;
    }
    else if (pair.left && pair.right === undefined) {
        const rightPos = pair.left[0].getSiblingPosition();
        return { left: pair.left, right: [rightPos, await newPaddingNode(paddingNodeContent(rightPos))] };
    }
    else if (pair.left === undefined && pair.right) {
        const leftPos = pair.right[0].getSiblingPosition();
        return { left: [leftPos, await newPaddingNode(paddingNodeContent(leftPos))], right: pair.right };
    }
    else {
        throw new Error("Both left and right are undefined");
    }
}
async function mergePair(pair, paddingNodeContent) {
    const paddedPair = await padIfNotMatched(pair, paddingNodeContent);
    if (paddedPair.left && paddedPair.right) {
        return [paddedPair.left[0].getParentPosition(), await merge(paddedPair.left[1], paddedPair.right[1])];
    }
    else {
        throw new Error("Both left and right are undefined");
    }
}
function padPathIfNotMatched(pair, paddingNodeContent) {
    if (pair.left && pair.right) {
        return pair;
    }
    else if (pair.left && pair.right === undefined) {
        const rightPos = pair.left[0].getSiblingPosition();
        return { left: pair.left, right: [rightPos, newPadPathNode(paddingNodeContent(rightPos))] };
    }
    else if (pair.left === undefined && pair.right) {
        const leftPos = pair.right[0].getSiblingPosition();
        return { left: [leftPos, newPadPathNode(paddingNodeContent(leftPos))], right: pair.right };
    }
    else {
        throw new Error("Both left and right are undefined");
    }
}
function mergePathPair(pair, paddingNodeContent) {
    const paddedPair = padPathIfNotMatched(pair, paddingNodeContent);
    if (paddedPair.left && paddedPair.right) {
        return [paddedPair.left[0].getParentPosition(), mergePathNodes(paddedPair.left[1], paddedPair.right[1])];
    }
    else {
        throw new Error("Both left and right are undefined");
    }
}
async function singleThreadedTreeBuilder(leafNodes, height, paddingNodeClosure, treeParams, storeDepth) {
    const nodeMap = new Map();
    const maxLeafs = height.maxNodes();
    if (leafNodes.length > maxLeafs) {
        throw new Error(`Too many leaf nodes, max is ${maxLeafs}`);
    }
    let nodes = leafNodes;
    for (let y = 0; y < height._inner; y++) {
        let pairs = [];
        for (let i = 0; i < nodes.length; i += 1) {
            if (y < (storeDepth ?? height._inner)) {
                nodeMap.set(nodes[i][0].toMapKey(), nodes[i][1]);
            }
            const nodePos = nodes[i][0];
            if (nodePos.getDirection() == Direction.Left) {
                pairs.push({ left: nodes[i], right: undefined });
            }
            else if (nodePos.getDirection() == Direction.Right) {
                const lastPair = pairs[pairs.length - 1];
                if (lastPair) {
                    const isSibling = lastPair.left ? lastPair.left[0].getSiblingPosition().equals(nodePos) && lastPair.right === undefined : false;
                    if (isSibling) {
                        lastPair.right = nodes[i];
                    }
                    else {
                        pairs.push({ left: undefined, right: nodes[i] });
                    }
                }
            }
            else {
                pairs.push({ left: undefined, right: nodes[i] });
            }
        }
        const newNodes = [];
        for (let i = 0; i < pairs.length; i++) {
            newNodes.push(await mergePair(pairs[i], paddingNodeClosure));
        }
        nodes = newNodes;
    }
    return new Store(nodes.pop()[1], nodeMap, height, treeParams);
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
export function buildPathTree(leafNodes, height, paddingNodeClosure) {
    const maxLeafs = height.maxNodes();
    if (leafNodes.length > maxLeafs) {
        throw new Error(`Too many leaf nodes, max is ${maxLeafs}`);
    }
    let nodes = leafNodes;
    for (let y = 0; y < height._inner; y++) {
        let pairs = [];
        for (let i = 0; i < nodes.length; i += 1) {
            const nodePos = nodes[i][0];
            if (nodePos.getDirection() == Direction.Left) {
                pairs.push({ left: nodes[i], right: undefined });
            }
            else if (nodePos.getDirection() == Direction.Right) {
                const lastPair = pairs[pairs.length - 1];
                if (lastPair) {
                    if (lastPair.left) {
                        const leftPos = lastPair.left[0];
                        const isSibling = leftPos.getSiblingPosition().equals(nodePos);
                        if (isSibling) {
                            lastPair.right = nodes[i];
                        }
                        else {
                            pairs.push({ left: undefined, right: nodes[i] });
                        }
                    }
                    else {
                        pairs.push({ left: undefined, right: nodes[i] });
                    }
                }
                else {
                    pairs.push({ left: undefined, right: nodes[i] });
                }
            }
        }
        nodes = pairs.map((pair) => mergePathPair(pair, paddingNodeClosure));
    }
    return nodes.pop()[1];
}
export function treeParamsToJSON(treeParams) {
    return {
        masterSecret: treeParams.masterSecret.toString(),
        saltS: treeParams.saltS.toString(),
        saltB: treeParams.saltB.toString()
    };
}
export class TreeBuilder {
    constructor(records, height, treeParams) {
        this.records = records;
        this.xCordGen = new XCordGenerator(records.length);
        this.height = height;
        this.treeParams = treeParams;
    }
    static fromRecords(records, height, treeParams) {
        return new TreeBuilder(records, height, treeParams);
    }
    async buildSingleThreaded(compileRangeCheckProgram, saveRecordMap, reddisConnectionURI) {
        const recordMap = new Map();
        const zeroHeight = new Height(0);
        const leafNodes = [];
        for (let i = 0; i < this.records.length; i++) {
            console.time("Generated a new X cordinate");
            const newXCord = this.xCordGen.genXCord();
            console.timeEnd("Generated a new X cordinate");
            const nodePos = new NodePosition(newXCord, zeroHeight);
            console.time("kdf1");
            const masterSecret = kdf(null, Bytes32.fromNumber(newXCord), this.treeParams.masterSecret);
            console.timeEnd("kdf1");
            console.time("kdf2");
            const blindingFactor = kdf(this.treeParams.saltB, null, masterSecret);
            console.timeEnd("kdf2");
            console.time("kdf3");
            const userSecret = kdf(this.treeParams.saltS, null, masterSecret);
            console.timeEnd("kdf3");
            console.time("record Setting");
            recordMap.set(this.records[i].user, nodePos);
            console.timeEnd("record Setting");
            console.time("new leaf and push");
            // this takes 13s how do I decrease this?
            leafNodes.push([nodePos, await newLeaf({ record: this.records[i], compileRangeCheckProgram, userSecret, blindingFactor })]);
            console.timeEnd("new leaf and push");
        }
        leafNodes.sort((a, b) => a[0].xCord() - b[0].xCord());
        this.xCordGen.flush();
        const paddingNodeFn = (position) => {
            const padSecret = kdf(null, Bytes32.fromNodePos(position), this.treeParams.masterSecret);
            const blindingFactor = kdf(this.treeParams.saltB, null, padSecret);
            const userSecret = kdf(this.treeParams.saltS, null, padSecret);
            return { userSecret, blindingFactor, compiledRangeCheckProgram: compileRangeCheckProgram, position };
        };
        const height = Height.fromNodesLen(leafNodes.length);
        if (saveRecordMap) {
            // saving to redis
            const client = createClient({ url: reddisConnectionURI });
            await client.connect();
            for (const [user, position] of recordMap.entries()) {
                await client.set(`${USER_KEY_PREFIX}:${user}`, position.toString());
            }
        }
        return [await singleThreadedTreeBuilder(leafNodes, height, paddingNodeFn, this.treeParams), recordMap];
    }
}
