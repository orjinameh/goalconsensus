import { NextResponse } from "next/server";
import { fetchAllProviders, MatchResult } from "@/lib/providers";
import { agents } from "@/lib/agents";
import { CanonicalMatchState } from "@/lib/agents/types";
import { computeAgentConsensus, ConsensusResult } from "@/lib/consensus";

export const dynamic = "force-dynamic";

interface EnrichedMatch extends MatchResult {
  consensus: ConsensusResult;
}

function dedupeMatches(matches: MatchResult[]): MatchResult[] {
  const seen = new Map<string, MatchResult>();
  for (const m of matches) {
    const key = `${m.homeTeam.toLowerCase()}-${m.awayTeam.toLowerCase()}-${m.status}`;
    if (!seen.has(key)) seen.set(key, m);
  }
  return Array.from(seen.values());
}

export async function GET() {
  try {
    const providerResults = await fetchAllProviders();
    const allMatches = providerResults
      .flatMap((pr) => pr.matches)
      .filter((m) => m.sport === "FOOTBALL");
    const combined = dedupeMatches(allMatches);

    const grouped = new Map<string, MatchResult[]>();
    for (const m of combined) {
      const key = `${m.homeTeam.toLowerCase()}-${m.awayTeam.toLowerCase()}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(m);
    }

    const enriched: EnrichedMatch[] = [];
    for (const [, group] of grouped) {
      const first = group[0];
      const responding = providerResults.filter(
        (pr) => pr.health.available
      );
      const providerAgreement = responding.length >= 2;

      const canonicalState: CanonicalMatchState = {
        homeTeam: first.homeTeam,
        awayTeam: first.awayTeam,
        homeScore: first.homeScore,
        awayScore: first.awayScore,
        status: first.status,
        matchDate: first.matchDate,
        sport: "FOOTBALL",
        providerAgreement,
        providerCount: responding.length,
        providerHealth: providerResults.map((pr) => pr.health),
        rawResults: group,
      };

      const agentOutputs = await Promise.all(
        agents.map((agent) => agent.verify(canonicalState))
      );

      const consensus = computeAgentConsensus(
        agentOutputs,
        canonicalState
      );
      enriched.push({ ...first, consensus });
    }

    return NextResponse.json({
      matches: enriched,
      providerHealth: providerResults.map((pr) => pr.health),
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      matches: [],
      providerHealth: [],
      fetchedAt: new Date().toISOString(),
      error: "Failed to fetch matches",
    });
  }
}
