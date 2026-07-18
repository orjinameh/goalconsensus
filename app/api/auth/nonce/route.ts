import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getSignMessage } from "@/lib/auth";
import { ethers } from "ethers";

export async function POST(request: Request) {
  try {
    const { address } = await request.json();
    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json({ error: "Valid wallet address required" }, { status: 400 });
    }

    const db = await connectToDatabase();
    const normalized = address.toLowerCase();
    const nonce = `0x${Array.from({ length: 32 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`;
    const message = `${getSignMessage()}\n\nNonce: ${nonce}`;

    await db.collection("nonces").updateOne(
      { address: normalized },
      { $set: { address: normalized, nonce, createdAt: new Date().toISOString() } },
      { upsert: true }
    );

    return NextResponse.json({ message, nonce });
  } catch {
    return NextResponse.json({ error: "Failed to generate nonce" }, { status: 500 });
  }
}
