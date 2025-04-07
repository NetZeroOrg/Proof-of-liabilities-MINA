import { Field, Group, Poseidon } from "o1js";

/**
 * Pedersen commitment scheme
 */
export class PedersenCommitment {
    static get base(): Group {
        return Group.generator;
    }

    static get blindingBase(): Group {
        const gen = Group.generator;
        const baseBlinding = Poseidon.hashToGroup(gen.toFields())
        return baseBlinding;
    }

    static defaultCommitment(baseVal: bigint | Field, blidingVal: bigint | Field): Group {
        console.log("Computed commitment: with params", baseVal, blidingVal);
        return PedersenCommitment.base.scale(baseVal).add(this.blindingBase.scale(blidingVal));
    }
}