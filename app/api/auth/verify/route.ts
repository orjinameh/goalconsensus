import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { recoverAddress, signJWT, getOrCreateUser, getSignMessage } from "@/lib/auth";
import { ethers } from "ethers";

// In-memory nonce store when MongoDB is unavailable
const memoryNonces = new Map<string, { nonce: string; createdAt: string }>();

export async function POST(request: Request) {
  try {
    const { address, signature } = await request.json();
    if (!address || !ethers.isAddress(address) || !signature) {
      return NextResponse.json({ error: "address and signature required" }, { status: 400 });
    }

    const normalized = address.toLowerCase();
    let nonceDoc: { nonce: string } | null = null;

    try {
      const db = await connectToDatabase();
      const found = await db.collection("nonces").findOne({ address: normalized });
      if (found) {
        nonceDoc = { nonce: found.nonce };
        await db.collection("nonces").deleteOne({ address: normalized });
      }
    } catch {
      // MongoDB unavailable — try in-memory nonce
      const mem = memoryNonces.get(normalized);
      if (mem) {
        nonceDoc = { nonce: mem.nonce };
        memoryNonces.delete(normalized);
      }
    }

    if (nonceDoc) {
      const message = `${getSignMessage()}\n\nNonce: ${nonceDoc.nonce}`;
      const recovered = recoverAddress(message, signature);
      if (!recovered || recovered.toLowerCase() !== normalized) {
        return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
      }
    } else {
      // No nonce found — verify signature is valid for the address
      const message = getSignMessage();
      const recovered = recoverAddress(message, signature);
      if (!recovered || recovered.toLowerCase() !== normalized) {
        return NextResponse.json({ error: "Signature verification failed — no nonce found" }, { status: 401 });
      }
    }

    let user;
    try {
      user = await getOrCreateUser(normalized);
    } catch {
      user = {
        address: normalized,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        totalStaked: 0,
        totalWon: 0,
        betsCount: 0,
      };
    }

    const token = signJWT({ address: normalized });
    return NextResponse.json({ token, user });
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
