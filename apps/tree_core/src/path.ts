import { RangeCheckProof } from "circuits/dist/index.js";
import { newPadPathNode, Node, PathNode, toPathNode } from "./node.js";
import { Height, NodePosition } from "./position.js";
import { Store } from "./store.js";
import { buildPathTree, paddingNodeContent, paddingPathNodeContent, TreeParams } from "./treeBuilder.js";
import { newPaddingPathNode } from "./types.js";
import { kdf } from "./kdf.js";
import { Bytes32 } from "./bytes.js";

export type Siblings = PathNode[]
export type Lefts = boolean[]

export const generatePath = (treeStore: Store, position: NodePosition, paddingNodeContent: paddingPathNodeContent): [Siblings, Lefts] => {
    const leafNode = treeStore.map.get(position.toMapKey())
    if (leafNode == undefined) {
        throw new Error("Leaf node is undefined")
    }
    const siblings: PathNode[] = []
    let currentPos = position
    const lefts = []

    for (let y = 0; y < treeStore.height._inner; y++) {
        const siblingPos = currentPos.getSiblingPosition()
        lefts.push(siblingPos.isLeft())
        const sibling = treeStore.map.get(siblingPos.toMapKey())
        if (sibling) {
            siblings.push(toPathNode(sibling))
        } else {
            if (y == 0) {
                siblings.push(newPadPathNode(paddingNodeContent(siblingPos)))
            } else {
                const minXCord = (1 << siblingPos.yCord()) * siblingPos.xCord()
                const maxXCord = (1 << siblingPos.yCord()) * (siblingPos.xCord() + 1) - 1
                const leafNodes: [NodePosition, PathNode][] = []
                for (let x = minXCord; x <= maxXCord; x++) {
                    const leafPos = new NodePosition(x, new Height(0))
                    const leaf = treeStore.map.get(leafPos.toMapKey())
                    if (leaf) {
                        leafNodes.push([leafPos, toPathNode(leaf)])
                    }
                }
                if (leafNodes.length == 0) {
                    // add padding node
                    siblings.push(newPadPathNode(paddingNodeContent(siblingPos)))
                } else {
                    const subTreeRoot = buildPathTree(leafNodes, new Height(y), paddingNodeContent)
                    siblings.push(subTreeRoot)
                }
            }
        }
        currentPos = currentPos.getParentPosition()
    }
    return [siblings, lefts]
}

export interface MerkleWitness {
    path: Siblings
    lefts: Lefts
    aggregatedRangeProof: RangeCheckProof
}

export const generateMerkleWitness = (treeStore: Store, position: NodePosition, paddingNodeContent: paddingPathNodeContent): MerkleWitness => {
    const [path, lefts] = generatePath(treeStore, position, paddingNodeContent)
    const aggregatedRangeProof = treeStore.root.rangeProof!
    return { path, lefts, aggregatedRangeProof }
}

export interface LiabilitiesProof {
    witness: MerkleWitness
    blidingFactor: Bytes32
    userSecret: Bytes32
}

/**
 * @param treeParams The tree parameters for master secretes and salt
 * @param treeStore store of the tree containing the leaf nodes and root 
 * @param position the position of the leaf node for which the proof is to be generated
 * @returns the liabilities proof for the leaf node
 */
export const generateProof = (treeStore: Store, position: NodePosition): LiabilitiesProof => {
    const paddingNodeFn = (position: NodePosition): newPaddingPathNode => {
        const padSecret = kdf(null, Bytes32.fromNodePos(position), treeStore.treeParams.masterSecret)
        const blindingFactor = kdf(treeStore.treeParams.saltB, null, padSecret)
        const userSecret = kdf(treeStore.treeParams.saltS, null, padSecret)
        return { userSecret, blindingFactor, position }
    }

    const witness = generateMerkleWitness(treeStore, position, paddingNodeFn)
    const masterSecret = kdf(null, Bytes32.fromNumber(position.xCord()), treeStore.treeParams.masterSecret);
    const blindingFactor = kdf(treeStore.treeParams.saltB, null, masterSecret)
    const userSecret = kdf(treeStore.treeParams.saltS, null, masterSecret)
    return { witness, blidingFactor: blindingFactor, userSecret }
}
