import { NextResponse } from "next/server";
import { placeBet } from "@/lib/prediction-market";

export async function POST(request: Request) {
  try {
    const { homeTeam, awayTeam, side, amount, matchStatus } = await request.json();
    if (!homeTeam || !awayTeam || !side || !amount) {
      return NextResponse.json({ error: "homeTeam, awayTeam, side, and amount required" }, { status: 400 });
    }
    if (matchStatus && matchStatus !== "SCHEDULED") {
      return NextResponse.json({ error: `Cannot bet on ${matchStatus.toLowerCase()} matches` }, { status: 400 });
    }
    const result = placeBet(homeTeam, awayTeam, side, amount, matchStatus);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      market: result.market,
      cctpTransfer: result.cctpTransfer,
      message: `Stake of $${amount} on ${side} placed. CCTP transfer ${result.cctpTransfer?.id} initiated from Base Sepolia → Injective Testnet.`,
    });
  } catch {
    return NextResponse.json({ error: "Stake failed" }, { status: 500 });
  }
}
