import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getSignMessage } from "@/lib/auth";
import { setNonce } from "@/lib/nonce-store";
import { ethers } from "ethers";

export async function POST(request: Request) {
  try {
    const { address } = await request.json();
    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json({ error: "Valid wallet address required" }, { status: 400 });
    }

    const normalized = address.toLowerCase();
    const nonce = `0x${Array.from({ length: 32 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`;
    const message = `${getSignMessage()}\n\nNonce: ${nonce}`;

    try {
      const db = await connectToDatabase();
      await db.collection("nonces").updateOne(
        { address: normalized },
        { $set: { address: normalized, nonce, createdAt: new Date().toISOString() } },
        { upsert: true }
      );
    } catch {
      // MongoDB unavailable — store in shared in-memory store
      setNonce(normalized, nonce);
    }

    return NextResponse.json({ message, nonce });
  } catch {
    return NextResponse.json({ error: "Failed to generate nonce" }, { status: 500 });
  }
}
