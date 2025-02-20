import { DBRecord, FixedLengthArray } from "./types";

export function randomRecords<N extends number>(num: number, nCurr: N): DBRecord<N>[] {
    const records: DBRecord<N>[] = [];

    for (let i = 0; i < num; i++) {
        const balances = Array.from({ length: nCurr }, () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)) as unknown as FixedLengthArray<number, N>;
        const randId = Math.floor(Math.random() * 1_000_000);
        records.push({ balances, user: randId.toString() });
    }

    return records;
}
