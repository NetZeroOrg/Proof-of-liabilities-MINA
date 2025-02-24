import { createClient, RedisClientOptions } from "redis";
import { Node, toRedisObject } from "./node";
import { Height, NodePosition } from "./position";
import { TreeParams, treeParamsToJSON } from "./treeBuilder";

export class Store {
    public map: Map<NodePosition, Node>;
    public root: Node;
    public height: Height;
    treeParams?: TreeParams
    constructor(root: Node, map: Map<NodePosition, Node>, height: Height, treeParams?: TreeParams) {
        this.root = root;
        this.map = map;
        this.height = height;
        this.treeParams = treeParams
    }

    async save(redisConnectionURL?: string) {
        const client = createClient({ url: redisConnectionURL })
        client.on("error", function (error) {
            console.error(error);
            throw error;
        })
        await client.connect()

        // save the tree params
        if (this.treeParams) {
            client.hSet("treeParams", treeParamsToJSON(this.treeParams))
        }

        // save the tree
        for (const [key, value] of this.map.entries()) {
            client.hSet(key.toString(), toRedisObject(value))
        }
    }


    static async loadFromDB(reddisConnectionURI: string) {
        const client = createClient({ url: reddisConnectionURI })
        client.on("error", function (error) {
            console.error(error);
            throw error;
        })
        await client.connect()
        const map = new Map<NodePosition, Node>();
        const treeParams = await client.hGetAll("treeParams")
        const keys = await client.keys("*")
        for (const key of keys) {
            const value = await client.hGetAll(key)
            console.log(value)
        }
    }
}