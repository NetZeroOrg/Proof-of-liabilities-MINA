import { rangeCheckProgram } from "circuits/dist/programs"
import { randomRecords } from "../src/testUtil"
import { TreeBuilder, TreeParams } from "../src/treeBuilder"
import { Height, NodePosition } from "../src/position"
import { randomBytes32 } from "../src/bytes"
import { Store } from "../src/store"
import { generateProof } from "../src/path"

describe("Tree tests", () => {
    const randRecord = randomRecords(8, 4)
    const treeParams: TreeParams = {
        masterSecret: randomBytes32(),
        saltB: randomBytes32(),
        saltS: randomBytes32()
    }
    let treeStore: Store
    let recordMap: Map<string, NodePosition>
    const treeBuilder = new TreeBuilder(randRecord, new Height(3), treeParams)
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
        const path = generateProof(treeParams, treeStore, recordMap.get(randRecord[0]!.user)!)
        console.log(path)
    })

})