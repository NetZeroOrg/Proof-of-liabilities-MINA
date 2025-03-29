import { Field, Group } from "o1js";
/**
 * Pedersen commitment scheme
 */
export declare class PedersenCommitment {
    static get base(): Group;
    static get blindingBase(): Group;
    static defaultCommitment(baseVal: bigint | Field, blidingVal: bigint | Field): Group;
}
//# sourceMappingURL=commitment.d.ts.map