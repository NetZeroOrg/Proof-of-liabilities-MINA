import { Field } from "o1js";
import { bytes32 } from "./types";
import { NodePosition } from "./position";

export class Bytes32 {
    data: boolean[];

    constructor(data: boolean[]) {
        if (data.length !== 256) {
            throw new Error('Bytes32 must be exactly 256 bits');
        }
        this.data = data;
    }

    toNumber(): number {
        return this.data.reduce((num, bit, i) => num + (bit ? (1 << i) : 0), 0);
    }

    toBigint(): bigint {
        return BigInt(this.toNumber());
    }

    toField(): Field {
        return Field(this.toNumber());
    }

    toBuffer(): Buffer {
        const byteArray = new Uint8Array(32);
        for (let i = 0; i < 256; i++) {
            if (this.data[i]) {
                byteArray[Math.floor(i / 8)]! |= 1 << (i % 8);
            }
        }
        return Buffer.from(byteArray);
    }

    static fromBuffer(buffer: Buffer): Bytes32 {
        if (buffer.length !== 32) {
            throw new Error('Buffer must be exactly 32 bytes');
        }

        const bits: boolean[] = new Array(256).fill(false);
        for (let i = 0; i < 256; i++) {
            bits[i] = (buffer[Math.floor(i / 8)]! & (1 << (i % 8))) !== 0;
        }

        return new Bytes32(bits);
    }

    static fromNumber(num: number): Bytes32 {
        const bits: boolean[] = Array.from({ length: 256 }, (_, i) => (num & (1 << i)) !== 0);
        return new Bytes32(bits);
    }

    static fromNodePos(pos: NodePosition): Bytes32 {
        const xBits = Array.from({ length: 53 }, (_, i) => (pos.x & (1 << i)) !== 0);
        const yBits = Array.from({ length: 8 }, (_, i) => (pos.y._inner & (1 << i)) !== 0);
        const newBits = xBits.concat(yBits).fill(false, 256);
        return new Bytes32(newBits);
    }
}

export function randomBytes32(): Bytes32 {
    const bits: boolean[] = Array.from({ length: 256 }, () => Math.random() < 0.5);
    return new Bytes32(bits);
}
