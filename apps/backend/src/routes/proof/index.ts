import { FastifyPluginAsync } from "fastify"
import { Store, NodePosition, generateProof, kdf, Bytes32, generateRootFromPath } from "tree_core"

const proofGen: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  let treeStore: Store
  fastify.post<{ Body: { userId: string } }>('/get', async function (request, reply) {
    const { userId } = request.body
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
      const nodePosition = NodePosition.fromRedisKey(userNodePositionRaw, false)
      const { witness, blindingFactor, userSecret } = generateProof(treeStore, nodePosition)
      const masterSecret = kdf(null, Bytes32.fromNumber(nodePosition.x), treeStore.treeParams.masterSecret)
      const root = generateRootFromPath(witness, treeStore, nodePosition)
      console.log('root', root.commitment)
      console.log('rootHash', root.hash)
      return { proof: witness, masterSecret: masterSecret.toBigint().toString(), blindingFactor, userSecret }
    }
  })
}
export default proofGen;
