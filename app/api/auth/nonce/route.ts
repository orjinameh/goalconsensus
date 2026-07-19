import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getSignMessage } from "@/lib/auth";
import { ethers } from "ethers";

// In-memory nonce store when MongoDB is unavailable
const memoryNonces = new Map<string, { nonce: string; createdAt: string }>();

export async function POST(request: Request) {
  try {
    const { address } = await request.json();
    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json({ error: "Valid wallet address required" }, { status: 400 });
    }

    const normalized = address.toLowerCase();
    const nonce = `0x${Array.from({ length: 32 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`;
    const message = `${getSignMessage()}\n\nNonce: ${nonce}`;
    const entry = { address: normalized, nonce, createdAt: new Date().toISOString() };

    try {
      const db = await connectToDatabase();
      await db.collection("nonces").updateOne(
        { address: normalized },
        { $set: entry },
        { upsert: true }
      );
    } catch {
      // MongoDB unavailable — store in memory
      memoryNonces.set(normalized, entry);
    }

    return NextResponse.json({ message, nonce });
  } catch {
    return NextResponse.json({ error: "Failed to generate nonce" }, { status: 500 });
  }
}
