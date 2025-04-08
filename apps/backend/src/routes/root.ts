import { FastifyPluginAsync } from 'fastify'
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { readdir, readFile } from 'fs/promises';
import { fileURLToPath } from 'url';

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  let assets: string[] = []
  fastify.get('/', async function (request, reply) {
    return { root: true }
  })

  // returns the assets that the cex have
  fastify.get("/assets", async function (request, reply) {

    console.log("assets", fastify.config.ASSET_DATA_FILE)
    if (assets.length === 0) {
      assets = await new Promise<string[]>((resolve, reject) => {
        fs.createReadStream(fastify.config.ASSET_DATA_FILE)
          .pipe(csv())
          .on('headers', (headers) => {
            resolve(headers.slice(1)); // Skip the first header and return the rest
          })
          .on('error', (err) => reject(err));
      });
    }

    reply.send({ assets });
  })

  fastify.get('/contracts', async function (request, reply) {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const keysDir = path.join(__dirname, "../../..", "backend-contract", "keys");

    const files = await readdir(keysDir);
    const publicKeys: {
      [key: string]: string
    } = {};

    for (const file of files) {
      if (file.endsWith("Verifier.json")) {
        const filePath = path.join(keysDir, file);
        const fileContent = JSON.parse(await readFile(filePath, "utf-8"));
        publicKeys[file.replace(".json", "") as string] = fileContent.publicKey;
      }
    }

    reply.send(publicKeys);
  })


  fastify.get("/downloadProof", async function (request, reply) {
    const path
      = fastify.config.SOLVENCY_PROOF_PATH
    try {
      const proofData = JSON.parse(await readFile(path, "utf-8"));
      reply.send(proofData);
    } catch (error) {
      reply.status(500).send({ error: "Failed to read or parse the solvency proof file." });
    }
  })

  fastify.post("/dispute", async function (request, reply) {
    const { user, assetAmounts, description, txnUrl } = request.body as {
      user: string,
      assetAmounts: { [key: string]: number },
      description: string,
      txnUrl: string
    }
    const dispFileName = path.join(
      path.dirname(fastify.config.SOLVENCY_PROOF_PATH),
      'disputes.json'
    );
    // Read existing disputes or create empty array if file doesn't exist
    let disputes = [];
    try {
      const fileContent = await readFile(dispFileName, "utf-8");
      disputes = JSON.parse(fileContent);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty array
      // Create the file with an empty array
      await fs.promises.writeFile(
        dispFileName,
        JSON.stringify([], null, 2),
        "utf-8"
      );
    }

    // Add new dispute with timestamp
    const newDispute = {
      user,
      assetAmounts,
      description,
      txnUrl,
      timestamp: new Date().toISOString()
    };
    disputes.push(newDispute);

    // Write updated disputes back to file
    await fs.promises.writeFile(
      dispFileName,
      JSON.stringify(disputes, null, 2),
      "utf-8"
    );

    reply.send({
      success: true,
      message: "Dispute recorded successfully"
    });

  })
}

export default root;
