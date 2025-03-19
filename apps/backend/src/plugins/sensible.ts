import fp from 'fastify-plugin'
import sensible, { FastifySensibleOptions } from '@fastify/sensible'

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-sensible
 */
export default fp<FastifySensibleOptions>(async (fastify) => {
  try {

    fastify.register(sensible)
    fastify.log.info('sensible plugin loaded')
  } catch (error) {
    fastify.log.error("hello", error)
    throw error
  }
})

