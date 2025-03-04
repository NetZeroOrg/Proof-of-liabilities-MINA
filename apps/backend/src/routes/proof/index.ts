import { FastifyPluginAsync } from "fastify"
import { Store, NodePosition, generateProof } from "tree_core"

const example: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  let treeStore: Store
  fastify.post<{ Body: { userId: string } }>('/get', async function (request, reply) {
    const { userId } = request.body
    const rootProofPath = fastify.config.ROOT_PROOF_PATH
    console.log(`rootProofPath: ${rootProofPath}`)
    if (!treeStore) {
      treeStore = await Store.loadFromDB(rootProofPath, fastify.config.REDIS_URL)
    }
    const userNodePositionRaw = await fastify.redis.get(`user:${userId}`)
    if (!userNodePositionRaw) {
      return { error: 'User not found' }
    } else {
      const nodePosition = NodePosition.fromRedisKey(userNodePositionRaw, false)
      const proof = generateProof(treeStore, nodePosition)
      return { proof }
    }
  })
}
export default example;
