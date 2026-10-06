import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

let mongod: MongoMemoryServer | null = null

/**
 * Integration tests spin up a real in-memory MongoDB (mongodb-memory-server) rather than
 * mocking Mongoose, so the tests exercise real queries, indexes, and uniqueness constraints.
 * NOTE: mongodb-memory-server downloads a MongoDB binary the first time it runs, which
 * requires outbound internet access to https://fastdl.mongodb.org. In network-restricted
 * sandboxes this download will fail — run these tests in a normal dev machine or CI runner.
 */
export async function connectTestDatabase() {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
}

export async function disconnectTestDatabase() {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
  if (mongod) await mongod.stop()
}

export async function clearTestDatabase() {
  const collections = mongoose.connection.collections
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({})
  }
}
