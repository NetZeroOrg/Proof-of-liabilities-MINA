import { Node } from "./node.js";
import { Height } from "./position.js";
import { TreeParams } from "./treeBuilder.js";
export declare class Store {
    map: Map<number, Node>;
    root: Node;
    height: Height;
    treeParams: TreeParams;
    constructor(root: Node, map: Map<number, Node>, height: Height, treeParams: TreeParams);
    save(redisConnectionURL?: string): Promise<void>;
    static loadFromDB(rootProofPath: string, reddisConnectionURI?: string): Promise<Store>;
}
//# sourceMappingURL=store.d.ts.map