import fp from 'fastify-plugin';
import fastifyEnv from '@fastify/env';
import { FastifyInstance } from 'fastify';

// Define the schema interface
export interface EnvConfig {
    PORT: number;
    REDIS_URL: string;
    ROOT_PROOF_PATH: string;
}

const schema = {
    type: 'object',
    required: ['PORT', 'REDIS_URL', 'ROOT_PROOF_PATH'],
    properties: {
        PORT: {
            type: 'number',
            default: 3000
        },
        REDIS_URL: { type: 'string' },
        ROOT_PROOF_PATH: { type: 'string' }
    }
};

const options = {
    confKey: 'config', // This will attach your config to fastify instance
    schema: schema,
    data: process.env // Load env vars from process.env
};

export default fp<{}>(async (fastify: FastifyInstance) => {
    await fastify.register(fastifyEnv, options);

    // Type augmentation to add config property to FastifyInstance
    // This makes TypeScript recognize fastify.config
}, { name: 'config' });


declare module 'fastify' {
    interface FastifyInstance {
        config: EnvConfig;
    }
}