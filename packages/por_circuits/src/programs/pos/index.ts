// The proof of solvency take in the net asset commitment and the libailities commitment and takes the reported liabilities and the reported assets and asserts that
// liabilities commitment - asset commitment = (l - b) * G + (r_l - r_a) * H 
// thus in the circuit we remove the random values and we are left with the liabilities commitment - asset commitment = (l - b) * G
// we check if (l - b) * G = liabilities commitment - asset commitment
// and then we do a rangeCheck on (l - b) * G as we already know that the l is range checked and b is also range checked to be between 0 and 2^256

import { Field, Gadgets, Group, Poseidon, Proof, Provable, ZkProgram } from "o1js";
import { ProofOfSolvencyPublicInputs } from "./types.js";
import { ProofOfAsset } from "../por/index.js";
import { RangeCheckProof } from "@netzero/circuits"

const proofOfSolvency = async (
    publicInputs: ProofOfSolvencyPublicInputs,
    assetProof: ProofOfAsset,
    liabilitiesRangeCheckProof: RangeCheckProof,
    liabiltiesBlindingFactor: Field,
    assetBlindingFactor: Field,
    liabilityValue: Field,
    assetsValue: Field
) => {
    Provable.log(assetsValue)
    Provable.log(liabilityValue)
    Provable.log(assetBlindingFactor)
    Provable.log(liabiltiesBlindingFactor)

    // That the proof of asset is for the correct asset commitment and it also verifies that the balance is range checked
    assetProof.verify()
    assetProof.publicOutput.assertEquals(publicInputs.assetsCommitment)
    // that l is range checked
    liabilitiesRangeCheckProof.verify()

    // that the asset value is range checked
    assetsValue.assertGreaterThanOrEqual(liabilityValue)

    // the blinding point H
    const blindingPoint = Poseidon.hashToGroup(Group.generator.toFields())

    // this should be (b - l) * G + (r_a - r_l) * H => if (r_a < _rl) (r_a - r_l) = (r_a + field_modulus - r_l)
    const netCommitment = publicInputs.assetsCommitment.add(publicInputs.liabilitiesCommitment.neg())
    // this is (b - l) * G + (r_a - r_l) * H 
    const computedNetCommitment = Group.generator.scale(assetsValue.sub(liabilityValue)).add(blindingPoint.scale(assetBlindingFactor.sub(liabiltiesBlindingFactor)))

    // check that the net commitment is equal to the computed net commitment
    computedNetCommitment.assertEquals(netCommitment)
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