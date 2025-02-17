import { Field } from "o1js";
import { bytes32 } from "./types";

export class Bytes32 {
    data: bytes32

    constructor(data: bytes32) {
        this.data = data
    }

    toNumber(): number {
        let num = 0
        for (let i = 0; i < 32; i++) {
            num += this.data[i] ? 1 << i : 0
        }
        return num
    }

    toField(): Field {
        return Field(this.toNumber())
    }
}