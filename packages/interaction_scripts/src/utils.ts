import axios from "axios";

export function getTxnUrl(graphQlUrl: string, txnHash: string | undefined) {
    const hostName = new URL(graphQlUrl).hostname;
    const txnBroadcastServiceName = hostName
        .split('.')
        .filter((item) => item === 'minascan')?.[0];
    const networkName = graphQlUrl
        .split('/')
        .filter((item) => item === 'mainnet' || item === 'devnet')?.[0];
    if (txnBroadcastServiceName && networkName) {
        return `https://minascan.io/${networkName}/tx/${txnHash}?type=zk-tx`;
    }
    return `Transaction hash: ${txnHash}`;
}


export async function callNetZeroBackend(trailingUrl: string, body: any) {
    const backendUrl = process.env.NET_ZERO_BACKEND;
    if (!process.env.NET_ZERO_BACKEND) {
        throw new Error('Net Zero Backend URL is not defined');
    }
    const apiKey = process.env.NET_ZERO_API_KEY;
    if (!process.env.NET_ZERO_API_KEY) {
        throw new Error('Net Zero API Key is not defined');
    }

    const headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
    };
    try {
        const req = await axios.post(`${backendUrl}${trailingUrl}`, body, {
            headers
        })
        if (req.status !== 200) {
            throw new Error(`Error calling Net Zero Backend: ${req.status}`);
        }
    } catch (error) {
        console.error('Error calling Net Zero Backend:', error);
        throw error;
    }

}