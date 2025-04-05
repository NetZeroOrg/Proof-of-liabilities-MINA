import {
    Field,
    Mina,
    PrivateKey,
    PublicKey,
    Bool,
    Group,
    Poseidon,
    NetworkId
} from 'o1js';
import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import {
    SelectorArrayProof,
    selectorZkProgram,
    proofOfAssetProgram,
    ProofOfAsset,
    SecretKeys,
    PublicAddress,
    Balances,
    ProofOFAssetPublicInput,
    ProofOfAssetsPrivateInput
} from './index.js';



/**
 * 
 * This script is used to generate the proof of assets for a particular round the proof is submitted on chain and is saved and available for download
 * It will read from 2 files
 * - One file is a keypair file that contains the public and private keys
 * - The other file is a csv file that contains the addresses and the balances. The number of entries in the csv file is more than the entries in the keypair file
 * The script will first parse the keypair file and then the address-balance file
 * Then the selector array proof will be generated  and then used to prove the assets values in a zero knowledge way
 * 
 */

// parse the keypair file
const parseKeyPairs = (keyPairFilePath: string): [Field[], SecretKeys] => {
    // parse the data file
    const csvData = fs.readFileSync(keyPairFilePath, "utf-8").split('\n').slice(1);

    const [pks, secretKeys] = csvData.map((line) => {
        // There is an assumption that the addresses is already in hex and secret keys are scalars in base 10
        const [publicAddress, secretKey] = line.split(',')
        return [Field(BigInt(publicAddress)), Field(BigInt(secretKey))]
    })
    return [pks, new SecretKeys({ secretKeys })]
}


const parseAddressBalance = (addressBalanceFilePath: string): [PublicAddress, Balances] => {
    // parse the data file
    const csvData = fs.readFileSync(addressBalanceFilePath, "utf-8").split('\n').slice(1);
    const addresses: Field[] = []
    const balances: Field[][] = []
    csvData.map((line) => {
        // There is an assumption that the addresses is already in hex and secret keys are scalars in base 10
        const [publicAddress, ...balance] = line.split(',')
        // bigint conversion because of hex
        addresses.push(Field(BigInt(publicAddress)))
        // convert the balance to a field
        const balancesField = balance.map((b) => Field(b))
        balances.push(balancesField)
    })
    return [new PublicAddress({ addresses }), new Balances({ balances })]
}

const createSelectorArray = (addresses: PublicAddress, pks: Field[]): Bool[] => {
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
    const ethereumKeyPairFile = process.env!.ETHEREUM_KEYPAIR_FILE!;
    const minaKeyPairFile = process.env!.MINA_KEYPAIR_FILE!;
    const ethereumAssetsFile = process.env!.ETHEREUM_ASSETS_FILE!;
    const minaAssetsFile = process.env!.MINA_ASSETS_FILE!;


    const [ethPks, ethSecretKeys] = parseKeyPairs(ethereumKeyPairFile);
    const [ethAddressesAssets, ethBalances] = parseAddressBalance(ethereumAssetsFile);
    const [minaPks, minaSecretKeys] = parseKeyPairs(minaKeyPairFile);
    const [minaAddresses, minaBalances] = parseAddressBalance(minaAssetsFile);

    const { proof: etherumSelectorProof } = await selectorZkProgram.ethereum(
        ethAddressesAssets,
        ethSecretKeys
    )

    const { proof: minaSelectorProof } = await selectorZkProgram.mina(
        minaAddresses,
        minaSecretKeys
    )


    const poaEthereumPublicInput = new ProofOFAssetPublicInput({
        addresses: ethAddressesAssets.addresses,
        balances: ethBalances.balances,
        selectorArrayCommitment: etherumSelectorProof.publicOutput
    })

    const poaEthereumPrivateInput = new ProofOfAssetsPrivateInput({
        selectorArray: createSelectorArray(ethAddressesAssets, ethPks),
        blidingFactor: Field.random()
    })

    const poaEthereumProof = await proofOfAssetProgram.base(
        poaEthereumPublicInput,
        poaEthereumPrivateInput,
        etherumSelectorProof
    )


    const minaPublicInput = new ProofOFAssetPublicInput({
        addresses: minaAddresses.addresses,
        balances: minaBalances.balances,
        selectorArrayCommitment: minaSelectorProof.publicOutput
    })

    const minaPrivateInput = new ProofOfAssetsPrivateInput({
        selectorArray: createSelectorArray(minaAddresses, minaPks),
        blidingFactor: Field.random()
    })

    const minaProof = await proofOfAssetProgram.base(
        minaPublicInput,
        minaPrivateInput,
        minaSelectorProof
    )

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

    const zkApp = new NetZero(PublicKey.fromBase58(CONTRACT_ADDRESS))
    await fetchAccount({ publicKey: CONTRACT_ADDRESS });
    // compile the contract and programs
    await InclusionProofProgram.compile()
    await NetZeroLiabilitiesVerifier.compile()

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
}
