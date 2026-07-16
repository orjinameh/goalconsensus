import { NextRequest, NextResponse } from "next/server";
import { fetchMatchesForPair } from "@/lib/providers";
import { agents } from "@/lib/agents";
import { CanonicalMatchState } from "@/lib/agents/types";
import { computeAgentConsensus } from "@/lib/consensus";
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

    const providerResults = await fetchMatchesForPair(
      homeTeam,
      awayTeam
    );
    const responding = providerResults.filter(
      (pr) => pr.health.available
    );
    const allMatches = responding.flatMap((pr) => pr.matches);

    if (allMatches.length === 0) {
      const queryId = `consensus-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const payment = chargeX402("get_consensus_result", queryId);
      return NextResponse.json({
        consensus: computeAgentConsensus([], null),
        agentOutputs: [],
        providerHealth: providerResults.map((pr) => pr.health),
        payment,
        x402Header: formatX402Header(),
      });
    }

    const first = allMatches[0];
    const canonicalState: CanonicalMatchState = {
      homeTeam: first.homeTeam,
      awayTeam: first.awayTeam,
      homeScore: first.homeScore,
      awayScore: first.awayScore,
      status: first.status,
      matchDate: first.matchDate,
      sport: "FOOTBALL",
      providerAgreement: responding.length >= 2,
      providerCount: responding.length,
      providerHealth: providerResults.map((pr) => pr.health),
      rawResults: allMatches,
    };

    const agentOutputs = await Promise.all(
      agents.map((agent) => agent.verify(canonicalState))
    );

    const consensus = computeAgentConsensus(
      agentOutputs,
      canonicalState
    );

    const queryId = `consensus-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payment = chargeX402("get_consensus_result", queryId);

    return NextResponse.json({
      consensus,
      agentOutputs,
      providerHealth: providerResults.map((pr) => pr.health),
      payment,
      x402Header: formatX402Header(),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
