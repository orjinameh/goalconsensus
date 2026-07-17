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

export interface PredictionResult {
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
  predictionDecision:
    | "UNANIMOUS"
    | "STRONG_MAJORITY"
    | "MAJORITY"
    | "SPLIT"
    | "INSUFFICIENT_DATA"
    | "UNSUPPORTED_SPORT"
    | "COMPLETED";
  agents: AgentOutput[];
  canonicalState: CanonicalMatchState;
  upsetProbability: number;
  riskRating: "low" | "medium" | "high";
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

export type SpecialistAgentId =
  | "tactical-analyst"
  | "statistical-analyst"
  | "market-analyst"
  | "injury-analyst"
  | "news-analyst";

export interface SpecialistOutput {
  agentId: SpecialistAgentId;
  agentName: string;
  confidence: number;
  latencyMs: number;
  timestamp: string;
}

export interface TacticalReport extends SpecialistOutput {
  agentId: "tactical-analyst";
  formation: { home: string; away: string };
  tacticalStrengths: { home: string[]; away: string[] };
  tacticalWeaknesses: { home: string[]; away: string[] };
  pressingAnalysis: string;
  playerMatchups: { home: string; away: string; advantage: string }[];
  expectedSubstitutions: string[];
  keyBattles: string[];
  tacticalVerdict: string;
}

export interface StatisticalReport extends SpecialistOutput {
  agentId: "statistical-analyst";
  homeXG: number;
  awayXG: number;
  homeXGA: number;
  awayXGA: number;
  simulations: number;
  winProbabilities: { home: number; draw: number; away: number };
  projectedScore: { home: number; away: number };
  historicalH2H: { matches: number; homeWins: number; draws: number; awayWins: number };
  momentum: string;
  probabilityDistribution: { scoreline: string; probability: number }[];
}

export interface MarketReport extends SpecialistOutput {
  agentId: "market-analyst";
  oddsMovement: { opening: string; current: string; direction: "up" | "down" | "stable" };
  impliedProbabilities: { home: number; draw: number; away: number };
  bettingValue: { side: string; edge: number }[];
  marketConfidence: number;
  marketSentiment: string;
  sharpMoney: string;
}

export interface InjuryReport extends SpecialistOutput {
  agentId: "injury-analyst";
  homeInjuries: { player: string; status: string; impact: "high" | "medium" | "low" }[];
  awayInjuries: { player: string; status: string; impact: "high" | "medium" | "low" }[];
  homeSuspensions: string[];
  awaySuspensions: string[];
  expectedLineup: { home: string[]; away: string[] };
  fitnessReport: string;
  impactScore: number;
}

export interface NewsReport extends SpecialistOutput {
  agentId: "news-analyst";
  headlines: { title: string; source: string; sentiment: "positive" | "negative" | "neutral" }[];
  officialNews: string[];
  managerQuotes: { manager: string; quote: string }[];
  latestDevelopments: string[];
  overallSentiment: "positive" | "negative" | "neutral" | "mixed";
}

export type AnySpecialistReport =
  | TacticalReport
  | StatisticalReport
  | MarketReport
  | InjuryReport
  | NewsReport;

export interface DebateMessage {
  agentId: SpecialistAgentId;
  agentName: string;
  stance: "agree" | "disagree" | "neutral";
  position: string;
  reasoning: string;
  confidence: number;
  respondingTo?: SpecialistAgentId;
  timestamp: string;
}

export interface AIConsensus {
  winner: string;
  confidence: number;
  agreement: number;
  totalAgents: number;
  messages: DebateMessage[];
  minorityOpinion: { agent: string; position: string } | null;
}

export type PremiumReportType =
  | "full-tactical"
  | "historical-breakdown"
  | "player-report"
  | "market-intelligence"
  | "risk-report";

export interface PremiumReport {
  id: string;
  type: PremiumReportType;
  title: string;
  price: string;
  priceUSDC: number;
  content: string;
  matchKey: string;
  generatedAt: string;
}

export interface PremiumReportMeta {
  type: PremiumReportType;
  title: string;
  description: string;
  price: string;
  priceUSDC: number;
  icon: string;
}

export interface PredictionMarketOdds {
  home: number;
  draw: number;
  away: number;
}

export interface PredictionMarketPosition {
  side: "home" | "draw" | "away";
  amount: number;
  odds: number;
  potentialPayout: number;
}

export interface PredictionMarketState {
  matchKey: string;
  homeTeam: string;
  awayTeam: string;
  odds: PredictionMarketOdds;
  totalStaked: number;
  positions: PredictionMarketPosition[];
  resolved: boolean;
  result: "home" | "draw" | "away" | null;
  settlementTxHash: string | null;
}
