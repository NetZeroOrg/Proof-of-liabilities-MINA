// The proof of solvency take in the net asset commitment and the libailities commitment and takes the reported liabilities and the reported assets and asserts that
// liabilities commitment - asset commitment = (l - b) * G + (r_l - r_a) * H 
// thus in the circuit we remove the random values and we are left with the liabilities commitment - asset commitment = (l - b) * G
// we check if (l - b) * G = liabilities commitment - asset commitment
// and then we do a rangeCheck on (l - b) * G as we already know that the l is range checked and b is also range checked to be between 0 and 2^256

import { Field, Group, Poseidon, Proof, ZkProgram } from "o1js";
import { ProofOfSolvencyPublicInputs } from "./types.js";
import { ProofOfAsset } from "../por/index.js";
import { RangeCheckProof } from "circuits"

const proofOfSolvency = async (
    publicInputs: ProofOfSolvencyPublicInputs,
    assetProof: ProofOfAsset,
    liabilitiesRangeCheckProof: Proof<unknown, unknown>,
    liabiltiesBlindingFactor: Field,
    assetBlindingFactor: Field,
    liabilityValue: Field,
    assetsValue: Field
) => {
    // That the proof of asset is for the correct asset commitment and it also verifies that the balance is range checked
    assetProof.verify()
    assetProof.publicOutput.assertEquals(publicInputs.assetsCommitment)

    // that l is range checked
    liabilitiesRangeCheckProof.verify()

    liabilityValue.assertGreaterThan(assetsValue)

    // the blinding point H
    const blindingPoint = Poseidon.hashToGroup(Group.generator.toFields())

    // (l - b) * G + (r_l - r_a) * H
    const netCommitment = publicInputs.liabilitiesCommitment.add(publicInputs.assetsCommitment.neg())
    // (l - b) * G
    const netCommitmentWithoutBliding = netCommitment.add(blindingPoint.scale(liabiltiesBlindingFactor.sub(assetBlindingFactor)).neg())

    const computedNetCommitment = Group.generator.scale(liabilityValue.sub(assetsValue))

    // check that the net commitment is equal to the computed net commitment
    computedNetCommitment.assertEquals(netCommitmentWithoutBliding)
}

export const proofOfSolvencyProgram = ZkProgram({
    name: "proof of solvency",
    publicInput: ProofOfSolvencyPublicInputs,
    methods: {
        proofOfSolvency: {
            privateInputs: [ProofOfAsset, RangeCheckProof, Field, Field, Field, Field],
            method: proofOfSolvency
        }
    },
})


export class ProofOfSolvency extends ZkProgram.Proof(proofOfSolvencyProgram) { }