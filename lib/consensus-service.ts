import {
  fetchAllProviders,
  fetchMatchesForPair,
  buildCanonicalState,
  type MatchResult,
  type ProviderHealth,
  type ProviderResult,
} from "./providers";
import { agents, type VerificationAgent } from "./agents";
import { computeAgentConsensus, type ConsensusResult } from "./consensus";
import type { CanonicalMatchState, AgentOutput } from "./agents/types";
import { SingleFlight } from "./llm/single-flight";

const matchSingleFlight = new SingleFlight();
const consensusSingleFlight = new SingleFlight();

interface EnrichedMatch extends MatchResult {
  consensus?: ConsensusResult;
  llmPending: boolean;
}

interface MatchesResponse {
  matches: EnrichedMatch[];
  providerHealth: ProviderHealth[];
  fetchedAt: string;
}

interface ConsensusResponse {
  consensus: ConsensusResult;
  agentOutputs: AgentOutput[];
  providerHealth: ProviderHealth[];
}

interface PredictResponse {
  canonicalState: CanonicalMatchState | null;
  agentOutputs: AgentOutput[];
}

function dedupeMatches(matches: MatchResult[]): MatchResult[] {
  const seen = new Map<string, MatchResult>();
  for (const m of matches) {
    const key = `${m.homeTeam.toLowerCase()}-${m.awayTeam.toLowerCase()}-${m.status}`;
    if (!seen.has(key)) seen.set(key, m);
  }
  return Array.from(seen.values());
}

function matchKey(home: string, away: string): string {
  return `${home.toLowerCase()}|${away.toLowerCase()}`;
}

export async function getMatches(): Promise<MatchesResponse> {
  return matchSingleFlight.dedupe("all-matches", async () => {
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
    const responding = providerResults.filter((pr) => pr.health.available);

    const enriched: EnrichedMatch[] = [];

    for (const [, group] of grouped) {
      const first = group[0];
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

      enriched.push({
        ...first,
        consensus: computeAgentConsensus(fastResults, canonicalState),
        llmPending: false,
      });
    }

    return {
      matches: enriched,
      providerHealth: providerResults.map((pr) => pr.health),
      fetchedAt: new Date().toISOString(),
    };
  });
}

export async function getConsensus(
  homeTeam: string,
  awayTeam: string
): Promise<ConsensusResponse> {
  const key = `consensus:${matchKey(homeTeam, awayTeam)}`;

  return consensusSingleFlight.dedupe(key, async () => {
    const providerResults = await fetchMatchesForPair(homeTeam, awayTeam);
    const responding = providerResults.filter((pr) => pr.health.available);
    const allMatches = responding.flatMap((pr) => pr.matches);

    if (allMatches.length === 0) {
      return {
        consensus: computeAgentConsensus([], null),
        agentOutputs: [],
        providerHealth: providerResults.map((pr) => pr.health),
      };
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

    const consensus = computeAgentConsensus(agentOutputs, canonicalState);

    return {
      consensus,
      agentOutputs,
      providerHealth: providerResults.map((pr) => pr.health),
    };
  });
}

export async function getPrediction(
  homeTeam: string,
  awayTeam: string
): Promise<PredictResponse> {
  const canonicalState = await buildCanonicalState(homeTeam, awayTeam);

  if (!canonicalState) {
    return { canonicalState: null, agentOutputs: [] };
  }

  const agentOutputs = await Promise.all(
    agents.map((agent) => agent.verify(canonicalState))
  );

  return { canonicalState, agentOutputs };
}

export async function verifySettlement(
  query: string
): Promise<{
  safeForSettlement: boolean;
  match: string;
  consensus: ConsensusResult;
  agentOutputs: AgentOutput[];
  providerHealth: ProviderHealth[];
}> {
  const providerResults = await fetchAllProviders();
  const allMatches = providerResults
    .flatMap((pr) => pr.matches)
    .filter((m) => m.sport === "FOOTBALL");

  const matching = allMatches.filter(
    (m) =>
      m.id.includes(query) ||
      m.homeTeam.toLowerCase().includes(query.toLowerCase()) ||
      m.awayTeam.toLowerCase().includes(query.toLowerCase()) ||
      `${m.homeTeam} vs ${m.awayTeam}`.toLowerCase().includes(query.toLowerCase())
  );

  if (matching.length === 0) {
    return {
      safeForSettlement: false,
      match: query,
      consensus: computeAgentConsensus([], null),
      agentOutputs: [],
      providerHealth: providerResults.map((pr) => pr.health),
    };
  }

  const first = matching[0];
  const responding = providerResults.filter((pr) => pr.health.available);

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
    rawResults: matching,
  };

  const agentOutputs = await Promise.all(
    agents.map((agent) => agent.verify(canonicalState))
  );

  const consensus = computeAgentConsensus(agentOutputs, canonicalState);

  return {
    safeForSettlement: consensus.settlementDecision === "SETTLE",
    match: `${canonicalState.homeTeam} vs ${canonicalState.awayTeam}`,
    consensus,
    agentOutputs,
    providerHealth: providerResults.map((pr) => pr.health),
  };
}
