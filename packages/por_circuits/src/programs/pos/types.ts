import { Group, Struct } from "o1js";

export class ProofOfSolvencyPublicInputs extends Struct({
    liabilitiesCommitment: Group,
    assetsCommitment: Group,
}) { }
