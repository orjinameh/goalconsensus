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
  consensus?: ConsensusResult;
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
