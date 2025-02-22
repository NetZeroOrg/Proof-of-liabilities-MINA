import { Node } from "./node";
import { Height, NodePosition } from "./position";

export class Store {
    public map: Map<NodePosition, Node>;
    public root: Node;
    public height: Height;
    constructor(root: Node, map: Map<NodePosition, Node>, height: Height) {
        this.root = root;
        this.map = map;
        this.height = height;
    }
}