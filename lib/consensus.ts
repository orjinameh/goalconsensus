import { ProviderHealth } from "./providers";
import { AgentOutput, AgentEvidence, CanonicalMatchState, ConsensusResult } from "./agents/types";

export type { ConsensusResult } from "./agents/types";

export function computeAgentConsensus(
  agentOutputs: AgentOutput[],
  canonicalState: CanonicalMatchState | null
): ConsensusResult {
  if (!canonicalState) {
    return {
      finalPrediction: { winner: "Unknown", homeScore: null, awayScore: null },
      agreement: 0,
      totalAgents: agentOutputs.length,
      confidence: 0,
      minorityOpinion: null,
      evidence: [],
      reasoning: "No canonical match state available. Cannot compute consensus.",
      settlementDecision: "INSUFFICIENT_DATA",
      agents: agentOutputs,
      canonicalState: {
        homeTeam: "Unknown",
        awayTeam: "Unknown",
        homeScore: null,
        awayScore: null,
        status: "SCHEDULED",
        matchDate: new Date().toISOString(),
        providerAgreement: false,
        providerCount: 0,
        providerHealth: [],
        rawResults: [],
      },
    };
  }

  if (agentOutputs.length === 0) {
    return {
      finalPrediction: { winner: canonicalState.homeTeam, homeScore: canonicalState.homeScore, awayScore: canonicalState.awayScore },
      agreement: 0,
      totalAgents: 0,
      confidence: 0,
      minorityOpinion: null,
      evidence: [],
      reasoning: "No agent outputs available for consensus.",
      settlementDecision: "INSUFFICIENT_DATA",
      agents: [],
      canonicalState,
    };
  }

  const totalAgents = agentOutputs.length;
  const threshold = Math.ceil((2 * totalAgents) / 3);

  function agentWinnerKey(a: AgentOutput): string {
    return `${a.prediction.homeScore ?? "x"}-${a.prediction.awayScore ?? "x"}`;
  }

  const winnerGroups = new Map<string, AgentOutput[]>();
  for (const agent of agentOutputs) {
    const key = agentWinnerKey(agent);
    if (!winnerGroups.has(key)) winnerGroups.set(key, []);
    winnerGroups.get(key)!.push(agent);
  }

  let majorityGroup: AgentOutput[] = [];
  let majorityKey = "";
  for (const [key, group] of winnerGroups) {
    if (group.length > majorityGroup.length) {
      majorityGroup = group;
      majorityKey = key;
    }
  }

  const minorityAgents = agentOutputs.filter(
    (a) => agentWinnerKey(a) !== majorityKey
  );
  const minorityOpinion = minorityAgents.length > 0 ? minorityAgents[0] : null;

  const agreement = majorityGroup.length;
  const confidence = totalAgents > 0 ? Math.round((agreement / totalAgents) * 100) : 0;

  const majorityPrediction = majorityGroup[0].prediction;

  const allEvidence: AgentEvidence[] = agentOutputs.flatMap((a) => a.evidence);

  let settlementDecision: ConsensusResult["settlementDecision"];
  if (canonicalState.status !== "FINISHED") {
    settlementDecision = "PENDING";
  } else if (!canonicalState.providerAgreement) {
    settlementDecision = "INSUFFICIENT_DATA";
  } else if (agreement >= threshold) {
    settlementDecision = "SETTLE";
  } else {
    settlementDecision = "DO_NOT_SETTLE";
  }

  const agentSummaries = agentOutputs
    .map((a) => `${a.agentName}: ${a.prediction.winner} (${a.confidence}%)`)
    .join("; ");

  const reasoning = agreement >= threshold
    ? `${agreement}/${totalAgents} agents agree on ${majorityPrediction.winner} ${majorityPrediction.homeScore ?? "?"}-${majorityPrediction.awayScore ?? "?"} ${majorityPrediction.awayScore !== undefined ? canonicalState.awayTeam : ""}. BFT threshold (${threshold}/${totalAgents}) met. Settlement: ${settlementDecision}. Agents: ${agentSummaries}.`
    : `${agreement}/${totalAgents} agents agree. BFT threshold (${threshold}/${totalAgents}) not met. Settlement: ${settlementDecision}. Agents: ${agentSummaries}.`;

  return {
    finalPrediction: majorityPrediction,
    agreement,
    totalAgents,
    confidence,
    minorityOpinion,
    evidence: allEvidence,
    reasoning,
    settlementDecision,
    agents: agentOutputs,
    canonicalState,
  };
}
