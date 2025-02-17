import { Bytes32 } from "./bytes"

type ArrayLengthMutationKeys = 'splice' | 'push' | 'pop' | 'shift' | 'unshift'
type FixedLengthArray<T, L extends number, TObj = [T, ...Array<T>]> =
    Pick<TObj, Exclude<keyof TObj, ArrayLengthMutationKeys>>
    & {
        readonly length: L
        [I: number]: T
        [Symbol.iterator]: () => IterableIterator<T>
    }

export interface DBRecord<N extends number> {
    balances: FixedLengthArray<number, N>,
    user: string
}

export type Bits<N extends number> = FixedLengthArray<boolean, N>
export type bytes32 = Bits<256>


export interface newLeafParams<N extends number> {
    record: DBRecord<N>,
    blindingFactor: Bytes32,
    userSecret: Bytes32
}

export interface newPaddingNodeParams<N extends number> {
    userSecret: Bytes32,
    blidingFactor: Bytes32

}

export enum Direction {
    Left,
    Right
}