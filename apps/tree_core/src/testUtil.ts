import { createClient } from "redis";
import { NodePosition } from "./position.js";
import { DBRecord, FixedLengthArray } from "./types.js";
import { readFileSync } from 'fs';

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
    const nodePos = await client.get(randomUser)
    return [NodePosition.fromRedisKey(nodePos!, false), randomUser]

}