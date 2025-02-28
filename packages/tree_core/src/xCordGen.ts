import { randomInt } from 'crypto';

export class XCordGenerator {
    private xCords: Map<number, number>;
    private maxXCord: number;
    private i: number;

    constructor(maxNodes: number) {
        this.xCords = new Map<number, number>();
        this.maxXCord = maxNodes;
        this.i = 0;
    }

    public genXCord(): number {
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

    public flush(): void {
        this.i = 0;
        this.xCords.clear();
    }
}
