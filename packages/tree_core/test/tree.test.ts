import { rangeCheckProgram } from "circuits"
import { generateRootFromPath, loadRandomUserFromDB, randomRecords } from "../src/testUtil"
import { TreeBuilder, TreeParams } from "../src/treeBuilder"
import { Height, NodePosition } from "../src/position"
import { randomBytes32 } from "../src/bytes"
import { Store } from "../src/store"
import { generateProof } from "../src/path"
import { createRandomDataTree } from "../src/dummyDataScript"

describe("Basic Tree Test", () => {
    const randRecord = randomRecords(3, 4)
    const treeParams: TreeParams = {
        masterSecret: randomBytes32(),
        saltB: randomBytes32(),
        saltS: randomBytes32()
    }
    let treeStore: Store
    let recordMap: Map<string, NodePosition>
    const treeBuilder = new TreeBuilder(randRecord, new Height(2), treeParams)
    beforeAll(async () => {
        await rangeCheckProgram.compile()
    })
    it("should make a tree", async () => {
        [treeStore, recordMap] = await treeBuilder.buildSingleThreaded(rangeCheckProgram)
        expect(treeStore.root).toBeDefined()
        expect(treeStore).toBeDefined()
    }, 1_000_000)
    it("should generate a path and verify root", async () => {
        const path = generateProof(treeStore, recordMap.get(randRecord[0]!.user)!)
        const root = generateRootFromPath(path, treeStore, recordMap.get(randRecord[0]!.user)!)
        expect(
            root.hash.equals(treeStore.root.hash).toBoolean()
        ).toBe(true)
        expect(
            root.commitment.equals(treeStore.root.commitment).toBoolean()
        ).toBe(true)
    })
})


describe("Tree save and load test", () => {
    beforeAll(async () => {
        await rangeCheckProgram.compile()
    })
    it("should save the tree", async () => {
        await createRandomDataTree(3, 10)
    }, 1_000_000)
    it("should load store from redis and generate path", async () => {
        const store = await Store.loadFromDB("root_proof.json")
        const nodePos = new NodePosition(0, new Height(0))
        const proof = generateProof(store, nodePos)
        const root = generateRootFromPath(proof, store, nodePos)
        expect(
            root.hash.equals(store.root.hash).toBoolean()
        ).toBe(true)
        expect(
            root.commitment.equals(store.root.commitment).toBoolean()
        ).toBe(true)
    }, 1_000_000)
})