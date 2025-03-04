import { fetchAccount, Field, Group, method, Provable, PublicKey, SmartContract, State, state } from "o1js";
import { InclusionProof } from "circuits/dist/index.js"



export class NetZeroVerifier extends SmartContract {
  // The root hash of the liabilites tree
  @state(Field) rootHash = State<Field>()

  // the root commitment for the liabilites tree
  @state(Group) rootCommitment = State<Group>()

  // Public paramter for derivation of bliding factors and user secret 
  @state(Field) saltS = State<Field>()
  @state(Field) saltB = State<Field>()

  // The admin of that is allowed to update the public parameters
  @state(PublicKey) admin = State<PublicKey>()

  init(): void {
    super.init()
    this.rootHash.set(Field(0))
    this.saltB.set(Field(0))
    this.saltS.set(Field(0))
    Provable.log(this.sender.getAndRequireSignature())
    this.admin.set(this.sender.getAndRequireSignature())
  }

  @method async setAdmin(admin: PublicKey) {
    Provable.log(this.sender.getAndRequireSignature())
    this.sender.getAndRequireSignature().assertEquals(this.admin.getAndRequireEquals())
    this.admin.set(admin)
  }

  @method async setPublicParameters(saltS: Field, saltB: Field) {
    this.sender.getAndRequireSignature().assertEquals(this.admin.getAndRequireEquals())
    this.saltB.set(saltB)
    this.saltS.set(saltS)
  }

  @method async setRoot(rootHash: Field, rootCommitment: Group) {
    this.sender.getAndRequireSignature().assertEquals(this.admin.getAndRequireEquals())
    this.rootHash.set(rootHash)
    this.rootCommitment.set(rootCommitment)
  }

  @method async verifySolvency(proof: InclusionProof) {
    proof.verify()
    const computedRoot = proof.publicOutput;
    computedRoot.hash.assertEquals(this.rootHash.getAndRequireEquals())
    computedRoot.commitment.assertEquals(this.rootCommitment.getAndRequireEquals())
  }

}

