import { ethers } from "ethers";
import { connectToDatabase } from "./mongodb";
import { ObjectId } from "mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "goalconsensus-dev-secret-change-in-production";

export interface User {
  _id?: ObjectId;
  address: string;
  createdAt: string;
  lastLogin: string;
  totalStaked: number;
  totalWon: number;
  betsCount: number;
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data).toString("base64url");
}

function base64UrlDecode(data: string): string {
  return Buffer.from(data, "base64url").toString();
}

export function signJWT(payload: Record<string, unknown>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify({ ...payload, iat: Date.now() }));
  const data = `${header}.${body}`;
  const sig = base64UrlEncode(
    ethers.id(data).slice(0, 32)
  );
  return `${data}.${sig}`;
}

export function verifyJWT(token: string): Record<string, unknown> | null {
  try {
    const [header, body, sig] = token.split(".");
    if (!header || !body || !sig) return null;
    const data = `${header}.${body}`;
    const expectedSig = base64UrlEncode(ethers.id(data).slice(0, 32));
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(base64UrlDecode(body));
    if (Date.now() - payload.iat > 7 * 24 * 60 * 60 * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

const SIGN_MESSAGE = "Sign in to GoalConsensus — World Cup Intelligence Terminal";

export function getSignMessage(): string {
  return SIGN_MESSAGE;
}

export function recoverAddress(message: string, signature: string): string | null {
  try {
    return ethers.verifyMessage(message, signature);
  } catch {
    return null;
  }
}

export async function getOrCreateUser(address: string): Promise<User> {
  const db = await connectToDatabase();
  const normalized = address.toLowerCase();
  const existing = await db.collection<User>("users").findOne({ address: normalized });
  if (existing) {
    await db.collection("users").updateOne(
      { address: normalized },
      { $set: { lastLogin: new Date().toISOString() } }
    );
    return { ...existing, lastLogin: new Date().toISOString() };
  }
  const user: User = {
    address: normalized,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    totalStaked: 0,
    totalWon: 0,
    betsCount: 0,
  };
  await db.collection("users").insertOne(user);
  return user;
}

export function getAddressFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const payload = verifyJWT(token);
  if (!payload || typeof payload.address !== "string") return null;
  return payload.address;
}
