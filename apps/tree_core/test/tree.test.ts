import { rangeCheckProgram } from "circuits/dist/programs"
import { randomRecords } from "../src/testUtil"
import { TreeBuilder, TreeParams } from "../src/treeBuilder"
import { Height } from "../src/position"
import { randomBytes32 } from "../src/bytes"

describe("Tree tests", () => {
    const randRecord = randomRecords(8, 4)
    const treeParams: TreeParams = {
        masterSecret: randomBytes32(),
        saltB: randomBytes32(),
        saltS: randomBytes32()
    }
    beforeAll(async () => {
        await rangeCheckProgram.compile()
    })
    it("should make a tree", async () => {
        const treeBuilder = new TreeBuilder(randRecord, new Height(3), treeParams)
        const tree = await treeBuilder.buildSingleThreaded(rangeCheckProgram)
        console.log(tree)
        expect(tree.root).toBeDefined()
        expect(tree).toBeDefined()
    }, 1_000_000)
})