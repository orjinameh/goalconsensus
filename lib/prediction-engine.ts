import {
  AgentOutput,
  AgentEvidence,
  CanonicalMatchState,
  PredictionResult,
} from "./agents/types";

export type { PredictionResult } from "./agents/types";

function agentScoreKey(a: AgentOutput): string {
  return `${a.prediction.homeScore ?? "x"}-${a.prediction.awayScore ?? "x"}`;
}

function agentWinnerKey(a: AgentOutput): string {
  return a.prediction.winner || "Unknown";
}

function computeUpsetProbability(
  agents: AgentOutput[],
  canonicalState: CanonicalMatchState
): number {
  const homeVotes = agents.filter(
    (a) => a.prediction.winner === canonicalState.homeTeam
  ).length;
  const awayVotes = agents.filter(
    (a) => a.prediction.winner === canonicalState.awayTeam
  ).length;
  const total = agents.length;
  if (total === 0) return 0;

  const minorityVotes = Math.min(homeVotes, awayVotes);
  const minorityRatio = minorityVotes / total;

  const avgConfidence =
    agents.reduce((sum, a) => sum + a.confidence, 0) / total;

  const upsetBase = minorityRatio * 0.6;
  const confidenceDamping = (1 - avgConfidence / 100) * 0.3;
  return Math.round((upsetBase + confidenceDamping) * 100);
}

function computeRiskRating(
  agreement: number,
  totalAgents: number,
  avgConfidence: number
): "low" | "medium" | "high" {
  const agreementRatio = totalAgents > 0 ? agreement / totalAgents : 0;
  const score = agreementRatio * 0.5 + (avgConfidence / 100) * 0.5;

  if (score >= 0.7) return "low";
  if (score >= 0.4) return "medium";
  return "high";
}

export function computePrediction(
  agentOutputs: AgentOutput[],
  canonicalState: CanonicalMatchState | null
): PredictionResult {
  if (!canonicalState) {
    return {
      finalPrediction: { winner: "Unknown", homeScore: null, awayScore: null },
      agreement: 0,
      totalAgents: agentOutputs.length,
      confidence: 0,
      minorityOpinion: null,
      evidence: [],
      reasoning: "No match data available for prediction.",
      predictionDecision: "INSUFFICIENT_DATA",
      agents: agentOutputs,
      canonicalState: {
        homeTeam: "Unknown", awayTeam: "Unknown", homeScore: null,
        awayScore: null, status: "SCHEDULED", matchDate: new Date().toISOString(),
        sport: "FOOTBALL", providerAgreement: false, providerCount: 0,
        providerHealth: [], rawResults: [],
      },
      upsetProbability: 0,
      riskRating: "high",
    };
  }

  if (canonicalState.sport !== "FOOTBALL") {
    return {
      finalPrediction: { winner: "Unknown", homeScore: null, awayScore: null },
      agreement: 0, totalAgents: agentOutputs.length, confidence: 0,
      minorityOpinion: null, evidence: [],
      reasoning: `UNSUPPORTED_SPORT: ${canonicalState.sport}.`,
      predictionDecision: "UNSUPPORTED_SPORT", agents: agentOutputs,
      canonicalState, upsetProbability: 0, riskRating: "high",
    };
  }

  if (agentOutputs.length === 0) {
    return {
      finalPrediction: { winner: canonicalState.homeTeam, homeScore: null, awayScore: null },
      agreement: 0, totalAgents: 0, confidence: 0,
      minorityOpinion: null, evidence: [],
      reasoning: "No agent outputs available for prediction.",
      predictionDecision: "INSUFFICIENT_DATA", agents: [],
      canonicalState, upsetProbability: 0, riskRating: "high",
    };
  }

  const activeAgents = agentOutputs.filter((a) => a.confidence > 0);

  if (activeAgents.length === 0) {
    return {
      finalPrediction: { winner: canonicalState.homeTeam, homeScore: null, awayScore: null },
      agreement: 0, totalAgents: agentOutputs.length, confidence: 0,
      minorityOpinion: null, evidence: agentOutputs.flatMap((a) => a.evidence),
      reasoning: "All agents returned zero confidence. No reliable prediction.",
      predictionDecision: "INSUFFICIENT_DATA", agents: agentOutputs,
      canonicalState, upsetProbability: 0, riskRating: "high",
    };
  }

  const totalAgents = activeAgents.length;

  const scoreGroups = new Map<string, AgentOutput[]>();
  for (const agent of activeAgents) {
    const key = agentScoreKey(agent);
    if (!scoreGroups.has(key)) scoreGroups.set(key, []);
    scoreGroups.get(key)!.push(agent);
  }

  let majorityScoreGroup: AgentOutput[] = [];
  let majorityScoreKey = "";
  for (const [key, group] of scoreGroups) {
    if (group.length > majorityScoreGroup.length) {
      majorityScoreGroup = group;
      majorityScoreKey = key;
    }
  }

  const winnerGroups = new Map<string, AgentOutput[]>();
  for (const agent of activeAgents) {
    const key = agentWinnerKey(agent);
    if (!winnerGroups.has(key)) winnerGroups.set(key, []);
    winnerGroups.get(key)!.push(agent);
  }

  let majorityWinnerGroup: AgentOutput[] = [];
  let majorityWinnerKey = "";
  for (const [key, group] of winnerGroups) {
    if (group.length > majorityWinnerGroup.length) {
      majorityWinnerGroup = group;
      majorityWinnerKey = key;
    }
  }

  const minorityAgents = activeAgents.filter(
    (a) => agentWinnerKey(a) !== majorityWinnerKey
  );
  const minorityOpinion = minorityAgents.length > 0 ? minorityAgents[0] : null;

  const agreement = majorityScoreGroup.length;

  const confidenceWeights = activeAgents.map((a) => a.confidence / 100);
  const totalWeight = confidenceWeights.reduce((s, w) => s + w, 0);
  const weightedConfidence = activeAgents.reduce(
    (sum, a, i) => sum + a.confidence * confidenceWeights[i],
    0
  );
  const avgConfidence = totalAgents > 0
    ? activeAgents.reduce((sum, a) => sum + a.confidence, 0) / totalAgents
    : 0;
  const agreementRatio = totalAgents > 0 ? agreement / totalAgents : 0;

  const ensembleConfidence = Math.round(
    (totalWeight > 0 ? weightedConfidence / totalWeight : avgConfidence) * 0.65 +
    agreementRatio * 35
  );

  const majorityPrediction = majorityScoreGroup[0].prediction;
  const allEvidence: AgentEvidence[] = agentOutputs.flatMap((a) => a.evidence);

  const upsetProbability = computeUpsetProbability(activeAgents, canonicalState);
  const riskRating = computeRiskRating(agreement, totalAgents, avgConfidence);

  let predictionDecision: PredictionResult["predictionDecision"];
  if (canonicalState.status === "FINISHED") {
    predictionDecision = "COMPLETED";
  } else if (agreement === totalAgents) {
    predictionDecision = "UNANIMOUS";
  } else if (agreementRatio >= 0.67) {
    predictionDecision = "STRONG_MAJORITY";
  } else if (agreement >= 2) {
    predictionDecision = "MAJORITY";
  } else {
    predictionDecision = "SPLIT";
  }

  const agentSummaries = activeAgents
    .map((a) => `${a.agentName}: ${a.prediction.winner} ${a.prediction.homeScore ?? "?"}-${a.prediction.awayScore ?? "?"} (${a.confidence}%)`)
    .join("; ");

  const reasoning =
    agreement === totalAgents
      ? `Unanimous ensemble: all ${totalAgents} agents predict ${majorityPrediction.winner} ${majorityPrediction.homeScore ?? "?"}-${majorityPrediction.awayScore ?? "?"}. Ensemble confidence: ${ensembleConfidence}%. Agents: ${agentSummaries}.`
      : `${agreement}/${totalAgents} agents agree on score ${majorityPrediction.homeScore ?? "?"}-${majorityPrediction.awayScore ?? "?"}. Ensemble confidence: ${ensembleConfidence}%. Risk: ${riskRating}. Agents: ${agentSummaries}.`;

  return {
    finalPrediction: majorityPrediction,
    agreement,
    totalAgents,
    confidence: ensembleConfidence,
    minorityOpinion,
    evidence: allEvidence,
    reasoning,
    predictionDecision,
    agents: agentOutputs,
    canonicalState,
    upsetProbability,
    riskRating,
  };
}
