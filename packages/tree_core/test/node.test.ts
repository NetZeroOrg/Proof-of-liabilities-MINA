import { merge, newLeaf, newPaddingNode, Node } from "../src/node"
import { DBRecord } from "../src/types"
import { randomBytes32 } from "../src/bytes"
import { rangeCheckProgram } from "circuits/dist/programs"
import { Height, NodePosition } from "../src/position"

describe("Node testing", () => {
    const record: DBRecord<3> = {
        balances: [1, 2, 3],
        user: "3"
    }
    const record2: DBRecord<3> = {
        balances: [20, 40, 30],
        user: "2"
    }

    const record3: DBRecord<3> = {
        balances: [10, 20, 30],
        user: "1"
    }
    const userSecret = [randomBytes32(), randomBytes32(), randomBytes32()]
    const blindingFactor = [randomBytes32(), randomBytes32(), randomBytes32()]
    beforeAll(async () => {
        console.log("Compiling range check program")
        await rangeCheckProgram.compile()
        console.log("Range check program compiled")
    })
    let node1: Node
    let node2: Node
    let paddingNode: Node
    it("should create a new leaf node", async () => {
        node1 = await newLeaf({
            record,
            userSecret: userSecret[0] || randomBytes32(),
            blindingFactor: blindingFactor[0] || randomBytes32(),
            compileRangeCheckProgram: rangeCheckProgram
        })
        console.log(node1)
        expect(node1.liabilities).toBe(6n)
        expect(node1.rangeProof).toBeDefined()
    })
    it("should create a padding node", async () => {
        paddingNode = await newPaddingNode({
            userSecret: userSecret[1] || randomBytes32(),
            blindingFactor: blindingFactor[1] || randomBytes32(),
            position: new NodePosition(1, new Height(1)),
            compiledRangeCheckProgram: rangeCheckProgram
        })
        console.log(paddingNode)
        expect(paddingNode.liabilities).toBe(0n)
        expect(paddingNode.rangeProof).toBeDefined()
    })
    it("should create a sibling node and merge them", async () => {
        node2 = await newLeaf({
            record: record2,
            userSecret: userSecret[2] || randomBytes32(),
            blindingFactor: blindingFactor[2] || randomBytes32(),
            compileRangeCheckProgram: rangeCheckProgram
        })
        console.log(node2)
        const mergedNode = await merge(node1, node2)
        console.log(mergedNode)
        expect(mergedNode.liabilities).toBe(96n)
        expect(mergedNode.rangeProof).toBeDefined()
    })
    it("should merge with a padding node", async () => {
        const mergedNode = await merge(node1, paddingNode)
        console.log(mergedNode)
        expect(mergedNode.liabilities).toBe(6n)
        expect(mergedNode.rangeProof).toBeDefined()
    })
})