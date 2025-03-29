import { NodePosition } from "./position.js";
import { DBRecord } from "./types.js";
import { MerkleWitness } from "./path.js";
import { Store } from "./store.js";
import { PathNode } from "./node.js";
export declare function randomRecords<N extends number>(num: number, nCurr: N): DBRecord<N>[];
/**
 * The function used to verify that the proof is correct
 * @param proof  The liabilities Proof
 */
export declare function generateRootFromPath(proof: MerkleWitness, store: Store, userPosition: NodePosition): PathNode;
//# sourceMappingURL=testUtil.d.ts.map