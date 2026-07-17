import { statisticalAgent } from "./statistical-agent";
import { llmReasoningAgent } from "./llm-reasoning-agent";
import { deterministicRulesAgent } from "./deterministic-rules-agent";
import { tacticalAnalyst } from "./tactical-analyst";
import { marketAnalyst } from "./market-analyst";
import { injuryAnalyst } from "./injury-analyst";
import { newsAnalyst } from "./news-analyst";
import { VerificationAgent } from "./types";

export const agents: VerificationAgent[] = [
  statisticalAgent,
  llmReasoningAgent,
  deterministicRulesAgent,
];

export const specialistAgents: VerificationAgent[] = [
  tacticalAnalyst,
  statisticalAgent,
  marketAnalyst,
  injuryAnalyst,
  newsAnalyst,
];

export const allAgents: VerificationAgent[] = [
  ...specialistAgents,
  llmReasoningAgent,
  deterministicRulesAgent,
];

export { statisticalAgent } from "./statistical-agent";
export { llmReasoningAgent } from "./llm-reasoning-agent";
export { deterministicRulesAgent } from "./deterministic-rules-agent";
export { tacticalAnalyst } from "./tactical-analyst";
export { marketAnalyst } from "./market-analyst";
export { injuryAnalyst } from "./injury-analyst";
export { newsAnalyst } from "./news-analyst";
export type {
  AgentOutput,
  AgentEvidence,
  CanonicalMatchState,
  ConsensusResult,
  PredictionResult,
  SettlementDecision,
  VerificationAgent,
  SpecialistAgentId,
  SpecialistOutput,
  TacticalReport,
  StatisticalReport,
  MarketReport,
  InjuryReport,
  NewsReport,
  AnySpecialistReport,
  DebateMessage,
  AIConsensus,
  PremiumReportType,
  PremiumReport,
  PremiumReportMeta,
  PredictionMarketOdds,
  PredictionMarketPosition,
  PredictionMarketState,
} from "./types";
