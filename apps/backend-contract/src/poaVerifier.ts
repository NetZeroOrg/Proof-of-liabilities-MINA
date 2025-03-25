import { Field, Group, method, Poseidon, PublicKey, SmartContract, state, State } from "o1js";
import { ProofOfAsset } from "@netzero/por_circuits"


export class NetZeroAssetVerifier extends SmartContract {

    // The selector array commitment
    @state(Group) selectorArrayCommitment = State<Group>()

    // The asset balance commitment
    @state(Group) assetCommitment = State<Group>()

    // The public addresses commitment
    @state(Field) publicAddressesCommitment = State<Field>()

    // The public balances commmitment
    @state(Field) publicBalancesCommitment = State<Field>()

    // The admin that is allowed to update the public parameters
    @state(PublicKey) admin = State<PublicKey>()

    init(): void {
        super.init()
        this.selectorArrayCommitment.set(Group.zero)
        this.assetCommitment.set(Group.zero)
        this.admin.set(this.sender.getAndRequireSignature())
    }

    @method async setAdmin(admin: PublicKey) {
        this.sender.getAndRequireSignature().assertEquals(this.admin.getAndRequireEquals())
        this.admin.set(admin)
    }

    @method async setPublicParameters(selectorArrayCommitment: Group, assetCommitment: Group) {
        this.sender.getAndRequireSignature().assertEquals(this.admin.getAndRequireEquals())
        this.selectorArrayCommitment.set(selectorArrayCommitment)
        this.assetCommitment.set(assetCommitment)
    }

    @method async verifyProofOfAssetAndUpdateCommitment(proof: ProofOfAsset) {
        // verify the proof
        proof.verify()

        // verify that the proof was calculated with the commited selector array and public parameters
        proof.publicInput.selectorArrayCommitment.assertEquals(this.selectorArrayCommitment.getAndRequireEquals())
        Poseidon.hash(proof.publicInput.addresses).assertEquals(this.publicAddressesCommitment.getAndRequireEquals())
        Poseidon.hash(proof.publicInput.balances).assertEquals(this.publicBalancesCommitment.getAndRequireEquals())

        // update the asset commitment
        this.assetCommitment.set(proof.publicOutput)
    }
}