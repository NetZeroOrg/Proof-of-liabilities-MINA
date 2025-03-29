import { mergePathNodes, toPathNode } from "./node.js";
export function randomRecords(num, nCurr) {
    const records = [];
    for (let i = 0; i < num; i++) {
        const balances = Array.from({ length: nCurr }, () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        const randId = Math.floor(Math.random() * 1000000);
        records.push({ balances, user: randId.toString() });
    }
    return records;
}
// export async function loadRandomUserFromDB(reddisConnectionURI?: string): Promise<[NodePosition, string]> {
//     const client = createClient({ url: reddisConnectionURI });
//     await client.connect();
//     const recordMap = JSON.parse(readFileSync(new URL('./record_map.json', import.meta.url), 'utf-8'));
//     const randomUser = Object.keys(recordMap)[Math.floor(Math.random() * Object.keys(recordMap).length)]!;
//     const nodePos = recordMap[randomUser];
//     await client.disconnect();
//     return [NodePosition.fromRedisKey(nodePos!, false), randomUser[0]!]
// }
/**
 * The function used to verify that the proof is correct
 * @param proof  The liabilities Proof
 */
export function generateRootFromPath(proof, store, userPosition) {
    const userLeaf = store.map.get(userPosition.toMapKey());
    const path = proof.path;
    const lefts = proof.lefts;
    let root = toPathNode(userLeaf);
    console.log(userLeaf.hash.toJSON());
    console.log(userLeaf.commitment.toJSON());
    for (let i = 0; i < path.length; i++) {
        const left = lefts[i] ? path[i] : root;
        const right = lefts[i] ? root : path[i];
        root = mergePathNodes(left, right);
    }
    return root;
}
