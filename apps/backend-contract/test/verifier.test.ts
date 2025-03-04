import { AccountUpdate, fetchAccount, Field, Mina, PrivateKey, PublicKey } from 'o1js';
import { NetZeroVerifier } from '../src/verifier';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

const proofsEnabled = false;

describe('NetZeroVerifier Tests', () => {
  let deployerAccount: Mina.TestPublicKey,
    deployerKey: PrivateKey,
    senderAccount: Mina.TestPublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: NetZeroVerifier,
    newAdmin: Mina.TestPublicKey,
    newAdminKey: PrivateKey;

  beforeAll(async () => {
    if (proofsEnabled) await NetZeroVerifier.compile();
  });

  beforeEach(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployerAccount, senderAccount, newAdmin] = Local.testAccounts;
    deployerKey = deployerAccount.key;
    senderKey = senderAccount.key;
    newAdminKey = newAdmin.key;

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new NetZeroVerifier(zkAppAddress);
  });

  async function localDeploy() {

  }

  it('generates and deploys the `NetZeroVerifier` smart contract and sets the admin to deployer', async () => {
    const txn1 = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await zkApp.deploy();
    });
    await txn1.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn1.sign([deployerKey, zkAppPrivateKey]).send();
    console.log(deployerAccount.toBase58());
    const admin = zkApp.admin.get();
    expect(admin.toBase58()).toEqual(deployerAccount.toBase58());
    const txn = await Mina.transaction(deployerAccount, async () => {
      await zkApp.setAdmin(newAdmin);
    });
    await txn.prove();
    await txn.sign([deployerKey]).send();

    const updatedAdmin = zkApp.admin.get();
    expect(updatedAdmin.toBase58()).toEqual(newAdmin.toBase58());
  });

});
