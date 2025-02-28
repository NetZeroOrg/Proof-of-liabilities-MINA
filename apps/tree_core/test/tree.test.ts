import { rangeCheckProgram } from "circuits/dist/programs"
import { loadRandomUserFromDB, randomRecords } from "../src/testUtil"
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
        console.log(treeStore)
        expect(treeStore.root).toBeDefined()
        expect(treeStore).toBeDefined()
    }, 1_000_000)
    it("should generate a path and verify root", async () => {
        const path = generateProof(treeStore, recordMap.get(randRecord[0]!.user)!)
        console.log(path)
    })
})


describe("Tree save and load test", () => {
    beforeAll(async () => {
        await rangeCheckProgram.compile()
    })
    it("should save the tree", async () => {
        await createRandomDataTree(3, 10)
    })
    it("should load store from redis and generate path", async () => {
        const store = await Store.loadFromDB()
        const [nodePos, user] = await loadRandomUserFromDB()
        console.log("generating for", user)
        const proof = generateProof(store, nodePos)
        console.log(proof)
    }, 1_000_000)
})