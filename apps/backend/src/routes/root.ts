import { FastifyPluginAsync } from 'fastify'
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  let assets: string[] = []
  fastify.get('/', async function (request, reply) {
    return { root: true }
  })

  // returns the assets that the cex have
  fastify.get("/assets", async function (request, reply) {
    const filePath = path.join(import.meta.dirname, "../..", "data", "data.csv");

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
}

export default root;
