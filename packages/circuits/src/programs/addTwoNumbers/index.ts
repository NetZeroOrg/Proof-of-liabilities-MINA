// You can put logic in different files if you want
import { Field, UInt64, ZkProgram } from "o1js";
import { AddTwoNumbersPublicOutptut } from "./types"


async function addTwoNumbers(a: UInt64, b: UInt64): Promise<AddTwoNumbersPublicOutptut> {
    return new AddTwoNumbersPublicOutptut({
        publicOutput: a.add(b)

    })
}

export const addTwoNumbersProgram = ZkProgram({
    publicOutput: UInt64,
    name: "addTwoNumbers",
    methods: {
        addTwoNumbers: {
            privateInputs: [UInt64, UInt64],
            method: addTwoNumbers
        }
    }
})

export class AddTwoNumberProof extends ZkProgram.Proof(addTwoNumbersProgram) { }
