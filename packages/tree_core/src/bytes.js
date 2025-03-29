import { Field } from "o1js";
export class Bytes32 {
    constructor(data) {
        if (data.length !== 256) {
            throw new Error('Bytes32 must be exactly 256 bits');
        }
        this.data = data;
    }
    toNumber() {
        return this.data.reduce((num, bit, i) => num + (bit ? (1 << i) : 0), 0);
    }
    toBigint() {
        return BigInt(this.toNumber());
    }
    toString() {
        return this.toNumber().toString();
    }
    toField() {
        return Field(this.toNumber());
    }
    toBuffer() {
        const byteArray = new Uint8Array(32);
        for (let i = 0; i < 256; i++) {
            if (this.data[i]) {
                byteArray[Math.floor(i / 8)] |= 1 << (i % 8);
            }
        }
        return Buffer.from(byteArray);
    }
    static fromBuffer(buffer) {
        if (buffer.length !== 32) {
            throw new Error('Buffer must be exactly 32 bytes');
        }
        const bits = new Array(256).fill(false);
        for (let i = 0; i < 256; i++) {
            bits[i] = (buffer[Math.floor(i / 8)] & (1 << (i % 8))) !== 0;
        }
        return new Bytes32(bits);
    }
    static fromNumber(num) {
        const bits = Array.from({ length: 256 }, (_, i) => (num & (1 << i)) !== 0);
        return new Bytes32(bits);
    }
    static fromNodePos(pos) {
        const xBits = Array.from({ length: 53 }, (_, i) => (pos.x & (1 << i)) !== 0).fill(false);
        const yBits = Array.from({ length: 8 }, (_, i) => (pos.y._inner & (1 << i)) !== 0).fill(false);
        const newBits = xBits.concat(yBits);
        if (newBits.length !== 256) {
            for (let i = newBits.length; i < 256; i++) {
                newBits.push(false);
            }
        }
        return new Bytes32(newBits);
    }
}
export function randomBytes32() {
    const bits = Array.from({ length: 256 }, () => Math.random() < 0.5);
    return new Bytes32(bits);
}
