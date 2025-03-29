import { Field } from "o1js";
import { Direction } from "./types.js";
export declare class Height {
    _inner: number;
    constructor(inner: number);
    maxNodes(): number;
    enoughLeafNodes(num: number): boolean;
    static fromNodesLen(num: number): Height;
    getParentHeight(): Height;
    toField(): Field;
}
/**
 * NodePosition represents the position of a node in the tree
 * x is offset from the leftmost node in the tree
 * y is the height of the node in the tree
 *
 * max value of x is 2^53 - 1
 */
export declare class NodePosition {
    x: number;
    y: Height;
    constructor(x: number, y: Height);
    getDirection(): Direction;
    getSiblingPosition(): NodePosition;
    isLeft(): boolean;
    xCord(): number;
    toFields(): [Field, Field];
    equals(other: NodePosition): boolean;
    getParentPosition(): NodePosition;
    yCord(): number;
    toString(): string;
    toMapKey(): number;
    static fromMapKey(key: bigint): NodePosition;
    static fromRedisKey(redisKey: string, prefix?: boolean): NodePosition;
}
//# sourceMappingURL=position.d.ts.map