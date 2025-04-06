import { Field, ForeignCurve, Nullifier, Poseidon, PrivateKey, Provable, PublicKey, Scalar } from "o1js";

/**
 * Mimics the createNullifier function from the mina-signer for a for a foreign curve and group
 */
// export { createForeignCurveNullifier };


// function createForeignCurveNullifier(message: AbortController[], sk: bigint, curve: typeof ForeignCurve): Nullifier {
//     const Hash2 = Poseidon.hash;
//     const Hash = Poseidon.hashToGroup;

//     const pk = Provable.witness(ForeignCurve, () => curve.generator.scale(sk));

//     const G = ForeignCurve.generator;

//     // create a random scalar
//     const r = ForeignCurve.Scalar.random();

//     const h_m_pk = Hash([...message, pk.x, pk.y]);
//     return {
//         publicKey: toString(pk),
//         private: {
//             c: c.toString(),
//             g_r: toString(g_r),
//             h_m_pk_r: toString(h_m_pk_r),
//         },
//         public: {
//             nullifier: toString(nullifier),
//             s: s.toString(),
//         },
//     };
// }

