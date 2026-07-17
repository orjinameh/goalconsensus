import { NextRequest, NextResponse } from "next/server";
import { getPrediction } from "@/lib/consensus-service";
import { chargeX402, formatX402Header } from "@/lib/x402";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { homeTeam, awayTeam } = await req.json();

    if (!homeTeam || !awayTeam) {
      return NextResponse.json(
        { error: "homeTeam and awayTeam are required" },
        { status: 400 }
      );
    }

    const data = await getPrediction(homeTeam, awayTeam);

    if (!data.canonicalState) {
      const queryId = `predict-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const payment = chargeX402("get_match_prediction", queryId);
      return NextResponse.json({
        error: "No match data available for this fixture",
        canonicalState: null,
        agentOutputs: [],
        payment,
        x402Header: formatX402Header(),
      });
    }

    const queryId = `predict-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payment = chargeX402("get_match_prediction", queryId);

    return NextResponse.json({
      ...data,
      payment,
      x402Header: formatX402Header(),
    });
  } catch {
    return NextResponse.json({
      canonicalState: null,
      agentOutputs: [],
      error: "AI reasoning is temporarily unavailable.",
    });
  }
}
