import { Bool, Field, Provable, Struct, Group, PublicKey, Nullifier } from "o1js";


//TODO: add dynamic arrays from mina-attestations
export const NUM_ASSETS = 3
export const NUM_ACTUAL_ADDRESS = 5
export const NUM_PUBLIC_ADDRESS = 10

export class PublicAddress extends Struct({
    addresses: Provable.Array(PublicKey, NUM_PUBLIC_ADDRESS)
}) { }


export class Balances extends Struct({
    balances: Provable.Array(Provable.Array(Field, NUM_ASSETS), NUM_PUBLIC_ADDRESS),
}) { }

export class ProofOfAssetPublicInput extends Struct({
    selectorArrayCommitment: Group,
    address: PublicAddress,
    balances: Provable.Array(Provable.Array(Field, NUM_ASSETS), NUM_PUBLIC_ADDRESS),

}) { }

export class ProofOfAssetsPrivateInput extends Struct({
    blidingFactor: Field,
    selectorArray: Provable.Array(Bool, NUM_PUBLIC_ADDRESS),
}) { }

export class Nullifiers extends Struct({
    nullfiers: Provable.Array(Nullifier, NUM_ACTUAL_ADDRESS)
}) { }