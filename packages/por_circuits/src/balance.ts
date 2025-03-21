/// Looks up the balance for a given address from bit query

import { Field } from "o1js"
import axios from "axios";
import { addressType, btcAddressToField, fieldToBtcAddress, getPrice } from "./util.js";

export const SCALING_FACTOR = 1e3
export type addressInfo = {
  address: Field
  zeroes?: string
  type?: addressType
  witness?: number
}

/**
 * Finds the balance for a given address
 * @param _address The address to find the balance for
 * @returns The balance of the address in the field scaled by SCALING_FACTOR
 */
const findBitcoinBalance = async (_address: addressInfo[]): Promise<Field[]> => {
  console.log("Finding balance for address: ", _address.toString())
  //TODO: add automatic access token generation
  const accessToken = process.env.BITQUERY_ACCESS_TOKEN
  const X_API_KEY = process.env.BITQUERY_API_KEY
  if (!accessToken) throw new Error("Missing BITQUERY_ACCESS_TOKEN")
  if (!X_API_KEY) throw new Error("Missing BIT_QUERY_API_KEY")

  const address = _address.map(({ address, zeroes, type, witness }, index) => fieldToBtcAddress(address, zeroes!, type!, witness))
  console.log(address)
  const query = `
    query GetBitcoinAddressStats($arr: [String!]) {
      bitcoin {
        addressStats(
          address: {in: $arr}
        ) {
          address {
            balance
          }
        }
      }
    }
  `;

  const data = JSON.stringify({
    query: query,
    variables: {
      arr: address
    }
  });

  console.log(data)
  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://graphql.bitquery.io',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-API-KEY': X_API_KEY
    },
    data: data
  };
  const response = await axios(config);
  console.log(response.data.data.addressStats)
  const price = await getPrice("BTC")
  const balance = response.data.data.bitcoin.addressStats.map((stat: any) => Math.floor(stat.address.balance * price * SCALING_FACTOR))
  return balance
}

export const assetMap: {
  [key: number]: (address: addressInfo[]) => Promise<Field[]>
} = {
  1: (address: addressInfo[]) => findBitcoinBalance(address)
}