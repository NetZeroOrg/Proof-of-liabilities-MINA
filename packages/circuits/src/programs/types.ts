import { Bool, Field, Group, Provable, Struct, UInt64 } from "o1js";

export class UserParams extends Struct({
    // assuming a maximum of 1000 assets
    balances: Provable.Array(Field, 100),
    blindingFactor: Field,
    userId: Field,
    userSecret: Field
}) { }

export class NodeContent extends Struct({
    commitment: Group,
    hash: Field
}) { }

/**
 * @param path: We assume that the max height of tree is 32 we can increase this if we want
 * @param root: The root for the tree
 */
export class MerkleWitness extends Struct({
    path: Provable.Array(NodeContent, 32),
    lefts: Provable.Array(Bool, 32)
}) { }

