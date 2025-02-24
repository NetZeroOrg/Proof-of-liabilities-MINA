import { Field, Gadgets, SelfProof, ZkProgram } from "o1js";

export const rangeCheckProgram = ZkProgram({
    name: "range proofs",
    methods: {
        base: {
            privateInputs: [Field],
            /**
             * The libaility sum is a value assumed to be in dollars it is rational to assume
             * that it does not exceeds 2^53 the max number. If the sum is composed of 1000 such
             * assets the sum would not exceed the number 2^(63) thus we can just check if the 
             * total sum is less than 2^64.
             * 
             * @param liabilitySum  The sum of all liabilities in dollars for the particular user
             */
            method: async (liabilitySum: Field) => {
                Gadgets.rangeCheck64(liabilitySum)
            }
        },
        merge: {
            privateInputs: [SelfProof, SelfProof, Field],
            /**
             * This is the aggreagted range check for the liabilities of the user  
             * @param lastProof The previous level proof
             */
            method: async (leftProof: SelfProof<unknown, unknown>, rightProof: SelfProof<unknown, unknown>, newSum: Field) => {
                leftProof.verify()
                rightProof.verify()
                Gadgets.rangeCheck64(newSum)
            }
        }


    }
})


export class RangeCheckProof extends ZkProgram.Proof(rangeCheckProgram) { }