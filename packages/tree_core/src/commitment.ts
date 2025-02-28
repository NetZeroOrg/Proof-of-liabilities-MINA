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
        const genHash = Poseidon.hash(gen.toFields());
        const baseBlinding = gen.scale(genHash)
        return baseBlinding;
    }

    static defaultCommitment(baseVal: bigint | Field, blidingVal: bigint | Field): Group {
        return PedersenCommitment.base.scale(baseVal).add(PedersenCommitment.blindingBase.scale(blidingVal));
    }
}