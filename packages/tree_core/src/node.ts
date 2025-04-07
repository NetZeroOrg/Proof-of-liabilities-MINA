import { Field, Group, Poseidon } from "o1js";
import { newLeafParams, newPaddingNodeParams, newPaddingPathNode, Nullable } from "./types.js";
import { PedersenCommitment } from "./commitment.js";
import { rangeCheckProgram, RangeCheckProof } from "@netzero/circuits/dist/index.js"

export interface Node {
    liabilities: bigint;
    blindingFactor: bigint;
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
    return { liabilities: totalLiabilities, blindingFactor: blindingFactor.toBigint(), commitment, hash, rangeProof: baseProof.proof };
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
    return { liabilities: liability, blindingFactor: blindingFactor.toBigint(), commitment, hash, rangeProof: baseProof.proof };
}

async function merge(leftChild: Node, rightChild: Node): Promise<Node> {
    console.log("leftChild: ", leftChild.liabilities)
    console.log("rightChild: ", rightChild.liabilities)
    console.log("leftChild: ", leftChild.blindingFactor)
    console.log("rightChild: ", rightChild.blindingFactor)
    const liabilities = leftChild.liabilities + rightChild.liabilities
    const blidingFactor = leftChild.blindingFactor + rightChild.blindingFactor

    const commitment = leftChild.commitment.add(rightChild.commitment);
    const hash = Poseidon.hash([...leftChild.commitment.toFields(), ...rightChild.commitment.toFields(), leftChild.hash, rightChild.hash]);
    if (leftChild.rangeProof == null || rightChild.rangeProof == null) {
        throw new Error("One of the children does not have a range proof")
    }
    // sanity check
    const computedCommitment = Group.generator.scale(liabilities).add(Poseidon.hashToGroup(Group.generator.toFields()).scale(blidingFactor));
    console.log("computedCommitment: ", computedCommitment.toJSON())
    console.log("commitment: ", commitment.toJSON())
    console.log(commitment.equals(computedCommitment).toJSON())
    const { proof } = await rangeCheckProgram.merge(leftChild.rangeProof, rightChild.rangeProof, Field(liabilities));
    return { liabilities, blindingFactor: blidingFactor, commitment, hash, rangeProof: proof };
}

function toPathNode(node: Node): PathNode {
    return { commitment: node.commitment, hash: node.hash };
}

function toRedisObject(node: Node) {

    const hash = node.hash.toJSON()
    return {
        liabilities: node.liabilities.toString(),
        blindingFactor: node.blindingFactor.toString(),
        commitmentX: node.commitment.toJSON().x,
        commitmentY: node.commitment.toJSON().y,
        hash,
    };
}

function fromRedisObject(
    value: {
        [x: string]: string;
    }
): Node {
    const hash = Field(value['hash']!)
    const commitment = Group({
        x: Field(value['commitmentX']!),
        y: Field(value['commitmentY']!)
    })
    const blindingFactor = BigInt(value['blindingFactor']!)
    const liabilities = BigInt(value['liabilities']!)

    return {
        hash,
        commitment,
        blindingFactor,
        liabilities,
        rangeProof: null
    }
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

function logNode(msg: string, node: Node | PathNode) {
    console.log(msg + "Node: ", node.commitment.toJSON(), node.hash.toJSON())
}


export { newLeaf, newPaddingNode, merge, newPadPathNode, mergePathNodes, toPathNode, toRedisObject, fromRedisObject, logNode };