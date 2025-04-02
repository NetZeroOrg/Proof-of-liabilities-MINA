import { FastifyPluginAsync } from "fastify"
import { Store, NodePosition, generateProof, kdf, Bytes32, } from "tree_core"
const proofGen: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  let treeStore: Store
  fastify.post<{ Body: { userId: string } }>('/get', async function (request, reply) {
    const { userId } = request.body
    console.log(fastify.config.REDIS_URL)
    const rootProofPath = fastify.config.ROOT_PROOF_PATH
    console.log(`rootProofPath: ${rootProofPath}`)
    if (!treeStore) {
      treeStore = await Store.loadFromDB(rootProofPath, fastify.config.REDIS_URL)
    }
    console.log(userId)
    const userNodePositionRaw = await fastify.redis.get(`user:${userId}`)
    console.log(userNodePositionRaw)
    if (!userNodePositionRaw) {
      return { error: 'User not found' }
    } else {
      const nodePos = NodePosition.fromRedisKey(userNodePositionRaw, false)
      const { witness } = generateProof(treeStore, nodePos)
      const masterSecret = kdf(null, Bytes32.fromBigInt(BigInt(userId)), treeStore.treeParams.masterSecret)
      const blindingFactor = kdf(treeStore.treeParams.saltB, null, masterSecret).toBigint().toString()
      const userSecret = kdf(treeStore.treeParams.saltS, null, masterSecret).toBigint().toString()
      return { proof: witness, masterSecret: masterSecret.toBigint().toString(), blindingFactor, userSecret }
    }

  })
}
export default proofGen;
