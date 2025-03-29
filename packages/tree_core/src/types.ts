import { rangeCheckProgram } from "@netzero/circuits/dist/index.js"
import { Bytes32 } from "./bytes.js"
import { NodePosition } from "./position.js"

type ArrayLengthMutationKeys = 'splice' | 'push' | 'pop' | 'shift' | 'unshift'
export type FixedLengthArray<T, L extends number, TObj = [T, ...Array<T>]> =
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
    userSecret: Bytes32,
    compileRangeCheckProgram: typeof rangeCheckProgram
}

export interface newPaddingNodeParams {
    userSecret: Bytes32,
    blindingFactor: Bytes32
    position: NodePosition,
    compiledRangeCheckProgram: typeof rangeCheckProgram
}

export interface newPaddingPathNode {
    userSecret: Bytes32,
    blindingFactor: Bytes32
    position: NodePosition
}

export enum Direction {
    Left,
    Right
}

export type Nullable<T> = T | null 