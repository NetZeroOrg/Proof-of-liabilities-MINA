// mina_keys.js
// This script generates a specified number of Mina key pairs (private and public keys),
// saves them to a file, and creates a superset of addresses with random balances.

import fs from 'fs';
import { PrivateKey } from 'o1js';
import { Client } from 'mina-signer';

const client = new Client({ network: "testnet" })

// Get command line arguments
const args = process.argv.slice(2);
console.log(args)
// Get the number of assets from the command line arguments
if (args.length < 3) {
    console.error('Usage: node mina_keys.js <output_file> <num_keypairs> <num_assets>');
    process.exit(1);
}

const numAssets = parseInt(args[2], 10);
if (isNaN(numAssets) || numAssets <= 0) {
    console.error('Please provide a valid number of assets.');
    process.exit(1);
}

const outputFile = args[0];
const numKeyPairs = parseInt(args[1], 10);

if (isNaN(numKeyPairs) || numKeyPairs <= 0) {
    console.error('Please provide a valid number of key pairs.');
    process.exit(1);
}

const message = process.env!.SECRET_MESSAGE!.split(' ').map((m) => {
    const charCode = m.charCodeAt(0);
    return BigInt(charCode);
})

// Generate key pairs and save to file
const pkNullifierPairs = [];
for (let i = 0; i < numKeyPairs; i++) {
    const privateKey = PrivateKey.random();
    const publicKey = privateKey.toPublicKey();
    const nullifier = client.createNullifier(message, privateKey.toBase58());
    pkNullifierPairs.push({
        publicKey,
        nullifier
    });
}
// Add headers and write to file
fs.writeFileSync(`${outputFile}.json`, JSON.stringify(pkNullifierPairs, null, 2), 'utf8');
console.log(`Successfully saved ${numKeyPairs} key pairs to ${outputFile}`);
const outputFileSuperset = `${outputFile}_asset.csv`;



// Generate superset of addresses with balances
const supersetAddresses = new Set(pkNullifierPairs.map(pair => pair.publicKey.toBase58())); // Start with public keys from keyPairs
while (supersetAddresses.size < numKeyPairs * 2) {
    const randomPrivateKey = PrivateKey.random();
    const randomPublicKey = randomPrivateKey.toPublicKey().toBase58();
    supersetAddresses.add(randomPublicKey);
}

// Assign balances for multiple assets to all addresses
const addressesWithBalances = Array.from(supersetAddresses).map(address => {
    // inflated for testing
    const balances = Array.from({ length: numAssets }, () => Math.floor(Math.random() * 100000) + 10000); // Random balances between 1 and 100000
    return `${address},${balances.join(',')}`;
});

// Add headers and write the superset file
const headers = ['PublicKey', ...Array.from({ length: numAssets }, (_, i) => `Asset${i + 1}`)];
const addressesWithBalancesWithHeader = [headers.join(','), ...addressesWithBalances];
fs.writeFileSync(outputFileSuperset, addressesWithBalancesWithHeader.join('\n'), 'utf8');
console.log(`Successfully saved ${supersetAddresses.size} addresses with balances for ${numAssets} assets to ${outputFileSuperset}`);
