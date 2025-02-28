import { createClient } from "redis";
import { fromRedisObject, Node, toRedisObject } from "./node.js";
import { Height, NodePosition } from "./position.js";
import { TreeParams, treeParamsToJSON } from "./treeBuilder.js";
import { Bytes32 } from "./bytes.js";
import { RangeCheckProof } from "circuits/dist/index.js";

const NODE_PREFIX = "nodes"
const TREE_PARAMS = "treeParams"
const ROOT_KEY = "root"
const HEIGHT_KEY = "height"


function treeParamsFromRedisObject(
    value: {
        [x: string]: string
    }
): TreeParams {
    const masterSecret = Bytes32.fromNumber(Number(value['masterSecret']!))
    const saltS = Bytes32.fromNumber(Number(value['saltS']!))
    const saltB = Bytes32.fromNumber(Number(value['saltB']!))
    return {
        masterSecret,
        saltB,
        saltS
    }
}

export class Store {

    public map: Map<number, Node>;
    public root: Node;
    public height: Height;
    treeParams: TreeParams
    constructor(root: Node, map: Map<number, Node>, height: Height, treeParams: TreeParams) {
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


        await client.set(HEIGHT_KEY, this.height._inner)


        // save the tree params
        if (this.treeParams) {
            client.hSet(TREE_PARAMS, treeParamsToJSON(this.treeParams))
        }

        // save the tree
        for (const [key, value] of this.map.entries()) {
            console.log(`saving the key ${key} value ${toRedisObject(value)}`)
            client.hSet(NODE_PREFIX + NodePosition.fromMapKey(BigInt(key)).toString(), toRedisObject(value))
        }

        client.hSet(ROOT_KEY, toRedisObject(this.root))
    }


    static async loadFromDB(reddisConnectionURI?: string) {
        const client = createClient({ url: reddisConnectionURI })

        client.on("error", function (error) {
            console.error(error);
            throw error;
        })

        await client.connect()

        const height = Number(await client.get(HEIGHT_KEY))
        const map = new Map<number, Node>();
        const treeParams = treeParamsFromRedisObject(await client.hGetAll(TREE_PARAMS))
        const nodeKeys = await client.keys(NODE_PREFIX + "*")
        const root = fromRedisObject(await client.hGetAll(ROOT_KEY))
        for (const key of nodeKeys) {
            const node = fromRedisObject(await client.hGetAll(key))
            const position = NodePosition.fromRedisKey(key)
            map.set(position.toMapKey(), node)
        }

        return new Store(root, map, new Height(height), treeParams)
    }
}