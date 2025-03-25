/**
 * This script can be used to interact with the Add contract, after deploying it.
 *
 * We call the update() method on the contract, create a proof and send it to the chain.
 * The endpoint that we interact with is read from your config.json.
 *
 * This simulates a user interacting with the zkApp from a browser, except that here, sending the transaction happens
 * from the script and we're using your pre-funded zkApp account to pay the transaction fee. In a real web app, the user's wallet
 * would send the transaction and pay the fee.
 *
 * To run locally:
 * Build the project: `$ npm run build`
 * Run with node:     `$ node build/src/interact.js <deployAlias>`.
 */
import { Mina, NetworkId, PrivateKey, PublicKey } from 'o1js';
import { NetZeroLiabilitiesVerifier } from './polVerifier.js';
import { InclusionProofProgram, rangeCheckProgram } from "circuits";
import fs from 'fs/promises';
import { AccountUpdate } from 'o1js';
import { proofOfAssetProgram, selectorZkProgram, proofOfSolvencyProgram } from '@netzero/por_circuits';
import { NetZeroAssetVerifier } from './poaVerifier.js';
import { ProofOfSolvencyVerifier } from './pos.js';
import path from 'path';

Error.stackTraceLimit = 1000;
const DEFAULT_NETWORK_ID = 'testnet';


// const fee payer address
const feePayerPrivKey = process.env.FEEPAYER_PRIVATE_KEY;
if (!feePayerPrivKey)
  throw Error('Missing FEEPAYER_PRIVATE_KEY environment variable.');

const networkId = process.env.NETWORK_ID;
if (!networkId)
  throw Error('Missing NETWORK_ID environment variable.');

const MINA_NETWORK_URL = process.env.MINA_NETWORK_URL;
if (!MINA_NETWORK_URL)
  throw Error('Missing MINA_NETWORK_URL environment variable.');
// parse config and private key from file

console.log('Fee payer private key:', feePayerPrivKey);
// parse the private key from the environment variable
console.log(networkId)
console.log(MINA_NETWORK_URL)

const feepayerKey = PrivateKey.fromBase58(feePayerPrivKey);

// set up Mina instance and contract we interact with
const Network = Mina.Network({
  // We need to default to the testnet networkId if none is specified for this deploy alias in config.json
  // This is to ensure the backward compatibility.
  networkId: (networkId ?? DEFAULT_NETWORK_ID) as NetworkId,
  mina: MINA_NETWORK_URL,
});

// const Network = Mina.Network(config.url);
const fee = 1e9 * 5; // in nanomina (1 billion = 1.0 mina) thus the fees is 5.0 mina
console.log(fee)
Mina.setActiveInstance(Network);
const feepayerAddress = feepayerKey.toPublicKey();
console.log('Fee payer address:', feepayerAddress);


const deployContract = async (
  feepayerAddress: PublicKey,
  zkApp: NetZeroLiabilitiesVerifier | NetZeroAssetVerifier | ProofOfSolvencyVerifier,
  zkAppPrivKey: PrivateKey,
) => {
  let tx = await Mina.transaction({ sender: feepayerAddress, fee }, async () => {
    AccountUpdate.fundNewAccount(feepayerAddress);
    await zkApp.deploy();
  });
  await tx.prove();
  const sentTx = await tx.sign([zkAppPrivKey, feepayerKey]).send();
  console.log('Deploying the contract done!')
  const deployTxUrl = getTxnUrl(MINA_NETWORK_URL, sentTx.hash)
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
}
console.log("PROOF OF LIABILITIES")
const liabilitiesVerifierKey = PrivateKey.random();
const liabVerifierAddress = liabilitiesVerifierKey.toPublicKey();
const liabVerifierZkApp = new NetZeroLiabilitiesVerifier(liabVerifierAddress);

// load the zkApp and comipile
await InclusionProofProgram.compile();

// compile the contract to create prover keys
console.log('compile the contract...');
await NetZeroLiabilitiesVerifier.compile();


console.log('Deploying the contract..');
// deploy the contract
deployContract(
  feepayerAddress,
  liabVerifierZkApp,
  liabilitiesVerifierKey,
);

console.log("PROOF OF ASSETS")

const AssetVerifierKey = PrivateKey.random();
const assetVerifierAddress = AssetVerifierKey.toPublicKey();
const assetVerifierZkApp = new NetZeroAssetVerifier(assetVerifierAddress);
console.log("Compiling proof of assets programs...")
await selectorZkProgram.compile()
await proofOfAssetProgram.compile();
await NetZeroAssetVerifier.compile();
console.log("Deploying proof of assets programs done!")
deployContract(
  feepayerAddress,
  assetVerifierZkApp,
  AssetVerifierKey,
)

console.log("PROOF OF SOLVENCY")
const posVerifierKey = PrivateKey.random();
const posVerifierAddress = posVerifierKey.toPublicKey();
const posVerifierZkApp = new ProofOfSolvencyVerifier(posVerifierAddress);
console.log("Compiling proof of solvency programs...")
await rangeCheckProgram.compile()
await proofOfSolvencyProgram.compile()
await ProofOfSolvencyVerifier.compile()
console.log("Deploying proof of solvency programs done!")
deployContract(
  feepayerAddress,
  posVerifierZkApp,
  posVerifierKey,
)

const saveKeyToFile = async (fileName: string, privateKey: PrivateKey, publicKey: PublicKey) => {
  const keyData = {
    privateKey: privateKey.toBase58(),
    publicKey: publicKey.toBase58(),
  };
  const filePath = path.join('keys', `${fileName}.json`);
  await fs.writeFile(filePath, JSON.stringify(keyData, null, 2), 'utf8');
  console.log(`Keys saved to ${filePath}`);
};

await saveKeyToFile('liabilitiesVerifier', liabilitiesVerifierKey, liabVerifierAddress);
await saveKeyToFile('assetVerifier', AssetVerifierKey, assetVerifierAddress);
await saveKeyToFile('solvencyVerifier', posVerifierKey, posVerifierAddress);