import { Field, Group, Poseidon } from "o1js";
import { PedersenCommitment } from "./commitment.js";
import { rangeCheckProgram } from "@netzero/circuits/dist/index.js";
async function newLeaf({ record, userSecret, blindingFactor, compileRangeCheckProgram }) {
    const bfField = blindingFactor.toField();
    let totalLiabilities = BigInt(0);
    for (let i = 0; i < record.balances.length; i++) {
        const balance = record.balances[i];
        if (balance !== undefined) {
            totalLiabilities += BigInt(balance);
        }
        else {
            throw new Error(`Balance  at ${i} is undefined`);
        }
    }
    const commitment = PedersenCommitment.defaultCommitment(totalLiabilities, bfField);
    // Hash of `H("leaf" | user_id | user_salt)`
    const hash = Poseidon.hash([Field(10810197102n), Field(record.user), userSecret.toField()]);
    //                              ^ "leaf" as a number
    const baseProof = await compileRangeCheckProgram.base(Field(totalLiabilities));
    return { liabilities: totalLiabilities, blindingFactor: blindingFactor.toBigint(), commitment, hash, rangeProof: baseProof.proof };
}
async function newPaddingNode({ userSecret, blindingFactor, position, compiledRangeCheckProgram }) {
    const bfField = blindingFactor.toField();
    const liability = BigInt(0);
    const commitment = PedersenCommitment.defaultCommitment(liability, bfField);
    // Hash of H("padding" | position | user_salt)
    const hash = Poseidon.hash([Field(11297100100105110103n), ...position.toFields(), userSecret.toField()]);
    //                              ^ "padding" as a number
    const baseProof = await compiledRangeCheckProgram.base(Field(liability));
    return { liabilities: liability, blindingFactor: blindingFactor.toBigint(), commitment, hash, rangeProof: baseProof.proof };
}
async function merge(leftChild, rightChild) {
    const liabilities = leftChild.liabilities + rightChild.liabilities;
    const blidingFactor = leftChild.blindingFactor + rightChild.blindingFactor;
    const commitment = leftChild.commitment.add(rightChild.commitment);
    const hash = Poseidon.hash([...leftChild.commitment.toFields(), ...rightChild.commitment.toFields(), leftChild.hash, rightChild.hash]);
    if (leftChild.rangeProof == null || rightChild.rangeProof == null) {
        throw new Error("One of the children does not have a range proof");
    }
    const { proof } = await rangeCheckProgram.merge(leftChild.rangeProof, rightChild.rangeProof, Field(liabilities));
    return { liabilities, blindingFactor: blidingFactor, commitment, hash, rangeProof: proof };
}
function toPathNode(node) {
    return { commitment: node.commitment, hash: node.hash };
}
function toRedisObject(node) {
    const hash = node.hash.toJSON();
    return {
        liabilities: node.liabilities.toString(),
        blindingFactor: node.blindingFactor.toString(),
        commitmentX: node.commitment.toJSON().x,
        commitmentY: node.commitment.toJSON().y,
        hash,
    };
}
function fromRedisObject(value) {
    const hash = Field(value['hash']);
    const commitment = Group({
        x: Field(value['commitmentX']),
        y: Field(value['commitmentY'])
    });
    const blindingFactor = BigInt(value['blindingFactor']);
    const liabilities = BigInt(value['liabilities']);
    return {
        hash,
        commitment,
        blindingFactor,
        liabilities,
        rangeProof: null
    };
}
function newPadPathNode(params) {
    const bfField = params.blindingFactor.toField();
    const liability = BigInt(0);
    const commitment = PedersenCommitment.defaultCommitment(liability, bfField);
    // Hash of H("padding" | position | user_salt)
    const hash = Poseidon.hash([Field(11297100100105110103n), ...params.position.toFields(), params.userSecret.toField()]);
    //                              ^ "padding" as a number
    return { commitment, hash };
}
function mergePathNodes(left, right) {
    const commitment = left.commitment.add(right.commitment);
    const hash = Poseidon.hash([...left.commitment.toFields(), ...right.commitment.toFields(), left.hash, right.hash]);
    return { commitment, hash };
}
function logNode(msg, node) {
    console.log(msg + "Node: ", node.commitment.toJSON(), node.hash.toJSON());
}
export { newLeaf, newPaddingNode, merge, newPadPathNode, mergePathNodes, toPathNode, toRedisObject, fromRedisObject, logNode };
