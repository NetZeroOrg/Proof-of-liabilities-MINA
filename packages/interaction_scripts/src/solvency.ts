#!/usr/bin / env node
/**
 * This scripts generates a proof of solvency for a given account
*/

import {
    Mina,
    PrivateKey,
    PublicKey,
    NetworkId,
    fetchAccount,
    Group,
    Poseidon
} from 'o1js';
import { readFileSync } from 'fs';
import {
    proofOfAssetProgram,
    ProofOfAsset,
    proofOfSolvencyProgram,
    ProofOfSolvencyPublicInputs,
    selectorZkProgram,
    ProofOfSolvency
} from '@netzero/por_circuits';
import { ProofOfSolvencyVerifier } from '@netzero/contracts';
import { createClient } from 'redis';
import { rangeCheckProgram, RangeCheckProof } from '@netzero/circuits';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { writeFileSync } from 'fs';
import axios from 'axios';
import { callNetZeroBackend, getTxnUrl } from "./utils.js"
// Post the proofs on chain and verify also save it to json
const fee = 1e9 * 3;
const feePayerPrivKey = process.env.FEEPAYER_PRIVATE_KEY;
if (!feePayerPrivKey)
    throw Error('Missing FEEPAYER_PRIVATE_KEY environment variable.');
const feePayerKey = PrivateKey.fromBase58(feePayerPrivKey);
const feePayer = feePayerKey.toPublicKey();

console.log("FeePayer: ", feePayer.toBase58());

const networkId = process.env.NETWORK_ID;
if (!networkId)
    throw Error('Missing NETWORK_ID environment variable.');

const MINA_NETWORK_URL = process.env.MINA_NETWORK_URL;
if (!MINA_NETWORK_URL)
    throw Error('Missing MINA_NETWORK_URL environment variable.');

const SOLVENCY_CONTRACT_ADDRESS = process.env.SOLVENCY_CONTRACT_ADDRESS;
if (!SOLVENCY_CONTRACT_ADDRESS)
    throw Error('Missing SOLVENCY_CONTRACT_ADDRESS environment variable.');

// set up Mina instance and contract we interact with
const Network = Mina.Network({
    // We need to default to the testnet networkId if none is specified for this deploy alias in config.json
    // This is to ensure the backward compatibility.
    networkId: (networkId) as NetworkId,
    mina: MINA_NETWORK_URL,
});
Mina.setActiveInstance(Network);

Mina.setActiveInstance(Network);
const feepayerAddress = feePayerKey.toPublicKey();
console.log('Fee payer address:', feepayerAddress);

console.time("range check compilation");
await rangeCheckProgram.compile()
console.timeEnd("range check compilation");

console.time("proof of assets compilation");
await selectorZkProgram.compile()
await proofOfAssetProgram.compile()
console.timeEnd("proof of assets compilation");

console.time("proof of solvency compilation");
await proofOfSolvencyProgram.compile()
console.timeEnd("proof of solvency compilation");

console.time("Contract Compilation");
const zkApp = new ProofOfSolvencyVerifier(PublicKey.fromBase58(SOLVENCY_CONTRACT_ADDRESS))
await fetchAccount({ publicKey: SOLVENCY_CONTRACT_ADDRESS });
await ProofOfSolvencyVerifier.compile()
console.timeEnd("Contract Compilation");

//TODO: add deployment stuff later
interface BlindingFactorAndAsssetValue {
    assetBlindingFactor: bigint;
    liabilitiesBlidingFactor: bigint;
    assetValue: bigint;
    liabilitiesValue: bigint;
    liabilitiesCommitment: Group;
    assetCommitment: Group;
}

const getInputs = async (infoFilePath: string, redisConnectionUrl?: string): Promise<BlindingFactorAndAsssetValue> => {
    // read the info file and parse it
    const infoFile = readFileSync(infoFilePath, 'utf8');
    const info = JSON.parse(infoFile);
    console.log(info)
    // get the blinding factors from the info file
    const assetBlindingFactor = BigInt(info.blindingFactor);
    const redisClient = createClient({ url: redisConnectionUrl });
    const assetValue = BigInt(info.totalAssetValue);
    const assetCommitment = Group.fromJSON(info.assetCommitment)

    await redisClient.connect();
    let liabilitiesBlidingFactor = BigInt(0);
    let liabilitiesValue = BigInt(0);
    let liabilitiesCommitment = Group.zero;
    try {
        const redisValue = await redisClient.hGetAll('root')
        if (redisValue) {
            console.log('Redis value:', redisValue);
            liabilitiesBlidingFactor = BigInt(redisValue['blindingFactor']);
            liabilitiesValue = BigInt(redisValue['liabilities']);
            const commitmentX = BigInt(redisValue['commitmentX'])
            const commitmentY = BigInt(redisValue['commitmentY'])
            liabilitiesCommitment = Group.fromJSON({ x: commitmentX, y: commitmentY });

        } else {
            throw new Error('No value found in Redis for key "root"');
        }
    } catch (error) {
        console.error('Error fetching value from Redis:', error);
    } finally {
        await redisClient.disconnect();
    }
    return { assetBlindingFactor, liabilitiesBlidingFactor, assetValue, liabilitiesValue, liabilitiesCommitment, assetCommitment };
}

const readRootProof = async (rootProofFilePath: string): Promise<RangeCheckProof> => {
    // read the proof file and parse it
    const rootProofFile = readFileSync(rootProofFilePath, 'utf8');
    const rootProof = JSON.parse(rootProofFile);
    // get the proof from the proof file
    const proof = await RangeCheckProof.fromJSON(rootProof);
    return proof;
}


const readProofofAsset = async (assetProofPath: string): Promise<ProofOfAsset> => {
    // read the proof file and parse it
    const assetProofFile = readFileSync(assetProofPath, 'utf8');
    const assetProof = JSON.parse(assetProofFile);
    // get the proof from the proof file
    const proof = await ProofOfAsset.fromJSON(assetProof);
    return proof;
}


export const proofOfSolencyRoutine = async () => {
    // const assetProofPath = process.env.ASSET_PROOF_PATH;
    // if (!assetProofPath)
    //     throw Error('Missing ASSET_PROOF_PATH environment variable.');

    // const rootProofPath = process.env.ROOT_PROOF_PATH;
    // if (!rootProofPath)
    //     throw Error('Missing ROOT_PROOF_PATH environment variable.');

    // const infoFilePath = process.env.INFO_FILE_PATH;
    // if (!infoFilePath)
    //     throw Error('Missing INFO_FILE_PATH environment variable.');

    // const redisConnectionUrl = process.env.REDIS_URL;
    // console.log("Redis connection URL: ", redisConnectionUrl)

    // const { assetBlindingFactor, liabilitiesBlidingFactor, assetValue, liabilitiesValue, liabilitiesCommitment, assetCommitment } = await getInputs(infoFilePath, redisConnectionUrl);
    // console.log("liabilitiesCommitment", liabilitiesCommitment.toJSON())
    // const computedLiabilitiesCommitment = Group.generator.scale(liabilitiesValue).add(Poseidon.hashToGroup(Group.generator.toFields()).scale(liabilitiesBlidingFactor));
    // console.log("computedLiabilitiesCommitment", computedLiabilitiesCommitment.toJSON())

    // const computedAsssetCommitment = Group.generator.scale(assetValue).add(Poseidon.hashToGroup(Group.generator.toFields()).scale(assetBlindingFactor));
    // console.log("computedAsssetCommitment", computedAsssetCommitment.toJSON())
    // console.log(
    //     "assetCommitment",
    //     assetCommitment.toJSON(),
    // )
    // const rootProof = await readRootProof(rootProofPath);
    // const assetProof = await readProofofAsset(assetProofPath);


    // const pubIn = new ProofOfSolvencyPublicInputs({
    //     liabilitiesCommitment,
    //     assetsCommitment: assetCommitment,
    // })
    // const { proof } = await proofOfSolvencyProgram.proofOfSolvency(
    //     pubIn,
    //     assetProof,
    //     rootProof,
    //     liabilitiesBlidingFactor,
    //     assetBlindingFactor,
    //     liabilitiesValue,
    //     assetValue
    // )

    // save proof to file for serving
    // const proofFilePath = process.env.PROOF_FILE_PATH || 'proof_of_solvency.json';
    // try {
    //     writeFileSync(proofFilePath, JSON.stringify(proof.toJSON(), null, 2));
    //     console.log(`Proof saved to file: ${proofFilePath}`);
    // } catch (error) {
    //     console.error('Error saving proof to file:', error);
    // }

    // Read the proof from the JSON file
    const proofJsonFilePath = process.env.PROOF_JSON_FILE_PATH || 'proof_of_solvency.json';
    console.log(zkApp.proofOfLiabilitiesVerifier.get().toBase58())
    console.log(zkApp.proofOfAssetsVerifier.get().toBase58())
    try {
        const proofJsonFile = readFileSync(proofJsonFilePath, 'utf8');
        const proofJson = JSON.parse(proofJsonFile);
        const savedProof = await ProofOfSolvency.fromJSON(proofJson);
        const tx = await Mina.transaction(
            { sender: feepayerAddress, fee },
            async () => {
                console.log("verifying selector proof")
                await zkApp.verifyProofOfSolvency(savedProof)
            })
        console.log("proving transaction")
        await tx.prove()
        console.timeEnd("selector proof onchain commitment");
        const { hash } = await tx.sign([feePayerKey]).send();
        console.log("Broadcasting proof of execution to the Mina network");
        console.log('Proof successfully read from file:', proofJsonFilePath);
    } catch (error) {
        console.error('Error reading proof from file:', error);
    }

    // verify on chain

    if (process.env.EXCHANGE_ID)
        console.log("Exchange ID: ", process.env.EXCHANGE_ID)
    // callNetZeroBackend(`/exhanges/${process.env.EXCHANGE_ID}/round/solvency/end`, {
    //     endTime: new Date().toISOString(),
    //     txnUrl: getTxnUrl(MINA_NETWORK_URL, hash),
    // })
}




export const setContractAddresses = async () => {
    // set the contract addresses on chain
    const LIABILITIES_CONTRACT_ADDRESS = process.env.LIABILITIES_CONTRACT_ADDRESS
    console.log(LIABILITIES_CONTRACT_ADDRESS)
    if (!LIABILITIES_CONTRACT_ADDRESS)
        throw Error('Missing LIABILITES_CONTRACT_ADDRESS environment variable.');

    const ASSET_CONTRACT_ADDRESS = process.env.ASSET_CONTRACT_ADDRESS;
    if (!ASSET_CONTRACT_ADDRESS)
        throw Error('Missing ASSET_CONTRACT_ADDRESS environment variable.');

    const liabilitiesVerifier = PublicKey.fromBase58(LIABILITIES_CONTRACT_ADDRESS);
    const assetVerifier = PublicKey.fromBase58(ASSET_CONTRACT_ADDRESS);

    // set on chain
    const tx = await Mina.transaction(
        { sender: feepayerAddress, fee },
        async () => {
            console.log("verifying selector proof")
            await zkApp.setContractAddresses(assetVerifier, liabilitiesVerifier)
        })

    console.log("proving transaction")
    await tx.prove()
    console.timeEnd("selector proof onchain commitment");
    const { hash } = await tx.sign([feePayerKey]).send();
    console.log("Broadcasting proof of execution to the Mina network");
    const selectorTx = getTxnUrl(MINA_NETWORK_URL, hash)
    console.log("Transaction url: ", selectorTx)
}

yargs(hideBin(process.argv))
    .scriptName('solvency-cli')
    .usage('$0 <cmd> [args]')
    .command(
        'set-contracts',
        'Set contract addresses on chain',
        () => { },
        async () => {
            try {
                console.log('Setting contract addresses...');
                await setContractAddresses();
                console.log('Contract addresses set successfully.');
            } catch (error) {
                console.error('Error setting contract addresses:', error);
            }
        }
    )
    .command(
        'proof-of-solvency',
        'Run the proof of solvency routine',
        () => { },
        async () => {
            try {
                console.log('Running proof of solvency routine...');
                await proofOfSolencyRoutine();
                console.log('Proof of solvency routine completed successfully.');
            } catch (error) {
                console.error('Error running proof of solvency routine:', error);
            }
        }
    )
    .demandCommand(1, 'You need to specify at least one command')
    .help()
    .version('1.0.0')
    .argv;