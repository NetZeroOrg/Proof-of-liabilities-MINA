import { FastifyPluginAsync } from "fastify"
import fs from "fs";
import path from "path";
import csvParser from "csv-parser";


const user: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
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

            if (user) {
                return reply.send({ found: true });
            } else {
                return reply.status(404).send({ found: false });
            }
        } catch (error) {
            return reply.status(500).send({ error: "Internal Server Error" });
        }
    });
}

export default user;

