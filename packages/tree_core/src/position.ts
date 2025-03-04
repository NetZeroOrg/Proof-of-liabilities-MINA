import { Field } from "o1js"
import { Direction } from "./types.js"

export class Height {
    _inner: number = 0

    constructor(inner: number) {
        this._inner = inner
    }

    public maxNodes(): number {
        return 2 ** this._inner
    }

    public enoughLeafNodes(num: number): boolean {
        return this.maxNodes() >= num
    }

    public static fromNodesLen(num: number): Height {
        const height = Math.ceil(Math.log2(num))
        return new Height(height)
    }

    public getParentHeight(): Height {
        return new Height(this._inner + 1)
    }

    public toField(): Field {
        return Field(this._inner)
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
    x: number
    y: Height

    constructor(x: number, y: Height) {
        if (x < 0 || x > 2 ** 53 - 1) {
            throw new Error("x cannot be negative")
        }
        this.x = x
        this.y = y
    }
    public getDirection(): Direction {
        return this.x % 2 == 0 ? Direction.Left : Direction.Right
    }

    public getSiblingPosition(): NodePosition {
        return new NodePosition(this.x + (this.getDirection() == Direction.Left ? 1 : -1), this.y)
    }

    public isLeft(): boolean {
        return this.getDirection() == Direction.Left
    }

    public xCord(): number {
        return this.x
    }

    public toFields(): [Field, Field] {
        return [Field(this.x), this.y.toField()]
    }

    public equals(other: NodePosition): boolean {
        return this.x == other.x && this.y._inner == other.y._inner
    }

    public getParentPosition(): NodePosition {
        return new NodePosition(this.x >> 1, this.y.getParentHeight())
    }

    public yCord(): number {
        return this.y._inner
    }

    public toString(): string {
        return `(${this.x},${this.y._inner})`
    }

    public toMapKey(): number {
        // Have to do this bigint conversion because bitwise operations in JS are limited to 32 bits
        const xn = BigInt(this.xCord()) << 6n
        const yn = BigInt(this.yCord())
        return Number(xn | yn)
    }

    static fromMapKey(key: bigint): NodePosition {
        const x = Number(key >> 6n)
        const y = Number(key & 0x3fn)
        return new NodePosition(x, new Height(y))
    }

    static fromRedisKey(redisKey: string, prefix: boolean = true): NodePosition {
        const parts = prefix ? redisKey.slice(6, -1).split(',').map(Number) : redisKey.slice(1, -1).split(',').map(Number)
        const x = parts[0]
        if (x === undefined) throw new Error("Cannot do fromRedisKey without x")
        const y = parts[1]
        if (y === undefined) throw new Error("Cannot do fromRedisKey without y")
        return new NodePosition(x, new Height(y))
    }
}