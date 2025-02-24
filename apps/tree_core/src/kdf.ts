import { Bytes32 } from "./bytes";
import crypto from 'crypto';

export function kdf(salt: Bytes32 | null, id: Bytes32 | null, ikm: Bytes32): Bytes32 {
    if (!salt && !id) {
        throw new Error('Salt and id cannot both be null');
    }
    const derivedKey = crypto.hkdfSync('sha256', ikm.toBuffer(), salt?.toBuffer() ?? Buffer.alloc(0), id?.toBuffer() ?? Buffer.alloc(0), 32);
    return Bytes32.fromBuffer(Buffer.from(derivedKey));
}
