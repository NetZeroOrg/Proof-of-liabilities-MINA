import { Field } from "o1js";
import { NodePosition } from "./position.js";
export declare class Bytes32 {
    data: boolean[];
    constructor(data: boolean[]);
    toNumber(): number;
    toBigint(): bigint;
    toString(): string;
    toField(): Field;
    toBuffer(): Buffer;
    static fromBuffer(buffer: Buffer): Bytes32;
    static fromNumber(num: number): Bytes32;
    static fromNodePos(pos: NodePosition): Bytes32;
}
export declare function randomBytes32(): Bytes32;
//# sourceMappingURL=bytes.d.ts.map