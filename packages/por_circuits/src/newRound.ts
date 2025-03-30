import {
    Field,
    Mina,
    PrivateKey,
    PublicKey,
    Bool,
    Group,
    Poseidon
} from 'o1js';
import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import {
    SelectorArrayProof,
    selectorZkProgram,
    proofOfAssetProgram,
    ProofOfAsset
} from './index.js';
import {
    NUM_PUBLIC_ADDRESS,
    NUM_ACTUAL_ADDRESS,
    NUM_ASSETS,
    PublicAddress,
    ProofOFAssetPublicInput,
    ProofOfAssetsPrivateInput,
    SecretKeys
} from './programs/por/types.js';

const dummyDataDir = path.join(process.cwd(), 'src', 'dummy_data');

// Function to read a CSV file and parse its content
const readCSV = async (filePath: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const results: any[] = [];
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
};

// Helper function to convert CSV data to the expected format
const prepareAddressesAndKeys = (keyPairs: any[]): {
    addresses: PublicAddress,
    secretKeys: SecretKeys
} => {
    // Initialize arrays with the correct size
    const addressesArray = Array(NUM_PUBLIC_ADDRESS).fill(Field(0));
    const secretKeysArray = Array(NUM_ACTUAL_ADDRESS).fill(Field(0));

    // Fill arrays with data from CSV
    keyPairs.forEach((pair, index) => {
        if (index < NUM_PUBLIC_ADDRESS) {
            addressesArray[index] = Field(pair.publicKey);
        }
        if (index < NUM_ACTUAL_ADDRESS) {
            secretKeysArray[index] = Field(pair.privateKey);
        }
    });

    return {
        addresses: new PublicAddress({ addresses: addressesArray }),
        secretKeys: new SecretKeys({ secretKeys: secretKeysArray })
    };
};

// Helper function to prepare asset data
const prepareAssetData = (assets: any[]): {
    balances: Field[],
    selectorArray: Bool[]
} => {
    // Initialize arrays with the correct size
    const balancesArray = Array(NUM_PUBLIC_ADDRESS).fill(Field(0));
    const selectorArray = Array(NUM_ASSETS).fill(Bool(false));

    // Fill arrays with data from CSV
    assets.forEach((asset, index) => {
        if (index < NUM_PUBLIC_ADDRESS) {
            balancesArray[index] = Field(asset.balance || 0);
        }
        if (index < NUM_ASSETS && asset.selected === 'true') {
            selectorArray[index] = Bool(true);
        }
    });

    return {
        balances: balancesArray,
        selectorArray: selectorArray
    };
};

// Main function to compile and run the circuit
async function main() {
    console.log('Starting compilation and proof generation...');

    // Step 1: Compile the ZK programs
    console.log('Compiling selector ZK program...');
    await selectorZkProgram.compile();

    console.log('Compiling proof of asset program...');
    await proofOfAssetProgram.compile();

    // Step 2: Read data from CSV files
    const keyPairsFile = path.join(dummyDataDir, 'keypair.csv');
    const assetsFile = path.join(dummyDataDir, 'asset.csv');

    console.log('Reading CSV files...');
    const keyPairs = await readCSV(keyPairsFile);
    const assets = await readCSV(assetsFile);

    // Step 3: Prepare input data
    console.log('Preparing input data...');
    const { addresses, secretKeys } = prepareAddressesAndKeys(keyPairs);
    const { balances, selectorArray } = prepareAssetData(assets);

    // Step 4: Generate the selector array proof (assuming Ethereum addresses)
    console.log('Generating selector array proof...');
    const { proof: selectorProof } = await selectorZkProgram.ethereum(
        addresses,
        secretKeys
    );

    // Step 5: Generate the proof of assets
    console.log('Generating proof of assets...');

    // Create blinding factor
    const blidingFactor = Field.random();

    // Create public input
    const publicInput = new ProofOFAssetPublicInput({
        addresses: addresses.addresses,
        balances: balances,
        selectorArrayCommitment: selectorProof.publicOutput
    });

    // Create private input
    const privateInput = new ProofOfAssetsPrivateInput({
        selectorArray: selectorArray,
        blidingFactor: blidingFactor
    });

    // Generate the proof
    const { proof } = await proofOfAssetProgram.base(
        publicInput,
        privateInput,
        selectorProof
    );

    // Step 6: Verify the proof
    console.log('Verifying proof...');
    const isValid = proof.verify();

    console.log('Proof verification result:', isValid);
    console.log('Public output (commitment):', proof.publicOutput.toString());

    // Optional: Save the proof to a file
    const proofJson = proof.toJSON();
    fs.writeFileSync(
        path.join(process.cwd(), 'proof_output.json'),
        JSON.stringify(proofJson, null, 2)
    );
    console.log('Proof saved to proof_output.json');
}

// Run the main function
main()
    .then(() => {
        console.log('Process completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error occurred:', error);
        process.exit(1);
    });