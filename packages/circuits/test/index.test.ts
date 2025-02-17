import { addTwoNumbersProgram } from "../src/programs/addTwoNumbers"

describe("Add two number test", () => {
    it("Should compile", async () => {
        const { verificationKey } = await addTwoNumbersProgram.compile()
        console.log(verificationKey)
    })
})