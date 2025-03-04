#!/usr/bin/env node

import { rangeCheckProgram } from "circuits/dist/index.js";
import { randomBytes32 } from "./bytes.js";
import { Height } from "./position.js";
import { TreeBuilder, TreeParams } from "./treeBuilder.js";
import { DBRecord, FixedLengthArray } from "./types.js";
import crypto from 'crypto';
import fs from 'fs';

import yargs from "yargs";
import { hideBin } from "yargs/helpers";


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
        const posOrNeg = Math.round(Math.random()) * 2 - 1
        const assetValues = Array.from({ length: numAssets }, () => ((posOrNeg * Math.floor(Math.random() * 10000) + 1)).toFixed(2));
        return [userEmail, ...assetValues]; // Data stored in array format for consistency with headers
    });
    const output = { headers, data };
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    return data;
}


export async function createRandomDataTree(
    numUsers: number,
    numAssets: number,
    redisConnectionURL?: string
) {
    console.time("Full flow")
    const data = generateAssetData(numUsers, numAssets);
    const records = data.map((data) => {
        const user = data[0]!;
        const balances = data.slice(1).map((balance) => Number(balance)) as unknown as FixedLengthArray<number, 10>;
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
    console.timeEnd("Full flow")
    const rootProof = store.root.rangeProof;
    if (!rootProof) throw new Error("No root proof found")
    const json = rootProof.toJSON()
    fs.writeFileSync("root_proof.json", JSON.stringify(json, null, 2))
}

interface Args {
    numUsers: number;
    numAssets: number;
    redisConnectionURL?: string;
}

const argv = yargs(hideBin(process.argv))
    .option("numUsers", {
        type: "number",
        description: "Number of users",
        demandOption: true,
    })
    .option("numAssets", {
        type: "number",
        description: "Number of assets",
        demandOption: true,
    })
    .option("redisConnectionURL", {
        type: "string",
        description: "Redis connection URL",
    })
    .help()
    .alias("help", "h")
    .parseSync() as Args;

(async () => {
    try {
        await createRandomDataTree(argv.numUsers, argv.numAssets, argv.redisConnectionURL);
        console.log("Random data tree created successfully.");
    } catch (error) {
        console.error("Error creating random data tree:", error);
    }
})();

