import { Field } from "o1js";
import { Direction } from "./types.js";
export class Height {
    constructor(inner) {
        this._inner = 0;
        this._inner = inner;
    }
    maxNodes() {
        return 2 ** this._inner;
    }
    enoughLeafNodes(num) {
        return this.maxNodes() >= num;
    }
    static fromNodesLen(num) {
        const height = Math.ceil(Math.log2(num));
        return new Height(height);
    }
    getParentHeight() {
        return new Height(this._inner + 1);
    }
    toField() {
        return Field(this._inner);
    }
}
/**
 * NodePosition represents the position of a node in the tree
 * x is offset from the leftmost node in the tree
 * y is the height of the node in the tree
 *
 * max value of x is 2^53 - 1
 */
export class NodePosition {
    constructor(x, y) {
        if (x < 0 || x > 2 ** 53 - 1) {
            throw new Error("x cannot be negative");
        }
        this.x = x;
        this.y = y;
    }
    getDirection() {
        return this.x % 2 == 0 ? Direction.Left : Direction.Right;
    }
    getSiblingPosition() {
        return new NodePosition(this.x + (this.getDirection() == Direction.Left ? 1 : -1), this.y);
    }
    isLeft() {
        return this.getDirection() == Direction.Left;
    }
    xCord() {
        return this.x;
    }
    toFields() {
        return [Field(this.x), this.y.toField()];
    }
    equals(other) {
        return this.x == other.x && this.y._inner == other.y._inner;
    }
    getParentPosition() {
        return new NodePosition(this.x >> 1, this.y.getParentHeight());
    }
    yCord() {
        return this.y._inner;
    }
    toString() {
        return `(${this.x},${this.y._inner})`;
    }
    toMapKey() {
        // Have to do this bigint conversion because bitwise operations in JS are limited to 32 bits
        const xn = BigInt(this.xCord()) << 6n;
        const yn = BigInt(this.yCord());
        return Number(xn | yn);
    }
    static fromMapKey(key) {
        const x = Number(key >> 6n);
        const y = Number(key & 0x3fn);
        return new NodePosition(x, new Height(y));
    }
    static fromRedisKey(redisKey, prefix = true) {
        const parts = prefix ? redisKey.slice(6, -1).split(',').map(Number) : redisKey.slice(1, -1).split(',').map(Number);
        const x = parts[0];
        if (x === undefined)
            throw new Error("Cannot do fromRedisKey without x");
        const y = parts[1];
        if (y === undefined)
            throw new Error("Cannot do fromRedisKey without y");
        return new NodePosition(x, new Height(y));
    }
}
