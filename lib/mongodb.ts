import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (cachedDb) return cachedDb;
  if (!MONGODB_URI) throw new Error("MONGODB_URI is not defined");

  const client = await MongoClient.connect(MONGODB_URI);
  cachedClient = client;
  cachedDb = client.db("goalconsensus");

  await cachedDb.collection("users").createIndex({ address: 1 }, { unique: true });
  await cachedDb.collection("bets").createIndex({ userAddress: 1 });
  await cachedDb.collection("bets").createIndex({ marketKey: 1 });
  await cachedDb.collection("nonces").createIndex({ address: 1 }, { unique: true });
    await cachedDb.collection("nonces").createIndex({ createdAt: 1 }, { expireAfterSeconds: 300 });
    await cachedDb.collection("predictions").createIndex({ matchKey: 1 }, { unique: true });

  return cachedDb;
}
