import { assert, Field, Gadgets, Group, Poseidon, Provable, SelfProof, ZkProgram } from "o1js";
import { MerkleWitness, NodeContent, UserParams } from "./types.js";


export const inclusionProof = async (witness: MerkleWitness, userParams: UserParams): Promise<{ publicOutput: NodeContent }> => {
    // the bliding point for pedersen commitment
    const blindingPoint = Group.generator.scale(Poseidon.hash(Group.generator.toFields()))

    let liabilities = Field(0)
    userParams.balances.forEach((balance, index) => {
        liabilities = liabilities.add(balance)
    })

    // assert that the net liability is positive
    Gadgets.rangeCheck64(liabilities)

    let rootComm = Group.generator.scale(liabilities).add(blindingPoint.scale(userParams.blindingFactor))
    let rootHash = Poseidon.hash([Field(10810197102n), Field(userParams.userId), userParams.userSecret])
    // compute the user leaf

    //TODO: should this be here? doesn't `Provable.Array` always garantee the length will be 32?
    assert(witness.lefts.length == witness.path.length, "The path length and left array do not match")
    for (let index = 0; index < 32; index++) {
        const leftComm = Provable.if(witness.lefts[index]!, witness.path[index]!.commitment, rootComm);
        const rightComm = Provable.if(witness.lefts[index]!, rootComm, witness.path[index]!.commitment);
        const newComm = leftComm.add(rightComm)
        const leftHash = Provable.if(witness.lefts[index]!, witness.path[index]!.hash, rootHash)
        const rightHash = Provable.if(witness.lefts[index]!, rootHash, witness.path[index]!.hash)
        const newHash = Poseidon.hash([...leftComm.toFields(), ...rightComm.toFields(), leftHash, rightHash])
        rootHash = Provable.if(newComm.equals(rootComm), rootHash, newHash)
        rootComm = newComm
    }
    return { publicOutput: new NodeContent({ commitment: rootComm, hash: rootHash }) }
}

// The incremental proof that verifies the liability inclusion of the previous proof also
export const incrementalInclusionProof = async (
    witness: MerkleWitness,
    prevProof: SelfProof<unknown, unknown>,
    userParams: UserParams
) => {
    // verify the previous inclusion proof that was created
    prevProof.verify()
    return inclusionProof(witness, userParams)
}

export const InclusionProofProgram = ZkProgram({
    name: 'Compute Root',
    publicInput: MerkleWitness,
    publicOutput: NodeContent,
    methods: {
        inclusionProof: {
            privateInputs: [UserParams],
            method: inclusionProof
        },

        incrementalInclusionProof: {
            privateInputs: [SelfProof<unknown, unknown>, UserParams],
            method: incrementalInclusionProof
        }
    }
})

export class InclusionProof extends ZkProgram.Proof(InclusionProofProgram) { }