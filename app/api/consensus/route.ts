import { NextRequest, NextResponse } from "next/server";
import { fetchMatchesForPair } from "@/lib/providers";
import { computeConsensus } from "@/lib/consensus";
import { chargeX402, formatX402Header } from "@/lib/x402";

export async function POST(req: NextRequest) {
  const { homeTeam, awayTeam } = await req.json();

  if (!homeTeam || !awayTeam) {
    return NextResponse.json(
      { error: "homeTeam and awayTeam are required" },
      { status: 400 }
    );
  }

  const providerResults = await fetchMatchesForPair(homeTeam, awayTeam);
  const verdict = computeConsensus(providerResults);

  const queryId = `consensus-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payment = chargeX402("get_consensus_result", queryId);

  return NextResponse.json({
    verdict,
    providerHealth: providerResults.map((pr) => pr.health),
    sources: providerResults.map((pr) => ({
      provider: pr.providerId,
      matchCount: pr.matches.length,
      scores: pr.matches.map((m) => ({
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status,
      })),
    })),
    payment,
    x402Header: formatX402Header(),
  });
}
