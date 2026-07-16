import { statisticalAgent } from "./statistical-agent";
import { llmReasoningAgent } from "./llm-reasoning-agent";
import { deterministicRulesAgent } from "./deterministic-rules-agent";
import { VerificationAgent } from "./types";

export const agents: VerificationAgent[] = [
  statisticalAgent,
  llmReasoningAgent,
  deterministicRulesAgent,
];

export { statisticalAgent } from "./statistical-agent";
export { llmReasoningAgent } from "./llm-reasoning-agent";
export { deterministicRulesAgent } from "./deterministic-rules-agent";
export type { AgentOutput, AgentEvidence, CanonicalMatchState, ConsensusResult, VerificationAgent } from "./types";
