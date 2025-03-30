import { Bool, Field, Provable, Struct, Group } from "o1js";
//TODO: add dynamic arrays from mina-attestations
export const NUM_ASSETS = 7
export const NUM_ACTUAL_ADDRESS = 100
export const NUM_PUBLIC_ADDRESS = 200
export class PublicAddress extends Struct({
    addresses: Provable.Array(Field, NUM_PUBLIC_ADDRESS)
}) { }

export class Balances extends Struct({
    balances: Provable.Array(Field, NUM_PUBLIC_ADDRESS),
}) { }

export class ProofOFAssetPublicInput extends Struct({
    addresses: Provable.Array(Field, NUM_PUBLIC_ADDRESS),
    balances: Provable.Array(Field, NUM_PUBLIC_ADDRESS),
    selectorArrayCommitment: Group,
}) { }

export class ProofOfAssetsPrivateInput extends Struct({
    selectorArray: Provable.Array(Bool, NUM_ASSETS),
    blidingFactor: Field
}) { }


export class SecretKeys extends Struct({
    secretKeys: Provable.Array(Field, NUM_ACTUAL_ADDRESS)
}) { }
