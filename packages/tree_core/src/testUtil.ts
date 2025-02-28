import { createClient } from "redis";
import { NodePosition } from "./position.js";
import { DBRecord, FixedLengthArray } from "./types.js";
import { readFileSync } from 'fs';
import { LiabilitiesProof } from "./path.js";
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


export async function loadRandomUserFromDB(reddisConnectionURI?: string): Promise<[NodePosition, string]> {
    const client = createClient({ url: reddisConnectionURI })
    await client.connect()
    const data = JSON.parse(readFileSync('data.json', 'utf-8')).data;
    const randomIndex = Math.floor(Math.random() * data.length);
    const randomUser = data[randomIndex];
    const nodePos = await client.get("user" + randomUser[0])
    return [NodePosition.fromRedisKey(nodePos!, false), randomUser[0]]
}

/**
 * The function used to verify that the proof is correct
 * @param proof  The liabilities Proof
 */
export function generateRootFromPath(proof: LiabilitiesProof, store: Store, userPosition: NodePosition): PathNode {
    const userLeaf = store.map.get(userPosition.toMapKey())!
    const path = proof.witness.path
    const lefts = proof.witness.lefts
    let root = toPathNode(userLeaf)

    for (let i = 0; i < path.length; i++) {
        const left = lefts[i] ? path[i]! : root
        const right = lefts[i] ? root : path[i]!
        root = mergePathNodes(left, right)
    }
    return root
}