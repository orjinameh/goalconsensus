import { NextResponse } from "next/server";
import { getHouseBalance } from "@/lib/settlement";

export async function GET() {
  try {
    const balance = await getHouseBalance();
    if (!balance) {
      return NextResponse.json({
        configured: false,
        message: "House wallet not configured. Set HOUSE_WALLET_PRIVATE_KEY env var.",
      });
    }
    return NextResponse.json({ configured: true, ...balance });
  } catch {
    return NextResponse.json({ configured: false, error: "Failed to fetch house balance" }, { status: 500 });
  }
}
