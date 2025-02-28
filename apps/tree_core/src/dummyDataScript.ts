import { rangeCheckProgram } from "circuits/dist/index.js";
import { randomBytes32 } from "./bytes.js";
import { Height } from "./position.js";
import { TreeBuilder, TreeParams } from "./treeBuilder.js";
import { DBRecord, FixedLengthArray } from "./types.js";
import crypto from 'crypto';
import fs from 'fs';
function generateRandomEmail(): string {
    const domains = ["gmail.com", "yahoo.com", "outlook.com", "example.com"];
    const name = Math.random().toString(36).substring(2, 12);
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const email = `${name}@${domain}`;
    const hash = crypto.createHash('sha256').update(email).digest('hex');
    return BigInt('0x' + hash).toString();
}

function generateAssetData(numUsers: number, numAssets: number, outputFile: string = "data.json"): string[][] {
    const assetNames = Array.from({ length: numAssets }, (_, i) => `Asset_${i + 1}`);
    const headers = ["UserEmail", ...assetNames]; // Explicit headers

    const data = Array.from({ length: numUsers }, () => {
        const userEmail = generateRandomEmail();
        const assetValues = Array.from({ length: numAssets }, () => (Math.floor(Math.random() * 10000) + 1).toFixed(2));
        return [userEmail, ...assetValues]; // Data stored in array format for consistency with headers
    });

    const output = { headers, data };

    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`Data generation complete. File saved as '${outputFile}'.`);

    return data;
}


export async function createRandomDataTree(
    numUsers: number,
    numAssets: number,
    redisConnectionURL?: string
) {
    const data = generateAssetData(numUsers, numAssets);
    const records = data.map((data) => {
        const user = data[0]!;
        const balances = data.slice(1).map((balance) => parseInt(balance)) as unknown as FixedLengthArray<number, 10>;
        return { user, balances } as DBRecord<10>;
    })
    const height = new Height(Math.floor(Math.log2(numUsers)) + 2)
    const treeParams: TreeParams = {
        masterSecret: randomBytes32(),
        saltB: randomBytes32(),
        saltS: randomBytes32()
    }
    const treeBuilder = new TreeBuilder(records, height, treeParams)
    console.time("Program Build Time")
    await rangeCheckProgram.compile()
    console.timeEnd("Program Build Time")
    console.time("Tree Build Time")
    const [store,] = await treeBuilder.buildSingleThreaded(rangeCheckProgram, true)
    console.timeEnd("Tree Build Time")
    console.time("Save Time")
    await store.save(redisConnectionURL)
    console.timeEnd("Save Time")
}

