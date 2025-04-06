import { Field } from "o1js";
import { NodePosition } from "./position.js";

export class Bytes32 {
    data: boolean[];

    constructor(data: boolean[]) {
        if (data.length !== 256) {
            throw new Error('Bytes32 must be exactly 256 bits');
        }
        this.data = [...data]; // Create a copy to avoid unintended mutations
    }

    toBigint(): bigint {
        // Process in chunks of 8 bits to avoid precision issues
        let result = BigInt(0);
        for (let i = 0; i < 256; i++) {
            if (this.data[i]) {
                result |= BigInt(1) << BigInt(i);
            }
        }
        return result;
    }

    toString(): string {
        return this.toBigint().toString();
    }

    toField(): Field {
        // Note: Field might have its own size limitations
        return Field(this.toBigint());
    }

    // processing the the bytes 8 at a time
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
        if (num < 0) throw new Error('Negative numbers not supported');

        const bits: boolean[] = new Array(256).fill(false);
        for (let i = 0; i < Math.min(53, 256); i++) {
            bits[i] = (num & (1 << i)) !== 0;
        }
        return new Bytes32(bits);
    }

    static fromBigInt(bigint: bigint): Bytes32 {
        if (bigint < 0) throw new Error('Negative numbers not supported');

        const bits: boolean[] = new Array(256).fill(false);
        for (let i = 0; i < 256; i++) {
            bits[i] = (bigint & (BigInt(1) << BigInt(i))) !== BigInt(0);
        }
        return new Bytes32(bits);
    }

    static fromNodePos(pos: NodePosition): Bytes32 {
        const bits: boolean[] = new Array(256).fill(false);

        // Set x bits (assuming pos.x is a number)
        for (let i = 0; i < Math.min(53, 256); i++) {
            bits[i] = (pos.x & (1 << i)) !== 0;
        }

        // Set y bits (assuming pos.y._inner is a number)
        for (let i = 0; i < Math.min(8, 256 - 53); i++) {
            bits[i + 53] = (pos.y._inner & (1 << i)) !== 0;
        }

        return new Bytes32(bits);
    }

    shrink(_maxVal?: number): Bytes32 {
        const bits: boolean[] = new Array(256).fill(false);
        const maxVal = _maxVal ?? 255;
        for (let i = 0; i < maxVal; i++) {
            bits[i] = this.data[i]!;
        }
        return new Bytes32(bits);
    }
}


// maxVal is the maximum value of the random number if it is 20 then number will be between 0 and 2^20
// number is between 2^_min_val and 2^_maxVal
export function randomBytes32(_maxVal?: number, _mina_val?: number): Bytes32 {
    const bits: boolean[] = Array.from({ length: 256 }, () => Math.random() < 0.5);
    // Ensure the MSB (most significant bit) is 0 to make it positive because the circuits were acting strange with negative numbers
    const maxVal = _maxVal ?? 255;
    for (let i = 255; i >= maxVal; i--) {
        bits[i] = false;
    }
    const minVal = _mina_val ?? 0;
    for (let i = 0; i < minVal; i++) {
        bits[i] = true;
    }
    return new Bytes32(bits);
}
