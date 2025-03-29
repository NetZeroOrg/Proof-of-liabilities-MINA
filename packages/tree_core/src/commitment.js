import { Group, Poseidon } from "o1js";
/**
 * Pedersen commitment scheme
 */
export class PedersenCommitment {
    static get base() {
        return Group.generator;
    }
    static get blindingBase() {
        const gen = Group.generator;
        const genHash = Poseidon.hash(gen.toFields());
        const baseBlinding = gen.scale(genHash);
        return baseBlinding;
    }
    static defaultCommitment(baseVal, blidingVal) {
        return PedersenCommitment.base.scale(baseVal).add(PedersenCommitment.blindingBase.scale(blidingVal));
    }
}
