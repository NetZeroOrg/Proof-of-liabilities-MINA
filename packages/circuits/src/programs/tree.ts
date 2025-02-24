import { Field, Group, Struct, UInt32 } from "o1js";
import { DynamicArray } from "mina-attestations"

export class BalanceArray extends DynamicArray(Field, { maxLength: 500 }) { }

export class TreeNode extends Struct({
    hash: Field,
    commitment: Group,
}) { }

export class HashPathArray extends DynamicArray(Field, { maxLength: 500 }) { }
/**
 * This is the user record that is stored in the tree
 * @param userId The user id
 * @param balances The balances of the user
 */
export class UserRecord extends Struct({
    userId: Field,
    balances: BalanceArray
}) { }

export class TreeUpdateInputs extends Struct({
    user: UserRecord,
    operation: Field
}) { }

/**
 * Performs the sum for any two leaf nodes in the tree
 * @param leftBalances The balances of the left Child 
 * @param rightBalances The bnalces of the right child
 * @returns The output of the sum
 */
export const sumProofLeaf = (leftBalances: BalanceArray, rightBalances: BalanceArray): Field => {
    leftBalances.length.assertEquals(rightBalances.length)
    let index = new UInt32(0)
    let output = new Field(0)
    const leftLength = new UInt32(leftBalances.length.value)
    while (index.lessThan(leftLength)) {
        output = output.add(leftBalances.get(index).add(rightBalances.get(index)))
        index = index.add(1)
    }
    return output
}


export class InclusionProof extends Struct({

}) { }

