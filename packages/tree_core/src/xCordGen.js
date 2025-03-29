import { randomInt } from 'crypto';
export class XCordGenerator {
    constructor(maxNodes) {
        this.xCords = new Map();
        this.maxXCord = maxNodes;
        this.i = 0;
    }
    genXCord() {
        if (this.i >= this.maxXCord) {
            throw new Error(`Max number of nodes reached: ${this.maxXCord}`);
        }
        const randomX = randomInt(this.i, this.maxXCord);
        let x = this.xCords.get(randomX);
        while (x !== undefined && this.xCords.has(x)) {
            x = this.xCords.get(x);
        }
        if (x === undefined) {
            x = randomX;
        }
        this.xCords.set(x, this.i);
        this.i += 1;
        return x;
    }
    flush() {
        this.i = 0;
        this.xCords.clear();
    }
}
