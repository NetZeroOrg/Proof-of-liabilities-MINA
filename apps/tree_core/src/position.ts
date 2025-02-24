import { Field } from "o1js"
import { Direction } from "./types"

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
    x: number = 0
    y: Height = new Height(0)

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
        return this.x == other.x && this.y == other.y
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
}