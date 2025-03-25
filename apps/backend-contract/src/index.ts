import { InclusionProofProgram } from 'circuits';
import { NetZeroLiabilitiesVerifier } from './polVerifier.js';
import { NetZeroAssetVerifier } from './poaVerifier.js';
import { ProofOfSolvencyVerifier } from './pos.js';
import { AccountUpdate, Mina, PrivateKey } from 'o1js';
export { NetZeroLiabilitiesVerifier, NetZeroAssetVerifier, ProofOfSolvencyVerifier };

const main = async () => {
    console.log("here")
    // setup
    const Local = await Mina.LocalBlockchain();
    Mina.setActiveInstance(Local);

    const sender = Local.testAccounts[0];
    const senderKey = sender.key;
    const zkAppPrivateKey = PrivateKey.random();
    const zkAppAddress = zkAppPrivateKey.toPublicKey();
    const zkApp = new NetZeroLiabilitiesVerifier(zkAppAddress);

    await InclusionProofProgram.compile();

    console.log('Compilig the contract..')
    await NetZeroLiabilitiesVerifier.compile();
    console.log('Compiling the contract done!')
    console.log('Deploying the contract..')
    let tx = await Mina.transaction(sender, async () => {
        AccountUpdate.fundNewAccount(sender);
        await zkApp.deploy();
    });
    await tx.prove();
    await tx.sign([zkAppPrivateKey, senderKey]).send();
    console.log('Deploying the contract done!')
    console.log('Setting the public parameters..')
    console.log(sender.toBase58())
    console.log(zkApp.admin.get().toBase58())
    console.log("Here")

    const newRandomKey = PrivateKey.random();
    const newRandomPublicKey = newRandomKey.toPublicKey();

    let tx2 = await Mina.transaction(sender, async () => {
        await zkApp.setAdmin(newRandomPublicKey)
    })
    await tx2.prove();
    await tx2.sign([senderKey]).send();
    console.log("new admin", newRandomPublicKey.toBase58())
    console.log("actual admin", zkApp.admin.get().toBase58())
}

main()