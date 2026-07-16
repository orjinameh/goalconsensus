import { NextRequest, NextResponse } from "next/server";
import { buildCanonicalState } from "@/lib/providers";
import { agents } from "@/lib/agents";
import { chargeX402, formatX402Header } from "@/lib/x402";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { homeTeam, awayTeam } = await req.json();

  if (!homeTeam || !awayTeam) {
    return NextResponse.json(
      { error: "homeTeam and awayTeam are required" },
      { status: 400 }
    );
  }

  const canonicalState = await buildCanonicalState(homeTeam, awayTeam);

  if (!canonicalState) {
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

  const agentOutputs = await Promise.all(
    agents.map((agent) => agent.verify(canonicalState))
  );

  const queryId = `predict-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payment = chargeX402("get_match_prediction", queryId);

  return NextResponse.json({
    canonicalState,
    agentOutputs,
    payment,
    x402Header: formatX402Header(),
  });
}
