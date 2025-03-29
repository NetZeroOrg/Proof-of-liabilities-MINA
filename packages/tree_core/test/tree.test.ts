import { InclusionProofProgram, NodeContent, rangeCheckProgram, MerkleWitness, UserParams } from "@netzero/circuits"
import { generateRootFromPath, randomRecords } from "../src/testUtil"
import { TreeBuilder, TreeParams } from "../src/treeBuilder"
import { Height, NodePosition } from "../src/position"
import { randomBytes32 } from "../src/bytes"
import { Store } from "../src/store"
import { generateProof } from "../src/path"
import { Bool, Field, Group } from "o1js"
import { PathNode } from "../src/node"

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
        await InclusionProofProgram.compile()
    })
    it("should make a tree", async () => {
        [treeStore, recordMap] = await treeBuilder.buildSingleThreaded(rangeCheckProgram)
        expect(treeStore.root).toBeDefined()
        expect(treeStore).toBeDefined()
    }, 1_000_000)
    it("should generate a path and verify root", async () => {
        let { witness: path, blindingFactor, userSecret } = generateProof(treeStore, recordMap.get(randRecord[0]!.user)!)
        const root = generateRootFromPath(path, treeStore, recordMap.get(randRecord[0]!.user)!)
        expect(
            root.hash.equals(treeStore.root.hash).toBoolean()
        ).toBe(true)
        expect(
            root.commitment.equals(treeStore.root.commitment).toBoolean()
        ).toBe(true)

        let newPath: NodeContent[] = path.path.map((p: PathNode) => {
            return new NodeContent({ commitment: p.commitment, hash: p.hash })
        })
        for (let i = newPath.length; i < 32; i++) {
            newPath.push(new NodeContent({ commitment: Group.zero, hash: Field(0) }))
        }
        let lefts = path.lefts.map((l: boolean) => Bool.fromValue(l))
        for (let i = lefts.length; i < 32; i++) {
            lefts.push(Bool.fromValue(false))
        }

        const merkleWitness = new MerkleWitness({
            path: newPath,
            lefts
        })
        let balances = randRecord[0]!.balances.map(b => Field(b))
        for (let i = balances.length; i < 100; i++) {
            balances.push(Field(0))
        }
        const userParams = new UserParams({
            balances,
            blindingFactor,
            userId: Field(randRecord[0]!.user),
            userSecret
        })
        const { proof } = await InclusionProofProgram.inclusionProof(merkleWitness, userParams)
        expect(proof).toBeDefined()
        expect(proof.publicOutput.commitment.equals(root.commitment).toBoolean()).toBe(true)
        expect(proof.publicOutput.hash.equals(root.hash).toBoolean()).toBe(true)
    })
})

