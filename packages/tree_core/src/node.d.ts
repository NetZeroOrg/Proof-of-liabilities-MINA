import { Field, Group } from "o1js";
import { newLeafParams, newPaddingNodeParams, newPaddingPathNode, Nullable } from "./types.js";
import { RangeCheckProof } from "@netzero/circuits/dist/index.js";
export interface Node {
    liabilities: bigint;
    blindingFactor: bigint;
    commitment: Group;
    hash: Field;
    rangeProof: Nullable<RangeCheckProof>;
}
declare function newLeaf<N extends number>({ record, userSecret, blindingFactor, compileRangeCheckProgram }: newLeafParams<N>): Promise<Node>;
declare function newPaddingNode<N extends number>({ userSecret, blindingFactor, position, compiledRangeCheckProgram }: newPaddingNodeParams): Promise<Node>;
declare function merge(leftChild: Node, rightChild: Node): Promise<Node>;
declare function toPathNode(node: Node): PathNode;
declare function toRedisObject(node: Node): {
    liabilities: string;
    blindingFactor: string;
    commitmentX: string;
    commitmentY: string;
    hash: string;
};
declare function fromRedisObject(value: {
    [x: string]: string;
}): Node;
/**
 * Represents a node in the path of inclusion proof of the tree
 */
export interface PathNode {
    commitment: Group;
    hash: Field;
}
declare function newPadPathNode(params: newPaddingPathNode): PathNode;
declare function mergePathNodes(left: PathNode, right: PathNode): PathNode;
declare function logNode(msg: string, node: Node | PathNode): void;
export { newLeaf, newPaddingNode, merge, newPadPathNode, mergePathNodes, toPathNode, toRedisObject, fromRedisObject, logNode };
//# sourceMappingURL=node.d.ts.map