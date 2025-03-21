import { ProofOfSolvency } from "@netzero/por_circuits/src";
import { Field, method, PublicKey, SmartContract, state, State } from "o1js";
import { NetZeroLiabilitiesVerifier } from "./polVerifier";
import { NetZeroAssetVerifier } from "./poaVerifier";

export class ProofOfSolvencyVerifier extends SmartContract {

    @state(PublicKey) proofOfAssetsVerifier = State<PublicKey>();
    @state(PublicKey) proofOfLiabilitiesVerifier = State<PublicKey>();

    @state(PublicKey) admin = State<PublicKey>();

    @state(Field) verifiedProofs = State<Field>();

    init(): void {
        super.init();
        this.proofOfAssetsVerifier.set(PublicKey.empty());
        this.proofOfLiabilitiesVerifier.set(PublicKey.empty());
        this.admin.set(this.sender.getAndRequireSignature());
    }

    @method async changeAdmin(admin: PublicKey) {
        this.sender.getAndRequireSignature().assertEquals(this.admin.getAndRequireEquals());
        this.admin.set(admin);
    }

    @method async setProofOfAssetsVerifier(proofOfAssetsVerifier: PublicKey) {
        // Verify that the sender is the admin
        this.sender.getAndRequireSignature().assertEquals(this.admin.getAndRequireEquals());
        this.sender.getAndRequireSignature().assertEquals(this.proofOfAssetsVerifier.getAndRequireEquals());
        this.proofOfAssetsVerifier.set(proofOfAssetsVerifier);
    }

    @method async setProofOfLiabilitiesVerifier(proofOfLiabilitiesVerifier: PublicKey) {
        // Verify that the sender is the admin
        this.sender.getAndRequireSignature().assertEquals(this.admin.getAndRequireEquals());
        this.sender.getAndRequireSignature().assertEquals(this.proofOfLiabilitiesVerifier.getAndRequireEquals());
        this.proofOfLiabilitiesVerifier.set(proofOfLiabilitiesVerifier);
    }


    @method async verifyProofOfSolvency(
        proof: ProofOfSolvency
    ) {
        // Verify that the proof was generated with the correct verifier
        proof.verify();

        // verify the public inputs
        const liabilitiesVerifier = new NetZeroLiabilitiesVerifier(this.proofOfLiabilitiesVerifier.getAndRequireEquals());
        proof.publicInput.liabilitiesCommitment.assertEquals(liabilitiesVerifier.rootCommitment.getAndRequireEquals())

        const assetsVerifier = new NetZeroAssetVerifier(this.proofOfAssetsVerifier.getAndRequireEquals());
        proof.publicInput.assetsCommitment.assertEquals(assetsVerifier.assetCommitment.getAndRequireEquals())

        // increment the verified proofs
        const verifiedProofs = this.verifiedProofs.getAndRequireEquals();
        verifiedProofs.assertEquals(verifiedProofs.add(1));
    }
}