import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import fastifyRedis from '@fastify/redis';

export default fp(async (fastify: FastifyInstance) => {
    const redisUrl = fastify.config.REDIS_URL;

    if (!redisUrl) {
        throw new Error('REDIS_URL is required in environment variables');
    }

    await fastify.register(fastifyRedis, {
        url: redisUrl,
        closeClient: true
    });

    fastify.log.info('Redis plugin registered');






}, {
    name: 'fastify-redis',
    dependencies: ['config']
});