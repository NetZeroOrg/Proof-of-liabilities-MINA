import { FeatureFlags, Field, Group, Poseidon } from "o1js";
import { DBRecord, newLeafParams } from "./types";
import { PedersenCommitment } from "./commitment";

export class Node {
    liabilties: bigint | Field;
    bliding_factor: bigint | Field;
    public commitment: Group;
    public hash: Field;

    constructor(liabilities: bigint | Field, blindingFactor: bigint | Field, commitment: Group, hash: Field) {
        this.liabilties = liabilities;
        this.bliding_factor = blindingFactor;
        this.commitment = commitment;
        this.hash = hash;
    }

    static newLeaf<N extends number>(
        { record, userSecret, blindingFactor }: newLeafParams<N>
    ) {
        const bfField = blindingFactor.toField();
        let totalLiabilities = BigInt(0);
        for (let i = 0; i < record.balances.length; i++) {
            totalLiabilities += BigInt(record.balances[i]);
        }
        const commitment = PedersenCommitment.defaultCommitment(totalLiabilities, bfField);
        // Hash of `H("leaf" | user_id | user_salt)`
        const hash = Poseidon.hash([Field("leaf"), Field(record.user), userSecret.toField()]);
        return new Node(totalLiabilities, bfField, commitment, hash);
    }

    static newPaddingNode<N extends number>(
    ) { }
}