import { NextRequest, NextResponse } from "next/server";
import { getConsensus } from "@/lib/consensus-service";
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

    const data = await getConsensus(homeTeam, awayTeam);

    const queryId = `consensus-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payment = chargeX402("get_consensus_result", queryId);

    return NextResponse.json({
      ...data,
      payment,
      x402Header: formatX402Header(),
    });
  } catch {
    return NextResponse.json({
      consensus: {
        finalPrediction: { winner: "Unknown", homeScore: null, awayScore: null },
        agreement: 0,
        totalAgents: 0,
        confidence: 0,
        minorityOpinion: null,
        evidence: [],
        reasoning: "AI reasoning is temporarily unavailable.",
        settlementDecision: "INSUFFICIENT_DATA",
        agents: [],
        canonicalState: {
          homeTeam: "Unknown",
          awayTeam: "Unknown",
          homeScore: null,
          awayScore: null,
          status: "SCHEDULED" as const,
          matchDate: new Date().toISOString(),
          sport: "FOOTBALL" as const,
          providerAgreement: false,
          providerCount: 0,
          providerHealth: [],
          rawResults: [],
        },
      },
      agentOutputs: [],
      providerHealth: [],
    });
  }
}
