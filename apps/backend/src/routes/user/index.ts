import { FastifyPluginAsync } from "fastify"
import fs from "fs";
import path from "path";
import csvParser from "csv-parser";
import axios from "axios";

const proofGen: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    let rows: any[] = [];
    fastify.get("/verify/:email", async function (request, reply) {
        const csvFilePath = path.join(import.meta.dirname, "../../..", "data", "data.csv");
        console.log("csvFilePath", csvFilePath);
        const { email } = request.params as { email: string };
        console.log("email", email);
        try {
            if (rows.length === 0) {
                const fileStream = fs.createReadStream(csvFilePath);

                await new Promise((resolve, reject) => {
                    fileStream
                        .pipe(csvParser())
                        .on("data", (row) => rows.push(row))
                        .on("end", resolve)
                        .on("error", reject);
                });
            }
            const user = rows.find((row) => row.UserEmail === email);
            const api = fastify.config.NETZERO_BACKEND_VERIFY_API
            const cexId = fastify.config.CEX_ID
            const apiKey = fastify.config.API_KEY
            console.log("api", api);
            console.log("cexId", cexId);
            console.log("apiKey", apiKey);
            console.log("user", user);

            if (user) {
                const request = await axios.post(api, {
                    email,
                    cexId
                }, {
                    headers: {
                        "x-api-key": apiKey,
                    }
                })
                const { data } = request
                if (data) {
                    return reply.send({
                        found: true,
                        data: data
                    });
                }
                return reply.send({
                    found: false,
                    message: "No data found",
                });
            } else {
                return reply.send({
                    found: false
                });
            }
        } catch (error) {
            reply.status(500).send({ error: "Internal Server Error" });
        }
    });
}

export default proofGen;

