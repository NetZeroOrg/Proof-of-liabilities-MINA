// You can put logic in different files if you want
import { createForeignCurve, Crypto, ZkProgram, Field, Gadgets, Group, Poseidon, PrivateKey, Proof, Provable, PublicKey, SelfProof, method, Bool, Nullifier, } from "o1js";
import { NUM_ACTUAL_ADDRESS, NUM_ASSETS, NUM_PUBLIC_ADDRESS, ProofOfAssetPublicInput, ProofOfAssetsPrivateInput, PublicAddress, Nullifiers, Balances } from "./types.js";


/**
 * This is the proof that the known addresses are a subset of the addresses array. This is for a particular chain
 * @param addresses Is the set of all addresses and the balance of each address
 * @param selectorArray Is the dynamic array of known addresses
 */
export async function proofOfAssets(
    publicInput: ProofOfAssetPublicInput,
    privateInput: ProofOfAssetsPrivateInput,
    selectorArrayProof: SelectorArrayProof
): Promise<{ publicOutput: Group }> {
    // check that keyPair is Valid
    for (let i = 0; i < NUM_PUBLIC_ADDRESS; i++) {
        selectorArrayProof.publicInput.addresses[i]!.assertEquals(publicInput.address.addresses[i]!)
    }
    selectorArrayProof.publicOutput.assertEquals(publicInput.selectorArrayCommitment)
    selectorArrayProof.verify()
    let assetValue = Field(0)
    for (let j = 0; j < NUM_PUBLIC_ADDRESS; j++) {
        const selector = privateInput.selectorArray[j]!
        let balance = Field(0)
        for (let i = 0; i < NUM_ASSETS; i++) {
            const balance_ = publicInput.balances[j][i]
            balance = balance.add(balance_)
        }
        const toAdd = Provable.if(selector, balance, Field(0))
        // range check every balance that is added
        Gadgets.rangeCheck64(toAdd)
        assetValue = assetValue.add(toAdd)
    }
    const basePoint = Group.generator.scale(assetValue)
    const blidingPoint = Poseidon.hashToGroup(Group.generator.toFields())
    const commitment = basePoint.add(blidingPoint.scale(privateInput.blidingFactor))
    return {
        publicOutput: commitment,
    }
}

const secretMessage = process.env.SECRET_MESSAGE!.split(' ').map((c) => c.charCodeAt(0))
const secretMessageField = secretMessage.map((c) => Field(c))
console.log(secretMessage)

export async function selectorArray(
    addresses: PublicAddress,
    nullfier: Nullifiers
): Promise<{ publicOutput: Group }> {
    let commitment = Group.generator
    // verify all the nullifiers
    for (let i = 0; i < NUM_ACTUAL_ADDRESS; i++) {
        nullfier.nullfiers[i].verify(secretMessageField)
    }
    for (let j = 0; j < NUM_PUBLIC_ADDRESS; j++) {
        let isIn = Bool(false)
        for (let i = 0; i < NUM_ACTUAL_ADDRESS; i++) {
            isIn = isIn.or(nullfier.nullfiers[i].getPublicKey().equals(addresses.addresses[j]!))
        }
        const scalar = Provable.if(isIn, Field(1), Field(0))
        commitment = commitment.add(Poseidon.hashToGroup(commitment.toFields()).scale(scalar))
    }
    return {
        publicOutput: commitment
    }
}

export const selectorZkProgram = ZkProgram({
    name: "selector commitment calculation",
    publicInput: PublicAddress,
    publicOutput: Group,
    methods: {
        selector: {
            privateInputs: [Nullifiers],
            method: selectorArray,
        },
    }
})

export class SelectorArrayProof extends ZkProgram.Proof(selectorZkProgram) { }

export const proofOfAssetProgram = ZkProgram({
    name: "proof of asset",
    publicInput: ProofOfAssetPublicInput,
    publicOutput: Group,
    methods: {
        base: {
            privateInputs: [ProofOfAssetsPrivateInput, SelectorArrayProof],
            method: proofOfAssets,
        },
    }
})

export class ProofOfAsset extends ZkProgram.Proof(proofOfAssetProgram) { }