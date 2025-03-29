import { RangeCheckProof } from "@netzero/circuits/dist/index.js";
import { PathNode } from "./node.js";
import { NodePosition } from "./position.js";
import { Store } from "./store.js";
import { paddingPathNodeContent } from "./treeBuilder.js";
import { Field } from "o1js";
export type Siblings = PathNode[];
export type Lefts = boolean[];
export declare const generatePath: (treeStore: Store, position: NodePosition, paddingNodeContent: paddingPathNodeContent) => [Siblings, Lefts];
export interface MerkleWitness {
    path: Siblings;
    lefts: Lefts;
    aggregatedRangeProof: RangeCheckProof;
}
export declare const generateMerkleWitness: (treeStore: Store, position: NodePosition, paddingNodeContent: paddingPathNodeContent) => MerkleWitness;
/**
 * @param treeParams The tree parameters for master secretes and salt
 * @param treeStore store of the tree containing the leaf nodes and root
 * @param position the position of the leaf node for which the proof is to be generated
 * @returns the liabilities proof for the leaf node
 */
export declare const generateProof: (treeStore: Store, position: NodePosition) => {
    witness: MerkleWitness;
    blindingFactor: Field;
    userSecret: Field;
};
//# sourceMappingURL=path.d.ts.map