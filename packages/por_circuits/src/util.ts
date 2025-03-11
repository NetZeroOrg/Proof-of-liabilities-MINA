import { bech32 } from 'bech32';
import bs58check from 'bs58check';
import { Field } from 'o1js';
import { addressInfo } from './balance.js';
import axios from 'axios';
import { MOBUAL_API } from './api.js';

export type addressType = "base58" | "bech32";

/**
 *  Converts a field element to a Bitcoin address 
 * @param field - the field element to convert
 */
export const fieldToBtcAddress = (field: Field, extraZeroes: string, type: addressType, witnessVersion: number = 0): string => {
    const buffer = Buffer.from(extraZeroes + field.toBigInt().toString(16), 'hex');
    if (type === "bech32") {
        const words = bech32.toWords(buffer);
        words.unshift(witnessVersion);
        return bech32.encode("bc", words);
    }
    return bs58check.encode(buffer);
}

/**
 * Converts a btc address to a field element
 * @param address The address to convert
 * @returns The field element and the extra zeroes 
 */
export const btcAddressToField = (address: string): addressInfo => {
    let type: addressType = "base58";
    let hex = "";
    let field = Field(0);
    let wintessVersion: number | undefined;
    if (address.startsWith("bc1")) {
        type = "bech32";
        const decoed = bech32.decode(address)
        wintessVersion = decoed.words[0];
        const words = bech32.fromWords(decoed.words.slice(1))
        hex = Buffer.from(words).toString("hex");
        console.log(hex)
        const bigint = BigInt("0x" + hex);
        field = Field(bigint)
    } else {
        const decoded = bs58check.decode(address);
        hex = Buffer.from(decoded).toString("hex");
        const bigint = BigInt("0x" + hex);
        field = Field(bigint);
    }

    // While converting to bigint if the hex starts with "00" then we need to remember to add it back
    // as the bigint will not have the leading zeroes when we convert back from the field element
    let extraZeroes = "";
    while (true) {
        if (hex.startsWith("0")) {
            extraZeroes += "0";
            hex = hex.slice(1);
        } else {
            break;
        }
    }
    if (wintessVersion) {
        return {
            address: field,
            zeroes: extraZeroes,
            type,
            witness: wintessVersion
        };
    }
    return {
        address: field,
        zeroes: extraZeroes,
        type
    };
}


export const getPrice = async (symbol: string): Promise<number> => {
    const request = await axios.get(MOBUAL_API(symbol), {
        headers: {
            'accept': 'application/json',
        }
    });
    return request.data.data.price
}