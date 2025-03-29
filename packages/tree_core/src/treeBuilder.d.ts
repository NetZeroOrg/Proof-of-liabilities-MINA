import { rangeCheckProgram } from "@netzero/circuits/dist/index.js";
import { PathNode } from "./node.js";
import { Height, NodePosition } from "./position.js";
import { DBRecord, newPaddingNodeParams, newPaddingPathNode } from "./types.js";
import { Store } from "./store.js";
import { Bytes32 } from "./bytes.js";
import { XCordGenerator } from "./xCordGen.js";
export type paddingNodeContent = (nodePos: NodePosition) => newPaddingNodeParams;
export type paddingPathNodeContent = (nodePos: NodePosition) => newPaddingPathNode;
/**
 * Builds a tree with path nodes this is seperate method as this does not involve any range check operation
 * @param leafNodes
 * @param height
 * @param paddingNodeClosure
 * @param storeDepth
 *
 * @returns PathNode the root of the sub tree builded
 */
export declare function buildPathTree(leafNodes: [NodePosition, PathNode][], height: Height, paddingNodeClosure: paddingPathNodeContent): PathNode;
export interface TreeParams {
    masterSecret: Bytes32;
    saltS: Bytes32;
    saltB: Bytes32;
}
export declare function treeParamsToJSON(treeParams: TreeParams): {
    masterSecret: string;
    saltS: string;
    saltB: string;
};
export declare class TreeBuilder<N extends number> {
    records: DBRecord<N>[];
    xCordGen: XCordGenerator;
    height: Height;
    treeParams: TreeParams;
    constructor(records: DBRecord<N>[], height: Height, treeParams: TreeParams);
    static fromRecords<N extends number>(records: DBRecord<N>[], height: Height, treeParams: TreeParams): TreeBuilder<N>;
    buildSingleThreaded(compileRangeCheckProgram: typeof rangeCheckProgram, saveRecordMap?: boolean, reddisConnectionURI?: string): Promise<[Store, Map<string, NodePosition>]>;
}
//# sourceMappingURL=treeBuilder.d.ts.map