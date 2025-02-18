import { Node } from "../src/node_content"
import { DBRecord } from "../src/types"
import { Bytes32, randomBytes32 } from "../src/bytes"
import { rangeCheckProgram } from "circuits/dist/programs"

describe("Node testing", () => {
    beforeAll(async () => {
        console.log("Compiling range check program")
        await rangeCheckProgram.compile()
        console.log("Range check program compiled")
    })
    it("should create a new leaf node", async () => {
        const record: DBRecord<3> = {
            balances: [1, 2, 3],
            user: "12308"
        }
        const userSecret = randomBytes32()
        const blindingFactor = randomBytes32()
        const node = await Node.newLeaf({
            record,
            userSecret,
            blindingFactor,
            compileRangeCheckProgram: rangeCheckProgram
        })
        console.log(node)
        expect(node.liabilties).toBe(6n)
        expect(node.rangeProof).toBeDefined()

    })
})