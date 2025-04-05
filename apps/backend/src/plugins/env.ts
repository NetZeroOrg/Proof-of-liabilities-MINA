import fp from 'fastify-plugin';
import fastifyEnv from '@fastify/env';
import { FastifyInstance } from 'fastify';

// Define the schema interface
export interface EnvConfig {
    PORT: number;
    REDIS_URL: string;
    ROOT_PROOF_PATH: string;
    NETZERO_BACKEND_VERIFY_API: string;
    CEX_ID: string;
    API_KEY: string;
    ASSET_DATA_FILE: string;
}

const schema = {
    type: 'object',
    required: ['PORT', 'REDIS_URL', 'ROOT_PROOF_PATH', 'ASSET_DATA_FILE', 'NETZERO_BACKEND_VERIFY_API', 'CEX_ID', 'API_KEY'],
    properties: {
        PORT: {
            type: 'number',
            default: 3000
        },
        REDIS_URL: { type: 'string' },
        ROOT_PROOF_PATH: { type: 'string' },
        NETZERO_BACKEND_VERIFY_API: { type: 'string' },
        CEX_ID: { type: 'string' },
        API_KEY: { type: 'string' },
        ASSET_DATA_FILE: { type: 'string' }
    }
};

const options = {
    confKey: 'config', // This will attach your config to fastify instance
    schema: schema,
    data: process.env // Load env vars from process.env
};

export default fp<{}>(async (fastify: FastifyInstance) => {
    // Register the fastify-env plugin with the schema and options
    // This will validate the environment variables against the schema
    // and make them available in fastify.config
    // The `options` object is passed to the plugin
    // and contains the schema and other configuration options
    // The `confKey` option specifies the key under which the configuration
    // will be stored in the Fastify instance
    try {
        await fastify.register(fastifyEnv, options);
        fastify.log.info('Environment variables loaded successfully');
    } catch (error) {
        fastify.log.error('Error loading environment variables:', error);
        throw error;
    }
    // Type augmentation to add config property to FastifyInstance
    // This makes TypeScript recognize fastify.config
}, { name: 'config' });


declare module 'fastify' {
    interface FastifyInstance {
        config: EnvConfig;
    }
}