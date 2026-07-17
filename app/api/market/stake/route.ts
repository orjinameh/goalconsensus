import { NextResponse } from "next/server";
import { placeBet } from "@/lib/prediction-market";

export async function POST(request: Request) {
  try {
    const { homeTeam, awayTeam, side, amount } = await request.json();
    if (!homeTeam || !awayTeam || !side || !amount) {
      return NextResponse.json({ error: "homeTeam, awayTeam, side, and amount required" }, { status: 400 });
    }
    const result = placeBet(homeTeam, awayTeam, side, amount);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Stake failed" }, { status: 500 });
  }
}
