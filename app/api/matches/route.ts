import { NextResponse } from "next/server";
import { fetchAllProviders, MatchResult } from "@/lib/providers";
import { agents } from "@/lib/agents";
import { CanonicalMatchState, AgentOutput } from "@/lib/agents/types";
import { computeAgentConsensus, ConsensusResult } from "@/lib/consensus";

export const dynamic = "force-dynamic";

interface EnrichedMatch extends MatchResult {
  consensus: ConsensusResult;
  llmPending: boolean;
}

function dedupeMatches(matches: MatchResult[]): MatchResult[] {
  const seen = new Map<string, MatchResult>();
  for (const m of matches) {
    const key = `${m.homeTeam.toLowerCase()}-${m.awayTeam.toLowerCase()}-${m.status}`;
    if (!seen.has(key)) seen.set(key, m);
  }
  return Array.from(seen.values());
}

const llmCache = new Map<string, AgentOutput[]>();
const llmInFlight = new Set<string>();

function matchKey(home: string, away: string) {
  return `${home.toLowerCase()}|${away.toLowerCase()}`;
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

    const fastAgents = agents.filter((a) => a.id !== "llm-reasoning");
    const llmAgent = agents.find((a) => a.id === "llm-reasoning");

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

      const fastResults = await Promise.all(
        fastAgents.map((agent) => agent.verify(canonicalState))
      );

      const key = matchKey(first.homeTeam, first.awayTeam);
      const cachedLLM = llmCache.get(key) || [];
      const pending = llmInFlight.has(key);

      const allResults = [...fastResults, ...cachedLLM];
      if (pending && cachedLLM.length === 0) {
        allResults.push({
          agentId: "llm-reasoning",
          agentName: "AI Reasoning Agent",
          prediction: {
            winner: first.homeTeam,
            homeScore: null,
            awayScore: null,
          },
          confidence: 0,
          explanation: "Analyzing...",
          evidence: [],
          timestamp: new Date().toISOString(),
          latencyMs: 0,
        });
      }

      enriched.push({
        ...first,
        consensus: computeAgentConsensus(allResults, canonicalState),
        llmPending: pending,
      });

      if (llmAgent && !llmInFlight.has(key) && !llmCache.has(key)) {
        llmInFlight.add(key);
        llmAgent
          .verify(canonicalState)
          .then((llmResult) => {
            llmCache.set(key, [llmResult]);
          })
          .catch(() => {
            llmCache.set(key, []);
          })
          .finally(() => {
            llmInFlight.delete(key);
          });
      }
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
