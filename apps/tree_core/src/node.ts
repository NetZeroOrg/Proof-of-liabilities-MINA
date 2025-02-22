import { Field, Group, Poseidon } from "o1js";
import { newLeafParams, newPaddingNodeParams, newPaddingPathNode, Nullable } from "./types";
import { PedersenCommitment } from "./commitment";
import { rangeCheckProgram, RangeCheckProof } from "circuits/dist/programs/index"

export interface Node {
    liabilities: bigint;
    blinding_factor: bigint;
    commitment: Group;
    hash: Field;
    rangeProof: Nullable<RangeCheckProof>;
}

async function newLeaf<N extends number>(
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
    return { liabilities: totalLiabilities, blinding_factor: blindingFactor.toBigint(), commitment, hash, rangeProof: baseProof.proof };
}

async function newPaddingNode<N extends number>(
    { userSecret, blindingFactor, position, compiledRangeCheckProgram }: newPaddingNodeParams
): Promise<Node> {
    const bfField = blindingFactor.toField();
    const liability = BigInt(0);
    const commitment = PedersenCommitment.defaultCommitment(liability, bfField);
    // Hash of H("padding" | position | user_salt)
    const hash = Poseidon.hash([Field(11297100100105110103n), ...position.toFields(), userSecret.toField()]);
    //                              ^ "padding" as a number
    const baseProof = await compiledRangeCheckProgram.base(Field(liability))
    return { liabilities: liability, blinding_factor: blindingFactor.toBigint(), commitment, hash, rangeProof: baseProof.proof };
}

async function merge(leftChild: Node, rightChild: Node): Promise<Node> {
    const liabilities = leftChild.liabilities + rightChild.liabilities
    const blidingFactor = leftChild.blinding_factor + rightChild.blinding_factor

    const commitment = leftChild.commitment.add(rightChild.commitment);
    const hash = Poseidon.hash([...leftChild.commitment.toFields(), ...rightChild.commitment.toFields(), leftChild.hash, rightChild.hash]);
    if (leftChild.rangeProof == null || rightChild.rangeProof == null) {
        throw new Error("One of the children does not have a range proof")
    }
    const { proof } = await rangeCheckProgram.merge(leftChild.rangeProof, rightChild.rangeProof, Field(liabilities));
    return { liabilities, blinding_factor: blidingFactor, commitment, hash, rangeProof: proof };
}

function toPathNode(node: Node): PathNode {
    return { commitment: node.commitment, hash: node.hash };
}


/**
 * Represents a node in the path of inclusion proof of the tree
 */
export interface PathNode {
    commitment: Group;
    hash: Field;
}

function newPadPathNode(params: newPaddingPathNode): PathNode {
    const bfField = params.blindingFactor.toField();
    const liability = BigInt(0);
    const commitment = PedersenCommitment.defaultCommitment(liability, bfField);
    // Hash of H("padding" | position | user_salt)
    const hash = Poseidon.hash([Field(11297100100105110103n), ...params.position.toFields(), params.userSecret.toField()]);
    //                              ^ "padding" as a number
    return { commitment, hash };
}

function mergePathNodes(left: PathNode, right: PathNode): PathNode {
    const commitment = left.commitment.add(right.commitment);
    const hash = Poseidon.hash([...left.commitment.toFields(), ...right.commitment.toFields(), left.hash, right.hash]);
    return { commitment, hash };
}



export { newLeaf, newPaddingNode, merge, newPadPathNode, mergePathNodes, toPathNode };