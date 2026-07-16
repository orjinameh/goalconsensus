import { MatchResult, ProviderHealth } from "../providers";

export type SettlementDecision =
  | "SETTLE"
  | "DO_NOT_SETTLE"
  | "PENDING"
  | "INSUFFICIENT_DATA"
  | "UNSUPPORTED_SPORT";

export interface AgentEvidence {
  source: string;
  detail: string;
  weight: number;
}

export interface AgentOutput {
  agentId: string;
  agentName: string;
  prediction: {
    winner: string;
    homeScore: number | null;
    awayScore: number | null;
  };
  confidence: number;
  explanation: string;
  evidence: AgentEvidence[];
  timestamp: string;
  latencyMs: number;
}

export interface CanonicalMatchState {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "SCHEDULED" | "LIVE" | "FINISHED";
  matchDate: string;
  sport: "FOOTBALL";
  providerAgreement: boolean;
  providerCount: number;
  providerHealth: ProviderHealth[];
  rawResults: MatchResult[];
}

export interface ConsensusResult {
  finalPrediction: {
    winner: string;
    homeScore: number | null;
    awayScore: number | null;
  };
  agreement: number;
  totalAgents: number;
  confidence: number;
  minorityOpinion: AgentOutput | null;
  evidence: AgentEvidence[];
  reasoning: string;
  settlementDecision: SettlementDecision;
  agents: AgentOutput[];
  canonicalState: CanonicalMatchState;
}

export interface VerificationAgent {
  id: string;
  name: string;
  verify(state: CanonicalMatchState): Promise<AgentOutput>;
}
