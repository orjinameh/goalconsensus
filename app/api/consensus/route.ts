import { NextRequest, NextResponse } from "next/server";
import { fetchMatchesForPair } from "@/lib/sources";
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

  const results = await fetchMatchesForPair(homeTeam, awayTeam);
  const verdict = computeConsensus(results);

  const queryId = `consensus-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payment = chargeX402("get_consensus_result", queryId);

  return NextResponse.json({
    verdict,
    sources: results.map((r) => ({
      source: r.source,
      homeScore: r.homeScore,
      awayScore: r.awayScore,
      status: r.status,
    })),
    payment,
    x402Header: formatX402Header(),
  });
}
