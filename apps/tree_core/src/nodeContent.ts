import { Field, Group, Poseidon } from "o1js";
import { newLeafParams, newPaddingNodeParams, Nullable } from "./types";
import { PedersenCommitment } from "./commitment";
import { rangeCheckProgram, RangeCheckProof } from "circuits/dist/programs/index"


export class Node {
    liabilties: bigint;
    bliding_factor: bigint;
    public commitment: Group;
    public hash: Field;
    rangeProof: Nullable<RangeCheckProof>;
    constructor(liabilities: bigint, blindingFactor: bigint, commitment: Group, hash: Field, rangeProof?: RangeCheckProof) {
        this.liabilties = liabilities;
        this.bliding_factor = blindingFactor;
        this.commitment = commitment;
        this.hash = hash;
        this.rangeProof = rangeProof ? rangeProof : null;
    }

    static async newLeaf<N extends number>(
        { record, userSecret, blindingFactor, compileRangeCheckProgram }: newLeafParams<N>
    ): Promise<Node> {
        const bfField = blindingFactor.toField();
        let totalLiabilities = BigInt(0);
        for (let i = 0; i < record.balances.length; i++) {
            const balance = record.balances[i];
            if (balance !== undefined) {
                totalLiabilities += BigInt(balance);
            } else {
                throw new Error(`Balance  at ${i} is undefined`);
            }
        }
        const commitment = PedersenCommitment.defaultCommitment(totalLiabilities, bfField);
        // Hash of `H("leaf" | user_id | user_salt)`
        const hash = Poseidon.hash([Field(10810197102n), Field(record.user), userSecret.toField()]);
        //                              ^ "leaf" as a number
        const baseProof = await compileRangeCheckProgram.base(Field(totalLiabilities))

        return new Node(totalLiabilities, blindingFactor.toBigint(), commitment, hash, baseProof.proof);
    }

    static async newPaddingNode<N extends number>(
        { userSecret, blindingFactor, position, compiledRangeCheckProgram }: newPaddingNodeParams
    ): Promise<Node> {
        const bfField = blindingFactor.toField();
        const liability = BigInt(0);
        const commitment = PedersenCommitment.defaultCommitment(liability, bfField);
        // Hash of H("padding" | position | user_salt)
        const hash = Poseidon.hash([Field(11297100100105110103n), ...position.toFields(), userSecret.toField()]);
        //                              ^ "padding" as a number
        const baseProof = await compiledRangeCheckProgram.base(Field(liability))
        return new Node(liability, blindingFactor.toBigint(), commitment, hash, baseProof.proof);
    }

    static async merge(leftChild: Node, rightChild: Node): Promise<Node> {
        const liabilities = leftChild.liabilties + rightChild.liabilties
        const blidingFactor = leftChild.bliding_factor + rightChild.bliding_factor

        const commitment = leftChild.commitment.add(rightChild.commitment);
        const hash = Poseidon.hash([...leftChild.commitment.toFields(), ...rightChild.commitment.toFields(), leftChild.hash, rightChild.hash]);
        if (leftChild.rangeProof == null || rightChild.rangeProof == null) {
            throw new Error("One of the children does not have a range proof")
        }
        const { proof } = await rangeCheckProgram.merge(leftChild.rangeProof, rightChild.rangeProof, Field(liabilities));
        return new Node(liabilities, blidingFactor, commitment, hash, proof);
    }
}