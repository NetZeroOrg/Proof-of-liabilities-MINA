#!/usr/bin/env node

import { InclusionProofProgram, rangeCheckProgram } from "@netzero/circuits";
import { Bytes32, randomBytes32, Height, TreeBuilder, TreeParams, DBRecord, Store } from "tree_core";
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from "crypto";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { NetZeroLiabilitiesVerifier } from "@netzero/contracts"
import { fetchAccount, Mina, NetworkId, PrivateKey, PublicKey } from "o1js";
import { callNetZeroBackend, getTxnUrl } from "./utils.js";

const PRECISION = 1e5


/**
 * This script has the following functionalities
 * 
 * the .env file should have
 * REDIS_URL or defauls to "redis://localhost:6379"
 *
 * DEPLOYER_PRIVATE_KEY
 * CONTRACT_ADDRESS for the liabilities contract
 *  
 * 1. Read user_data.csv and convert it into a `DbRecord` object
 * 2. Create a tree from the `DbRecord` object
 * 3. Save the tree to a Redis database
 * 4. Save the root proof to a JSON file
 * 5. Submit the new root commitment and parameters to the contracts
 */

export async function createTreeAndSetContracts(
    userDataFile: string,
    redisConnectionURL?: string,
    masterSecret?: bigint,
    saltB?: bigint,
    saltS?: bigint,
) {
    console.log(redisConnectionURL)

    const networkId = process.env.NETWORK_ID;
    if (!networkId)
        throw Error('Missing NETWORK_ID environment variable.');

    const feePayerPrivKey = process.env.FEEPAYER_PRIVATE_KEY;
    console.log(feePayerPrivKey)
    if (!feePayerPrivKey)
        throw Error('Missing FEEPAYER_PRIVATE_KEY environment variable.');

    const MINA_NETWORK_URL = process.env.MINA_NETWORK_URL;
    if (!MINA_NETWORK_URL)
        throw Error('Missing MINA_NETWORK_URL environment variable.');

    const LIABILITIES_CONTRACT_ADDRESS = process.env.LIABILITIES_CONTRACT_ADDRESS;
    if (!LIABILITIES_CONTRACT_ADDRESS)
        throw Error('Missing LIABILITIES_CONTRACT_ADDRESS environment variable.');
    console.time("Full flow")
    console.log(userDataFile)
    const csvData = readFileSync(userDataFile, "utf-8");
    console.log(csvData)
    const rows = csvData.split("\n").filter(row => row.trim() !== "");
    const data = rows.map(row => row.split(",").map(cell => cell.trim())).slice(1);
    const records = data.map((row) => {
        const userHash = createHash('sha256').update(row[0]!).digest('hex');
        const user = BigInt('0x' + userHash).toString()
        const balances = row.slice(1).map((balance) => Math.trunc(Math.floor(Number(balance)) * PRECISION))
        return { user, balances } as unknown as DBRecord<typeof balances.length>;
    });

    const height = new Height(Math.floor(Math.log2(data.length)) + 1)

    const treeParams: TreeParams = {
        masterSecret: masterSecret ? Bytes32.fromBigInt(masterSecret) : randomBytes32(12),
        saltB: saltB ? Bytes32.fromBigInt(saltB) : randomBytes32(12),
        saltS: saltS ? Bytes32.fromBigInt(saltS) : randomBytes32(12),
    }


    const treeBuilder = new TreeBuilder(records, height, treeParams)

    console.time("Program Build Time")
    await rangeCheckProgram.compile()
    console.timeEnd("Program Build Time")


    console.time("Tree Build Time")
    const [store,] = await treeBuilder.buildSingleThreaded(rangeCheckProgram, true, redisConnectionURL)
    console.timeEnd("Tree Build Time")

    console.time("Save Time")
    await store.save(redisConnectionURL)
    console.timeEnd("Save Time")

    console.timeEnd("Full flow")
    const rootProof = store.root.rangeProof;
    if (!rootProof) throw new Error("No root proof found")
    const json = rootProof.toJSON()
    writeFileSync("root_proof.json", JSON.stringify(json, null, 2))

    console.log("Setting Public Parameters and Contracts...")

    // submit the new root commitment and parameters to the contracts
    // const fee payer address
    const feepayerKey = PrivateKey.fromBase58(feePayerPrivKey);

    // // set up Mina instance and contract we interact with
    const Network = Mina.Network({
        // We need to default to the testnet networkId if none is specified for this deploy alias in config.json
        // This is to ensure the backward compatibility.
        networkId: (networkId) as NetworkId,
        mina: MINA_NETWORK_URL,
    });

    // const Network = Mina.Network(config.url);
    const fee = 1e9; // in nanomina (1 billion = 1.0 mina) thus the fees is 5.0 mina
    // console.log(fee)
    Mina.setActiveInstance(Network);
    const feepayerAddress = feepayerKey.toPublicKey();
    console.log('Fee payer address:', feepayerAddress);

    const zkApp = new NetZeroLiabilitiesVerifier(PublicKey.fromBase58(LIABILITIES_CONTRACT_ADDRESS))
    await fetchAccount({ publicKey: LIABILITIES_CONTRACT_ADDRESS });
    // compile the contract and programs
    await InclusionProofProgram.compile()
    await NetZeroLiabilitiesVerifier.compile()

    console.log(store.root.commitment.toJSON())
    console.log(store.root.hash.toJSON())
    const tx = await Mina.transaction(
        { sender: feepayerAddress, fee },
        async () => {
            console.log("setting root commitment and parameters")
            await zkApp.setRootAndParams(store.root.hash, store.root.commitment, treeParams.saltB.toField(), treeParams.saltS.toField())
        })
    console.log("proving transaction")
    await tx.prove()

    const { hash } = await tx.sign([feepayerKey]).send();
    console.log("Broadcasting proof of execution to the Mina network");
    const deployTxUrl = getTxnUrl(MINA_NETWORK_URL, hash)
    console.log('Deploy transaction URL:', deployTxUrl);

    function getTxnUrl(graphQlUrl: string, txnHash: string | undefined) {
        const hostName = new URL(graphQlUrl).hostname;
        const txnBroadcastServiceName = hostName
            .split('.')
            .filter((item) => item === 'minascan')?.[0];
        const networkName = graphQlUrl
            .split('/')
            .filter((item) => item === 'mainnet' || item === 'devnet')?.[0];
        if (txnBroadcastServiceName && networkName) {
            return `https://minascan.io/${networkName}/tx/${txnHash}?type=zk-tx`;
        }
        return `Transaction hash: ${txnHash}`;
    }
    if (!process.env.EXCHANGE_ID) {
        throw new Error("Missing EXCHANGE_ID environment variable.");
    }
    // callNetZeroBackend(`/exhanges/${process.env.EXCHANGE_ID}/round/liabilities/end`, {
    //     endTime: new Date().toISOString(),
    //     txnUrl: deployTxUrl,
    // })
}

export const loadStoreAndSetContracts = async (
    redisConnectionURL?: string,
) => {
    const feePayerPrivKey = process.env.FEEPAYER_PRIVATE_KEY;
    if (!feePayerPrivKey)
        throw Error('Missing FEEPAYER_PRIVATE_KEY environment variable.');

    const networkId = process.env.NETWORK_ID;
    if (!networkId)
        throw Error('Missing NETWORK_ID environment variable.');

    const MINA_NETWORK_URL = process.env.MINA_NETWORK_URL;
    if (!MINA_NETWORK_URL)
        throw Error('Missing MINA_NETWORK_URL environment variable.');

    const LIABILITIES_CONTRACT_ADDRESS = process.env.LIABILITIES_CONTRACT_ADDRESS;
    if (!LIABILITIES_CONTRACT_ADDRESS)
        throw Error('Missing CONTRACT_ADDRESS environment variable.');
    const ROOT_PROOF_PATH = process.env!.ROOT_PROOF_PATH;
    if (!ROOT_PROOF_PATH)
        throw Error('Missing ROOT_PROOF_PATH environment variable.');
    console.log(redisConnectionURL)
    // compile the contract and programs
    await InclusionProofProgram.compile()
    await NetZeroLiabilitiesVerifier.compile()
    const store = await Store.loadFromDB(ROOT_PROOF_PATH, redisConnectionURL);
    const rootProof = store.root.rangeProof;
    if (!rootProof) throw new Error("No root proof found")

    // submit the new root commitment and parameters to the contracts
    // const fee payer address
    const feepayerKey = PrivateKey.fromBase58(feePayerPrivKey);

    // // set up Mina instance and contract we interact with
    const Network = Mina.Network({
        // We need to default to the testnet networkId if none is specified for this deploy alias in config.json
        // This is to ensure the backward compatibility.
        networkId: (networkId) as NetworkId,
        mina: MINA_NETWORK_URL,
    });

    // const Network = Mina.Network(config.url);
    const fee = 1e9 * 5; // in nanomina (1 billion = 1.0 mina) thus the fees is 5.0 mina
    // console.log(fee)
    Mina.setActiveInstance(Network);
    const feepayerAddress = feepayerKey.toPublicKey();
    console.log('Fee payer address:', feepayerAddress.toBase58());

    const zkApp = new NetZeroLiabilitiesVerifier(PublicKey.fromBase58(LIABILITIES_CONTRACT_ADDRESS))
    await fetchAccount({ publicKey: LIABILITIES_CONTRACT_ADDRESS });
    const tx = await Mina.transaction(
        { sender: feepayerAddress, fee },
        async () => {
            console.log("setting root commitment and parameters")
            await zkApp.setRootAndParams(store.root.hash, store.root.commitment, store.treeParams.saltB.toField(), store.treeParams.saltS.toField())
        })
    console.log("proving transaction")
    await tx.prove()

    const { hash } = await tx.sign([feepayerKey]).send();
    console.log("Broadcasting proof of execution to the Mina network");
    const deployTxUrl = getTxnUrl(MINA_NETWORK_URL, hash)
    console.log('Deploy transaction URL:', deployTxUrl);

    function getTxnUrl(graphQlUrl: string, txnHash: string | undefined) {
        const hostName = new URL(graphQlUrl).hostname;
        const txnBroadcastServiceName = hostName
            .split('.')
            .filter((item) => item === 'minascan')?.[0];
        const networkName = graphQlUrl
            .split('/')
            .filter((item) => item === 'mainnet' || item === 'devnet')?.[0];
        if (txnBroadcastServiceName && networkName) {
            return `https://minascan.io/${networkName}/tx/${txnHash}?type=zk-tx`;
        }
        return `Transaction hash: ${txnHash}`;
    }

    if (!process.env.EXCHANGE_ID) {
        throw new Error("Missing EXCHANGE_ID environment variable.");
    }
    // callNetZeroBackend(`/exhanges/${process.env.EXCHANGE_ID}/round/liabilities/end`, {
    //     endTime: new Date().toISOString(),
    //     txnUrl: deployTxUrl,
    // })

}

interface Args {
    loadStore: boolean;
    redisConnectionURL?: string;
    masterSecret?: string;
    saltB?: string;
    saltS?: string;
}

const argv = yargs(hideBin(process.argv))
    .option("loadStore", {
        type: "boolean",
        description: "Load the store from the Redis database",
        default: false,
    })
    .option("redisConnectionURL", {
        type: "string",
        description: "The Redis connection URL",
        default: process.env.REDIS_URL || "redis://localhost:6379",
    })
    .option("masterSecret", {
        type: "string",
        description: "The master secret to use for the tree",
        default: undefined,
    })
    .option("saltB", {
        type: "string",
        description: "The saltB to use for the tree",
        default: undefined,
    })
    .option("saltS", {
        type: "string",
        description: "The saltS to use for the tree",
        default: undefined,
    })
    .help()
    .alias("help", "h")
    .parseSync() as Args;

await (async () => {
    try {
        const MINA_NETWORK_URL = process.env.MINA_NETWORK_URL;
        if (!process.env.EXCHANGE_ID) {
            throw new Error("Missing EXCHANGE_ID environment variable.");
        }
        // callNetZeroBackend(`/exhanges/${process.env.EXCHANGE_ID}/round/liabilities/start`, {})
        if (argv.loadStore) {
            console.log("Loading store from Redis database...");
            await loadStoreAndSetContracts(process.env.REDIS_URL);
            console.log("Store loaded and contracts set successfully.");
        } else {
            const userDataFile = process.env.USER_DATA_FILE;
            if (!userDataFile)
                throw Error('Missing USER_DATA_FILE environment variable.');
            await createTreeAndSetContracts(
                userDataFile,
                argv.redisConnectionURL,
                argv.masterSecret ? BigInt(argv.masterSecret) : undefined,
                argv.saltB ? BigInt(argv.saltB) : undefined,
                argv.saltS ? BigInt(argv.saltS) : undefined,
            );
            console.log("Tree Creation and contracts set successfully.");
        }
    } catch (error) {
        console.error("Error creating random data tree:", error);
        process.exit(1); // Exit with error code
    }
    process.exit(0); // Exit successfully
})();


