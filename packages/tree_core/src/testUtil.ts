import { createClient } from "redis";
import { NodePosition } from "./position.js";
import { DBRecord, FixedLengthArray } from "./types.js";
import { readFileSync } from 'fs';
import { MerkleWitness } from "./path.js";
import { Store } from "./store.js";
import { mergePathNodes, PathNode, toPathNode } from "./node.js";
import { Poseidon } from "o1js";

export function randomRecords<N extends number>(num: number, nCurr: N): DBRecord<N>[] {
    const records: DBRecord<N>[] = [];

    for (let i = 0; i < num; i++) {
        const balances = Array.from({ length: nCurr }, () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)) as unknown as FixedLengthArray<number, N>;
        const randId = Math.floor(Math.random() * 1_000_000);
        records.push({ balances, user: randId.toString() });
    }

    return records;
}



/**
 * The function used to verify that the proof is correct
 * @param proof  The liabilities Proof
 */
export function generateRootFromPath(proof: MerkleWitness, store: Store, userPosition: NodePosition): PathNode {
    const userLeaf = store.map.get(userPosition.toMapKey())!

    const path = proof.path
    const lefts = proof.lefts
    let root = toPathNode(userLeaf)

    console.log("useLeaf", userLeaf.hash.toJSON())
    console.log("userLeaf", userLeaf.commitment.toJSON())

    for (let i = 0; i < path.length; i++) {
        const left = lefts[i] ? path[i]! : root
        const right = lefts[i] ? root : path[i]!
        root = mergePathNodes(left, right)
    }
    return root
}