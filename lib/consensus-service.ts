import {
  fetchAllProviders,
  fetchMatchesForPair,
  buildCanonicalState,
  type MatchResult,
  type ProviderHealth,
} from "./providers";
import { specialistAgents, agents } from "./agents";
import { computeAgentConsensus, type ConsensusResult } from "./consensus";
import { computePrediction, type PredictionResult } from "./prediction-engine";
import { verifyProviderScores, type VerificationResult } from "./verification-engine";
import { runDebate } from "./debate-engine";
import { generatePremiumReport, getReportCatalog } from "./premium-reports";
import { cachePrediction, getCachedPrediction } from "./predictions-cache";
import type { CanonicalMatchState, AgentOutput, DebateMessage, AIConsensus, PremiumReport, PremiumReportType } from "./agents/types";
import { SingleFlight } from "./llm/single-flight";

const matchSingleFlight = new SingleFlight();
const consensusSingleFlight = new SingleFlight();
const specialistSingleFlight = new SingleFlight();

interface EnrichedMatch extends MatchResult {
  consensus?: ConsensusResult;
  prediction?: PredictionResult;
  verification?: VerificationResult;
  llmPending: boolean;
}

interface MatchesResponse {
  matches: EnrichedMatch[];
  providerHealth: ProviderHealth[];
  fetchedAt: string;
}

interface SpecialistResponse {
  agentOutputs: AgentOutput[];
  canonicalState: CanonicalMatchState | null;
}

interface ConsensusResponse {
  consensus: ConsensusResult;
  prediction?: PredictionResult;
  verification?: VerificationResult;
  debate?: { messages: DebateMessage[]; consensus: AIConsensus };
  agentOutputs: AgentOutput[];
  providerHealth: ProviderHealth[];
}

interface PredictResponse {
  canonicalState: CanonicalMatchState | null;
  agentOutputs: AgentOutput[];
  prediction?: PredictionResult;
}

interface IntelligenceResponse {
  canonicalState: CanonicalMatchState | null;
  specialistOutputs: AgentOutput[];
  debate: { messages: DebateMessage[]; consensus: AIConsensus };
  prediction?: PredictionResult;
  consensus?: ConsensusResult;
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

      if (first.status === "SCHEDULED") {
        enriched.push({
          ...first,
          prediction: computePrediction(fastResults, canonicalState),
          llmPending: false,
        });
      } else if (first.status === "FINISHED") {
        const providerScores = responding.map((pr) => ({
          providerId: pr.health.providerId,
          providerName: pr.health.providerId,
          homeTeam: first.homeTeam,
          awayTeam: first.awayTeam,
          homeScore: first.homeScore,
          awayScore: first.awayScore,
          fetchedAt: new Date().toISOString(),
          latencyMs: 0,
        }));
        enriched.push({
          ...first,
          verification: verifyProviderScores(providerScores, canonicalState),
          llmPending: false,
        });
      } else {
        enriched.push({
          ...first,
          consensus: computeAgentConsensus(fastResults, canonicalState),
          llmPending: false,
        });
      }
    }

    return {
      matches: enriched,
      providerHealth: providerResults.map((pr) => pr.health),
      fetchedAt: new Date().toISOString(),
    };
  });
}

export async function getSpecialists(
  homeTeam: string,
  awayTeam: string
): Promise<SpecialistResponse> {
  const key = `specialists:${matchKey(homeTeam, awayTeam)}`;

  return specialistSingleFlight.dedupe(key, async () => {
    const canonicalState = await buildCanonicalState(homeTeam, awayTeam);

    if (!canonicalState) {
      return { agentOutputs: [], canonicalState: null };
    }

    const specialistResults = await Promise.all(
      specialistAgents.map((agent) => agent.verify(canonicalState))
    );

    return { agentOutputs: specialistResults, canonicalState };
  });
}

export async function getIntelligence(
  homeTeam: string,
  awayTeam: string
): Promise<IntelligenceResponse> {
  const key = `intelligence:${matchKey(homeTeam, awayTeam)}`;

  return specialistSingleFlight.dedupe(key, async () => {
    const canonicalState = await buildCanonicalState(homeTeam, awayTeam);

    if (!canonicalState) {
      return {
        canonicalState: null,
        specialistOutputs: [],
        debate: { messages: [], consensus: { winner: "Unknown", confidence: 0, agreement: 0, totalAgents: 0, messages: [], minorityOpinion: null } },
      };
    }

    // For finished matches, try to return the original pre-match predictions
    if (canonicalState.status === "FINISHED") {
      const cached = await getCachedPrediction(homeTeam, awayTeam);
      if (cached) {
        return {
          canonicalState,
          specialistOutputs: cached.specialistOutputs,
          debate: cached.debate,
          prediction: cached.prediction,
        };
      }
    }

    const specialistResults = await Promise.all(
      specialistAgents.map((agent) => agent.verify(canonicalState))
    );

    const debate = runDebate(specialistResults, canonicalState);
    const prediction = computePrediction(specialistResults, canonicalState);

    // Cache predictions for scheduled matches so they're preserved after kickoff
    if (canonicalState.status === "SCHEDULED") {
      await cachePrediction(homeTeam, awayTeam, specialistResults, debate, prediction);
    }

    return {
      canonicalState,
      specialistOutputs: specialistResults,
      debate,
      prediction,
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

    const debate = runDebate(agentOutputs, canonicalState);

    if (first.status === "SCHEDULED") {
      const prediction = computePrediction(agentOutputs, canonicalState);
      return {
        consensus: computeAgentConsensus(agentOutputs, canonicalState),
        prediction,
        debate,
        agentOutputs,
        providerHealth: providerResults.map((pr) => pr.health),
      };
    }

    if (first.status === "FINISHED") {
      const providerScores = responding.map((pr) => ({
        providerId: pr.health.providerId,
        providerName: pr.health.providerId,
        homeTeam: first.homeTeam,
        awayTeam: first.awayTeam,
        homeScore: first.homeScore,
        awayScore: first.awayScore,
        fetchedAt: new Date().toISOString(),
        latencyMs: 0,
      }));
      const verification = verifyProviderScores(providerScores, canonicalState);
      return {
        consensus: computeAgentConsensus(agentOutputs, canonicalState),
        verification,
        debate,
        agentOutputs,
        providerHealth: providerResults.map((pr) => pr.health),
      };
    }

    const consensus = computeAgentConsensus(agentOutputs, canonicalState);
    return {
      consensus,
      debate,
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

  const prediction = computePrediction(agentOutputs, canonicalState);

  return { canonicalState, agentOutputs, prediction };
}

export async function getPremiumReport(
  type: PremiumReportType,
  homeTeam: string,
  awayTeam: string
): Promise<PremiumReport | null> {
  const canonicalState = await buildCanonicalState(homeTeam, awayTeam);
  if (!canonicalState) return null;

  const specialistResults = await Promise.all(
    specialistAgents.map((agent) => agent.verify(canonicalState))
  );

  return generatePremiumReport(type, canonicalState, []);
}

export function getReportCatalogInfo() {
  return getReportCatalog();
}

export async function verifySettlement(
  query: string
): Promise<{
  safeForSettlement: boolean;
  match: string;
  consensus: ConsensusResult;
  verification?: VerificationResult;
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

  const providerScores = responding.map((pr) => ({
    providerId: pr.health.providerId,
    providerName: pr.health.providerId,
    homeTeam: first.homeTeam,
    awayTeam: first.awayTeam,
    homeScore: first.homeScore,
    awayScore: first.awayScore,
    fetchedAt: new Date().toISOString(),
    latencyMs: 0,
  }));
  const verification = verifyProviderScores(providerScores, canonicalState);

  return {
    safeForSettlement: consensus.settlementDecision === "SETTLE",
    match: `${canonicalState.homeTeam} vs ${canonicalState.awayTeam}`,
    consensus,
    verification,
    agentOutputs,
    providerHealth: providerResults.map((pr) => pr.health),
  };
}
