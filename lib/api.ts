import type { ConsensusResult } from "@/lib/agents/types";
import type { ProviderHealth } from "@/lib/providers";

export interface MatchWithConsensus {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "SCHEDULED" | "LIVE" | "FINISHED";
  matchDate: string;
  sport: "FOOTBALL";
  providerId: string;
  competition?: string;
  consensus: ConsensusResult;
  llmPending: boolean;
}

export interface MatchesResponse {
  matches: MatchWithConsensus[];
  providerHealth: ProviderHealth[];
  fetchedAt: string;
  error?: string;
}

export interface ConsensusResponse {
  consensus: ConsensusResult;
  agentOutputs: ConsensusResult["agents"];
  providerHealth: ProviderHealth[];
  payment: {
    paid: boolean;
    amount: string;
    protocol: string;
    chain: string;
    txHash: string;
    tool: string;
    timestamp: string;
    queryId: string;
  };
  x402Header: string;
}

export interface PredictResponse {
  canonicalState: ConsensusResult["canonicalState"] | null;
  agentOutputs: ConsensusResult["agents"];
  payment: {
    paid: boolean;
    amount: string;
    protocol: string;
    chain: string;
    txHash: string;
    tool: string;
    timestamp: string;
    queryId: string;
  };
  x402Header: string;
  error?: string;
}

export async function fetchMatches(): Promise<MatchesResponse> {
  const res = await fetch("/api/matches", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to fetch matches: ${res.status}`);
  return res.json();
}

export async function fetchConsensus(
  homeTeam: string,
  awayTeam: string
): Promise<ConsensusResponse> {
  const res = await fetch("/api/consensus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ homeTeam, awayTeam }),
  });
  if (!res.ok) throw new Error(`Consensus request failed: ${res.status}`);
  return res.json();
}

export async function fetchPrediction(
  homeTeam: string,
  awayTeam: string
): Promise<PredictResponse> {
  const res = await fetch("/api/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ homeTeam, awayTeam }),
  });
  if (!res.ok) throw new Error(`Prediction request failed: ${res.status}`);
  return res.json();
}

export function getSearchableTeams(
  matches: MatchWithConsensus[]
): { home: string; away: string }[] {
  const seen = new Set<string>();
  const teams: { home: string; away: string }[] = [];
  for (const m of matches) {
    const key = `${m.homeTeam.toLowerCase()}|${m.awayTeam.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      teams.push({ home: m.homeTeam, away: m.awayTeam });
    }
  }
  return teams;
}

export function searchMatches(
  query: string,
  matches: MatchWithConsensus[]
): MatchWithConsensus[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  return matches.filter(
    (m) =>
      m.homeTeam.toLowerCase().includes(q) ||
      m.awayTeam.toLowerCase().includes(q) ||
      `${m.homeTeam} vs ${m.awayTeam}`.toLowerCase().includes(q)
  );
}
