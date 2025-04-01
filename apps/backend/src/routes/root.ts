import { FastifyPluginAsync } from 'fastify'
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { readdir, readFile } from 'fs/promises';

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  let assets: string[] = []
  fastify.get('/', async function (request, reply) {
    return { root: true }
  })

  // returns the assets that the cex have
  fastify.get("/assets", async function (request, reply) {
    const filePath = path.join(import.meta.dirname, "../..", "data", "data-small.csv");

    if (assets.length === 0) {
      assets = await new Promise<string[]>((resolve, reject) => {
        fs.createReadStream(filePath)
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
    const keysDir = path.join(import.meta.dirname, "../../..", "backend-contract", "keys");

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
}

export default root;
