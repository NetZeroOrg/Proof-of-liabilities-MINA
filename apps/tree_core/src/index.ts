#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { createRandomDataTree } from "./dummyDataScript.js";

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
