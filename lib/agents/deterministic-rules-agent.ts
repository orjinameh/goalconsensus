import { VerificationAgent, CanonicalMatchState, AgentOutput, AgentEvidence } from "./types";

interface RuleCheck {
  name: string;
  passed: boolean;
  detail: string;
  weight: number;
}

export const deterministicRulesAgent: VerificationAgent = {
  id: "deterministic-rules",
  name: "Deterministic Rules Agent",

  async verify(state: CanonicalMatchState): Promise<AgentOutput> {
    const start = Date.now();
    const rules: RuleCheck[] = [];

    rules.push({
      name: "provider_agreement",
      passed: state.providerCount >= 2,
      detail: state.providerCount >= 2
        ? `${state.providerCount} providers agree on match state`
        : `Only ${state.providerCount} provider(s) available — need at least 2`,
      weight: 0.3,
    });

    rules.push({
      name: "match_completed",
      passed: state.status === "FINISHED",
      detail: state.status === "FINISHED"
        ? "Match status is FINISHED — canonical score available"
        : `Match status is ${state.status} — final score not yet confirmed`,
      weight: 0.25,
    });

    const matchDate = new Date(state.matchDate);
    const now = new Date();
    const hoursDiff = (now.getTime() - matchDate.getTime()) / (1000 * 60 * 60);
    const timestampValid = hoursDiff >= -24 && hoursDiff <= 48;
    rules.push({
      name: "timestamp_validation",
      passed: timestampValid,
      detail: timestampValid
        ? `Match date is within valid range (${hoursDiff.toFixed(1)}h from now)`
        : `Match date ${state.matchDate} is outside valid range (${hoursDiff.toFixed(1)}h from now)`,
      weight: 0.15,
    });

    const scoresExist = state.homeScore !== null && state.awayScore !== null;
    const scoresPlausible = scoresExist
      ? state.homeScore! >= 0 && state.awayScore! >= 0 && state.homeScore! <= 20 && state.awayScore! <= 20
      : state.status !== "FINISHED";
    rules.push({
      name: "data_consistency",
      passed: scoresPlausible,
      detail: scoresPlausible
        ? scoresExist
          ? `Scores are plausible: ${state.homeScore}-${state.awayScore}`
          : "Scores pending — consistent with non-FINISHED status"
        : `Implausible scores: ${state.homeScore}-${state.awayScore}`,
      weight: 0.2,
    });

    rules.push({
      name: "provider_health",
      passed: state.providerHealth.filter((h) => h.available).length >= 2,
      detail: `${state.providerHealth.filter((h) => h.available).length}/${state.providerHealth.length} providers healthy`,
      weight: 0.1,
    });

    const passedRules = rules.filter((r) => r.passed);
    const totalWeight = rules.reduce((sum, r) => sum + r.weight, 0);
    const passedWeight = passedRules.reduce((sum, r) => sum + r.weight, 0);
    const confidence = Math.round((passedWeight / totalWeight) * 100);

    let predictedWinner: string;
    let homeScore: number | null = null;
    let awayScore: number | null = null;

    if (state.status === "FINISHED" && state.homeScore !== null && state.awayScore !== null) {
      homeScore = state.homeScore;
      awayScore = state.awayScore;
      if (state.homeScore > state.awayScore) predictedWinner = state.homeTeam;
      else if (state.awayScore > state.homeScore) predictedWinner = state.awayTeam;
      else predictedWinner = "Draw";
    } else {
      predictedWinner = state.homeTeam;
      homeScore = null;
      awayScore = null;
    }

    const evidence: AgentEvidence[] = rules.map((r) => ({
      source: "deterministic-rules",
      detail: `[${r.passed ? "PASS" : "FAIL"}] ${r.name}: ${r.detail}`,
      weight: r.weight,
    }));

    const failedRules = rules.filter((r) => !r.passed);
    const explanation = failedRules.length === 0
      ? `All ${rules.length} validation rules passed. Match state is verified.`
      : `${passedRules.length}/${rules.length} rules passed. Failed: ${failedRules.map((r) => r.name).join(", ")}.`;

    return {
      agentId: "deterministic-rules",
      agentName: "Deterministic Rules Agent",
      prediction: {
        winner: predictedWinner,
        homeScore,
        awayScore,
      },
      confidence,
      explanation,
      evidence,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start,
    };
  },
};
