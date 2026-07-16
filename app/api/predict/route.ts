import { NextRequest, NextResponse } from "next/server";
import { predictMatch } from "@/lib/groq";
import { chargeX402, formatX402Header } from "@/lib/x402";

export async function POST(req: NextRequest) {
  const { homeTeam, awayTeam } = await req.json();

  if (!homeTeam || !awayTeam) {
    return NextResponse.json(
      { error: "homeTeam and awayTeam are required" },
      { status: 400 }
    );
  }

  const prediction = await predictMatch(homeTeam, awayTeam);

  const queryId = `predict-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payment = chargeX402("get_match_prediction", queryId);

  return NextResponse.json({
    prediction,
    payment,
    x402Header: formatX402Header(),
  });
}
