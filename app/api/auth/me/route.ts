import { NextResponse } from "next/server";
import { getAddressFromRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request: Request) {
  const address = getAddressFromRequest(request);
  if (!address) {
    return NextResponse.json({ user: null });
  }

  const db = await connectToDatabase();
  const user = await db.collection("users").findOne({ address: address.toLowerCase() });
  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user });
}
