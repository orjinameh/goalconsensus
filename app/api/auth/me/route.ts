import { NextResponse } from "next/server";
import { getAddressFromRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request: Request) {
  const address = getAddressFromRequest(request);
  if (!address) {
    return NextResponse.json({ user: null });
  }

  try {
    const db = await connectToDatabase();
    const user = await db.collection("users").findOne({ address: address.toLowerCase() });
    if (!user) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({ user });
  } catch {
    // MongoDB unavailable — return basic user from JWT
    return NextResponse.json({
      user: {
        address: address.toLowerCase(),
        totalStaked: 0,
        totalWon: 0,
        betsCount: 0,
      },
    });
  }
}
