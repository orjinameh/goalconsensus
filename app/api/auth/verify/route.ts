import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { recoverAddress, signJWT, getOrCreateUser, getSignMessage } from "@/lib/auth";
import { ethers } from "ethers";

export async function POST(request: Request) {
  try {
    const { address, signature } = await request.json();
    if (!address || !ethers.isAddress(address) || !signature) {
      return NextResponse.json({ error: "address and signature required" }, { status: 400 });
    }

    const db = await connectToDatabase();
    const normalized = address.toLowerCase();
    const nonceDoc = await db.collection("nonces").findOne({ address: normalized });
    if (!nonceDoc) {
      return NextResponse.json({ error: "No nonce found — request a new one" }, { status: 400 });
    }

    const message = `${getSignMessage()}\n\nNonce: ${nonceDoc.nonce}`;
    const recovered = recoverAddress(message, signature);
    if (!recovered || recovered.toLowerCase() !== normalized) {
      return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
    }

    await db.collection("nonces").deleteOne({ address: normalized });

    const user = await getOrCreateUser(normalized);
    const token = signJWT({ address: normalized, userId: user._id?.toString() });

    return NextResponse.json({ token, user });
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
