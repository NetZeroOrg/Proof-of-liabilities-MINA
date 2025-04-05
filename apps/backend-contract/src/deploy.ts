import { AccountUpdate, AccountUpdateTree, Mina, NetworkId, PrivateKey, PublicKey } from 'o1js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { NetZeroLiabilitiesVerifier } from './polVerifier.js';
import { InclusionProofProgram, rangeCheckProgram } from '@netzero/circuits';
import { NetZeroAssetVerifier } from './poaVerifier.js';
import { ProofOfSolvencyVerifier } from './pos.js';
import { proofOfAssetProgram, proofOfSolvencyProgram, selectorZkProgram } from '@netzero/por_circuits';
import path from 'path';
import fs from 'fs/promises'


Error.stackTraceLimit = 1000;
const DEFAULT_NETWORK_ID = 'testnet';

interface DeployArgs {
  deployOnly?: "liabilities" | "assets" | "solvency";
}

const argv = yargs(hideBin(process.argv))
  .option('deploy-only', {
    alias: 'd',
    type: 'string',
    description: 'Deploy only the specified contract (liabilities, assets, solvency)',
    choices: ['liabilities', 'assets', 'solvency'],
  })
  .help()
  .parseSync() as DeployArgs;

const deployOnly = argv['deployOnly'];

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

const saveKeyToFile = async (fileName: string, privateKey: PrivateKey, publicKey: PublicKey) => {
  const keyData = {
    privateKey: privateKey.toBase58(),
    publicKey: publicKey.toBase58(),
  };
  const filePath = path.join('keys', `${fileName}.json`);
  await fs.writeFile(filePath, JSON.stringify(keyData, null, 2), 'utf8');
  console.log(`Keys saved to ${filePath}`);
};



const deployLiabilitiesContract = async () => {
  console.log("PROOF OF LIABILITIES");
  const liabilitiesVerifierKey = PrivateKey.random();
  const liabVerifierAddress = liabilitiesVerifierKey.toPublicKey();
  const liabVerifierZkApp = new NetZeroLiabilitiesVerifier(liabVerifierAddress);
  await InclusionProofProgram.compile();
  console.log('Compiling liabilities contract...');
  await NetZeroLiabilitiesVerifier.compile();

  console.log('Deploying liabilities contract...');
  await deployContract(
    feepayerAddress,
    liabVerifierZkApp,
    liabilitiesVerifierKey,
  );

  await saveKeyToFile('liabilitiesVerifier', liabilitiesVerifierKey, liabVerifierAddress);
};

const deployAssetsContract = async () => {
  console.log("PROOF OF ASSETS");
  const AssetVerifierKey = PrivateKey.random();
  const assetVerifierAddress = AssetVerifierKey.toPublicKey();
  const assetVerifierZkApp = new NetZeroAssetVerifier(assetVerifierAddress);

  if (deployOnly !== 'assets') {
    console.log("Waiting for 6 minutes for deployment...");
    await new Promise((resolve) => setTimeout(resolve, 10 * 60 * 1000));
  }
  console.log("Compiling proof of assets programs...");
  await selectorZkProgram.compile();
  await proofOfAssetProgram.compile();
  await NetZeroAssetVerifier.compile();

  console.log("Deploying proof of assets programs...");
  await deployContract(
    feepayerAddress,
    assetVerifierZkApp,
    AssetVerifierKey,
  );

  await saveKeyToFile('assetVerifier', AssetVerifierKey, assetVerifierAddress);
};

const deploySolvencyContract = async () => {
  console.log("PROOF OF SOLVENCY");
  const posVerifierKey = PrivateKey.random();
  const posVerifierAddress = posVerifierKey.toPublicKey();
  const posVerifierZkApp = new ProofOfSolvencyVerifier(posVerifierAddress);
  if (deployOnly !== 'solvency') {
    console.log("Waiting for 7 minutes for deployment...");
    await new Promise((resolve) => setTimeout(resolve, 10 * 60 * 1000));
  } else {
    await selectorZkProgram.compile()
    await proofOfAssetProgram.compile();
  }
  console.log("Compiling proof of solvency programs...");
  console.time("range check compilation");
  await rangeCheckProgram.compile();
  console.timeEnd("range check compilation");
  await proofOfSolvencyProgram.compile();
  await ProofOfSolvencyVerifier.compile();

  console.log("Deploying proof of solvency programs...");
  await deployContract(
    feepayerAddress,
    posVerifierZkApp,
    posVerifierKey,
  );

  await saveKeyToFile('solvencyVerifier', posVerifierKey, posVerifierAddress);
};

if (deployOnly === 'liabilities') {
  await deployLiabilitiesContract();
} else if (deployOnly === 'assets') {
  await deployAssetsContract();
} else if (deployOnly === 'solvency') {
  await deploySolvencyContract();
} else {
  await deployLiabilitiesContract();
  await deployAssetsContract();
  await deploySolvencyContract();
}

//TODO: send contract addresses to the netzero server
// const netZeroServerUrl = process.env.NETZERO_SERVER_URL;
// if (!netZeroServerUrl)
//   throw Error('Missing NETZERO_SERVER_URL environment variable.');
// const request