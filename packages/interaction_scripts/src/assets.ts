#!/usr/bin/env node
import {
    Field,
    Mina,
    PrivateKey,
    PublicKey,
    Bool,
    NetworkId,
    fetchAccount,
    Nullifier,
    Poseidon,
    Group
} from 'o1js';
import { readFileSync } from 'fs';
import {
    SelectorArrayProof,
    selectorZkProgram,
    proofOfAssetProgram,
    ProofOfAsset,
    PublicAddress,
    Balances,
    ProofOfAssetPublicInput,
    ProofOfAssetsPrivateInput,
    Nullifiers
} from '@netzero/por_circuits';
import Client from 'mina-signer';
import { NetZeroAssetVerifier } from '@netzero/contracts';
import fs from 'fs'
import { randomBytes32 } from 'tree_core';
import { callNetZeroBackend, getTxnUrl } from './utils.js';

const PRECISION = 1e5;

// Post the proofs on chain and verify also save it to json
const fee = 1e9 * 3;
const feePayerPrivKey = process.env.FEEPAYER_PRIVATE_KEY;
if (!feePayerPrivKey)
    throw Error('Missing FEEPAYER_PRIVATE_KEY environment variable.');
const feePayerKey = PrivateKey.fromBase58(feePayerPrivKey);
const feePayer = feePayerKey.toPublicKey();
const networkId = process.env.NETWORK_ID;
if (!networkId)
    throw Error('Missing NETWORK_ID environment variable.');

const MINA_NETWORK_URL = process.env.MINA_NETWORK_URL;
if (!MINA_NETWORK_URL)
    throw Error('Missing MINA_NETWORK_URL environment variable.');

const ASSET_CONTRACT_ADDRESS = process.env.ASSET_CONTRACT_ADDRESS;
console.log("ASSET_CONTRACT_ADDRESS", ASSET_CONTRACT_ADDRESS)
if (!ASSET_CONTRACT_ADDRESS)
    throw Error('Missing ASSET_CONTRACT_ADDRESS environment variable.');

// set up Mina instance and contract we interact with
const Network = Mina.Network({
    // We need to default to the testnet networkId if none is specified for this deploy alias in config.json
    // This is to ensure the backward compatibility.
    networkId: (networkId) as NetworkId,
    mina: MINA_NETWORK_URL,
});
Mina.setActiveInstance(Network);
const feepayerAddress = feePayerKey.toPublicKey();
console.log('Fee payer address:', feepayerAddress);

console.time('selector proof compilation');
await selectorZkProgram.compile()
console.timeEnd('selector proof compilation');



console.time("proof of assets compilation");
await proofOfAssetProgram.compile()
console.timeEnd("proof of assets compilation");

const zkApp = new NetZeroAssetVerifier(PublicKey.fromBase58(ASSET_CONTRACT_ADDRESS))
await fetchAccount({ publicKey: ASSET_CONTRACT_ADDRESS });
console.time("asset verifier compilation");
await NetZeroAssetVerifier.compile()
console.timeEnd("asset verifier compilation");
/**
 * This is a test script in actual the cex will generate .json file with [pk, null]
 * This script is used to generate the proof of assets for a particular round the proof is submitted on chain and is saved and available for download
 * It will read from 2 files
 * - The other file is a csv file that contains the addresses and the balances. The number of entries in the csv file is more than the entries in the keypair file
 * The script will first parse the keypair file and then the address-balance file
 * Then the selector array proof will be generated  and then used to prove the assets values in a zero knowledge way
 * 
 */

const paserNullifier = (keyPairFilePath: string, client: Client): [PublicKey[], Nullifier[]] => {
    // parse the data file
    const nullifierData = JSON.parse(readFileSync(keyPairFilePath, 'utf-8'));
    const pks: PublicKey[] = [];
    const nullifers: Nullifier[] = [];
    nullifierData.forEach((entry: { publicKey: string; nullifier: any }) => {
        pks.push(PublicKey.fromBase58(entry.publicKey));
        nullifers.push(Nullifier.fromJSON(entry.nullifier));
    });
    return [pks, nullifers]
}


const parseAddressBalance = async (addressBalanceFilePath: string, pks: PublicKey[]): Promise<{ addresses: PublicAddress, balances: Field[][], assetValue: BigInt }> => {
    let assetValue = 0n
    // parse the data file
    const csvData = readFileSync(addressBalanceFilePath, "utf-8").split('\n').slice(1);
    const addresses: PublicKey[] = []
    const balances: Field[][] = []
    csvData.map((line) => {
        // There is an assumption that the addresses is already in hex and secret keys are scalars in base 10
        const [publicAddress, ...balancesStr] = line.split(',')
        const pk = PublicKey.fromBase58(publicAddress)
        // bigint conversion because of hex
        addresses.push(PublicKey.fromBase58(publicAddress))

        const balancesScalar = balancesStr.map((b) => BigInt(Math.trunc(Math.floor(Number(b) * PRECISION))))
        let pkContains = false
        for (let i = 0; i < pks.length; i++) {
            if (pk.equals(pks[i]!).toBoolean()) {
                pkContains = true
                break;
            }
        }
        // convert the balance to a field
        const balancesField = balancesScalar.map((b) => {
            if (pkContains) {
                assetValue += b
            }
            return Field(b)
        })

        balances.push(balancesField)
    })

    return { addresses: new PublicAddress({ addresses }), balances, assetValue }
}

const createSelectorArray = (addresses: PublicAddress, pks: PublicKey[]): Bool[] => {
    const selectorArray: Bool[] = []
    for (let i = 0; i < addresses.addresses.length; i++) {
        let isIn = Bool(false)
        for (let j = 0; j < pks.length; j++) {
            isIn = isIn.or(pks[j].equals(addresses.addresses[i]!))
            if (isIn.toBoolean()) {
                break;
            }
        }
        selectorArray.push(isIn)
    }
    return selectorArray
}


/**
 * Generate a proof of selector first and then use it to generate the proof of assets
 */
const generateProofOfAssetsAndVerifyOnChain = async () => {
    const minaKeyPairFile = process.env!.MINA_KEYPAIR_FILE!;
    const minaAssetsFile = process.env!.MINA_ASSETS_FILE!;

    const client = new Client({ network: "testnet" })

    const [minaPks, minaNullfiers] = paserNullifier(minaKeyPairFile, client);
    const nullifiers = new Nullifiers({ nullfiers: minaNullfiers })
    const { addresses: minaAddresses, balances: minaBalances, assetValue } = await parseAddressBalance(minaAssetsFile, minaPks);
    console.log(minaAddresses)
    console.log(assetValue)
    console.time('selector proof generation');
    const { proof: minaSelectorProof } = await selectorZkProgram.selector(
        minaAddresses,
        nullifiers
    )
    console.timeEnd('selector proof generation');
    console.log(minaSelectorProof.publicOutput.toJSON())
    console.time("selector proof onchain commitment")

    const tx = await Mina.transaction(
        { sender: feepayerAddress, fee },
        async () => {
            console.log("verifying selector proof")
            await zkApp.verifyAndSetSelectorCommitment(minaSelectorProof)
        })
    console.log("proving transaction")
    await tx.prove()
    console.timeEnd("selector proof onchain commitment");
    const { hash } = await tx.sign([feePayerKey]).send();
    console.log("Broadcasting proof of execution to the Mina network");
    const selectorTx = getTxnUrl(MINA_NETWORK_URL, hash)
    console.log('Deploy transaction URL:', selectorTx);
    // wait 5 minutes for the transaction to be confirmed
    console.log("waiting for the transaction to be confirmed...");
    await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));

    const selectorArrayCommitment = zkApp.selectorArrayCommitment.get()
    console.log("selector array commitment", selectorArrayCommitment.toJSON())

    const minaPublicInput = new ProofOfAssetPublicInput({
        selectorArrayCommitment: minaSelectorProof.publicOutput,
        address: new PublicAddress({ addresses: minaAddresses.addresses }),
        balances: minaBalances,
    })
    const blidingFactor = randomBytes32(15).toField()
    const minaPrivateInput = new ProofOfAssetsPrivateInput({
        blidingFactor: randomBytes32(15).toField(),
        selectorArray: createSelectorArray(minaAddresses, minaPks),
    })
    console.time('proof of assets generation');
    const { proof: minaProof } = await proofOfAssetProgram.base(
        minaPublicInput,
        minaPrivateInput,
        minaSelectorProof
    )

    console.log(minaProof.publicOutput)
    console.timeEnd('proof of assets generation');

    // Save the proof to a JSON file
    const proofJson = JSON.stringify(minaProof.toJSON(), null, 2);
    const proofFilePath = './minaProof.json';
    fs.writeFileSync(proofFilePath, proofJson);
    console.log(`Proof saved to ${proofFilePath}`);

    console.log("initiating transaction on chain...")
    const tx2 = await Mina.transaction(
        { sender: feepayerAddress, fee },
        async () => {
            console.log("verifying selector proof")
            await zkApp.verifyProofOfAssetAndUpdateCommitment(minaProof)
        })
    console.log("proving transaction")
    await tx2.prove()
    console.timeEnd("selector proof onchain commitment");
    const { hash: hash2 } = await tx2.sign([feePayerKey]).send();
    console.log("Broadcasting proof of execution to the Mina network");
    const txUrl = getTxnUrl(MINA_NETWORK_URL, hash2)
    console.log('Deploy transaction URL:', txUrl);

    const info = {
        blindingFactor: minaPrivateInput.blidingFactor.toString(),
        assetTx: txUrl,
        selectorTx: selectorTx,
        totalAssetValue: assetValue.toString(),
        assetCommitment: minaProof.publicOutput.toJSON()
    }
    // Save the info to a JSON file
    const infoJson = JSON.stringify(info, null, 2);
    const infoFilePath = './roundInfo.json';
    fs.writeFileSync(infoFilePath, infoJson);


    // call netzero backend
    callNetZeroBackend(`/exchange/${process.env.EXCHANGE_ID}/round/assets/end`, {
        endTime: new Date().toISOString(),
        txnUrl: txUrl,
    })
}
generateProofOfAssetsAndVerifyOnChain()