// You can put logic in different files if you want
import { createForeignCurve, Crypto, ZkProgram, Field, Gadgets, Group, Poseidon, PrivateKey, Proof, Provable, PublicKey, SelfProof, method, Bool, } from "o1js";
import { NUM_ACTUAL_ADDRESS, NUM_ASSETS, NUM_PUBLIC_ADDRESS, ProofOFAssetPublicInput, ProofOfAssetsPrivateInput, PublicAddress, SecretKeys } from "./types.js";

class Secp256k1 extends createForeignCurve(Crypto.CurveParams.Secp256k1) { }

/**
 * This is the proof that the known addresses are a subset of the addresses array. This is for a particular chain
 * @param addresses Is the set of all addresses and the balance of each address
 * @param selectorArray Is the dynamic array of known addresses
 */
export async function proofOfAssets(
    publicInput: ProofOFAssetPublicInput,
    privateInput: ProofOfAssetsPrivateInput,
    selectorArrayProof: SelectorArrayProof
): Promise<{ publicOutput: Group }> {
    // check that keyPair is Valid
    for (let i = 0; i < NUM_PUBLIC_ADDRESS; i++) {
        selectorArrayProof.publicInput.addresses[i]!.assertEquals(publicInput.addresses[i]!)
    }
    selectorArrayProof.publicOutput.assertEquals(publicInput.selectorArrayCommitment)
    selectorArrayProof.verify()
    let assetValue = Field(0)
    for (let i = 0; i < NUM_ASSETS; i++) {
        const balance = Provable.if(privateInput.selectorArray[i]!, publicInput.balances[i]!, Field(0))
        Gadgets.rangeCheck64(balance)
        assetValue = assetValue.add(balance)
    }
    const basePoint = Group.generator.scale(assetValue)
    const blidingPoint = Poseidon.hashToGroup(basePoint.toFields())
    const commitment = basePoint.add(blidingPoint.scale(privateInput.blidingFactor))

    return {
        publicOutput: commitment,
    }
}


export async function ethereumSelectorArray(
    addresses: PublicAddress,
    secretKeys: SecretKeys,
): Promise<{ publicOutput: Group }> {
    // check that keyPair is Valid
    let commitment = Group.generator
    for (let i = 0; i < NUM_ACTUAL_ADDRESS; i++) {
        const computedEthPublicKey = Provable.witness(Secp256k1, () => Secp256k1.generator.scale(secretKeys.secretKeys[i]!.toBigInt()))
        const actualKey = Provable.witness(Secp256k1, () => Secp256k1.fromEthers(addresses.addresses[i]!.toBigInt().toString(16)))
        const isEqual = Provable.witness(Bool, () => computedEthPublicKey.x.equals(actualKey.x.toBigInt()).and(computedEthPublicKey.y.equals(actualKey.y.toBigInt())))
        const scalar = Provable.if(isEqual, Field(1), Field(0))
        commitment = commitment.add(Poseidon.hashToGroup(commitment.toFields()).scale(scalar))
    }
    return {
        publicOutput: commitment
    }
}

export async function pallasSelectorArray(
    addresses: PublicAddress,
    secretKeys: SecretKeys,
): Promise<{ publicOutput: Group }> {
    let commitment = Group.generator
    for (let i = 0; i < NUM_ACTUAL_ADDRESS; i++) {
        const actualKey = Provable.witness(PublicKey, () => PublicKey.fromFields([addresses.addresses[i]!]))
        const publicKey = Provable.witness(PublicKey, () => PrivateKey.fromBigInt(secretKeys.secretKeys[i]!.toBigInt()).toPublicKey())
        const isEqual = actualKey.equals(publicKey)
        const scalar = Provable.if(isEqual, Field(1), Field(0))
        const commitmentPoint = Poseidon.hashToGroup(commitment.toFields()).scale(scalar)
        commitment = commitment.add(commitmentPoint)
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
        ethereum: {
            privateInputs: [SecretKeys],
            method: ethereumSelectorArray,
        },
        mina: {
            privateInputs: [SecretKeys],
            method: pallasSelectorArray,
        },
    }
})

export class SelectorArrayProof extends ZkProgram.Proof(selectorZkProgram) { }

export const proofOfAssetProgram = ZkProgram({
    name: "proof of asset",
    publicInput: ProofOFAssetPublicInput,
    publicOutput: Group,
    methods: {
        base: {
            privateInputs: [ProofOfAssetsPrivateInput, SelectorArrayProof],
            method: proofOfAssets,
        },
        recursive: {
            privateInputs: [ProofOfAssetsPrivateInput, SelectorArrayProof, SelfProof<PublicAddress, Group>],
            method: async (pubInput: ProofOFAssetPublicInput, privateInput: ProofOfAssetsPrivateInput, selectorArrayProof: Proof<PublicAddress, Group>, proof: SelfProof<PublicAddress, Group>): Promise<{ publicOutput: Group }> => {
                proof.verify()
                const { publicOutput } = await proofOfAssets(pubInput, privateInput, selectorArrayProof)
                return {
                    publicOutput: proof.publicOutput.add(publicOutput),
                }
            }
        }
    }
})

export class ProofOfAsset extends ZkProgram.Proof(proofOfAssetProgram) { }