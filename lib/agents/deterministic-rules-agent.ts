import {
  VerificationAgent,
  CanonicalMatchState,
  AgentOutput,
  AgentEvidence,
} from "./types";

interface RuleCheck {
  name: string;
  passed: boolean;
  detail: string;
  weight: number;
  category: "data" | "integrity" | "temporal" | "consensus";
}

export const deterministicRulesAgent: VerificationAgent = {
  id: "deterministic-rules",
  name: "Deterministic Rules Agent",

  async verify(state: CanonicalMatchState): Promise<AgentOutput> {
    const start = Date.now();
    const rules: RuleCheck[] = [];

    if (state.sport !== "FOOTBALL") {
      return {
        agentId: "deterministic-rules",
        agentName: "Deterministic Rules Agent",
        prediction: { winner: "Unknown", homeScore: null, awayScore: null },
        confidence: 0,
        explanation: `UNSUPPORTED_SPORT: Deterministic Rules Agent only supports football. Received sport: ${state.sport}.`,
        evidence: [
          {
            source: "deterministic-rules",
            detail: `UNSUPPORTED_SPORT: ${state.sport}`,
            weight: 1.0,
          },
        ],
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - start,
      };
    }

    rules.push({
      name: "provider_agreement",
      passed: state.providerCount >= 2,
      detail:
        state.providerCount >= 2
          ? `${state.providerCount} providers agree on match state — canonical data confirmed`
          : `Only ${state.providerCount} provider(s) available — need at least 2 for consensus`,
      weight: 0.25,
      category: "consensus",
    });

    rules.push({
      name: "match_completed",
      passed: state.status === "FINISHED",
      detail:
        state.status === "FINISHED"
          ? "Match status is FINISHED — full-time score available for settlement"
          : `Match status is ${state.status} — final score not yet confirmed`,
      weight: 0.2,
      category: "data",
    });

    const matchDate = new Date(state.matchDate);
    const now = new Date();
    const hoursDiff =
      (now.getTime() - matchDate.getTime()) / (1000 * 60 * 60);
    const timestampValid = hoursDiff >= -24 && hoursDiff <= 48;
    rules.push({
      name: "timestamp_validation",
      passed: timestampValid,
      detail: timestampValid
        ? `Match date within valid range (${hoursDiff.toFixed(1)}h from now) — no temporal anomalies detected`
        : `Match date ${state.matchDate} outside valid range (${hoursDiff.toFixed(1)}h from now) — potential data staleness`,
      weight: 0.15,
      category: "temporal",
    });

    const scoresExist =
      state.homeScore !== null && state.awayScore !== null;
    const scoresPlausible = scoresExist
      ? state.homeScore! >= 0 &&
        state.awayScore! >= 0 &&
        state.homeScore! <= 20 &&
        state.awayScore! <= 20
      : state.status !== "FINISHED";
    rules.push({
      name: "score_consistency",
      passed: scoresPlausible,
      detail: scoresPlausible
        ? scoresExist
          ? `Scores plausible: ${state.homeScore}-${state.awayScore} — within expected football range`
          : "Scores pending — consistent with non-FINISHED status"
        : `Implausible scores: ${state.homeScore}-${state.awayScore} — outside expected football range`,
      weight: 0.15,
      category: "integrity",
    });

    const healthyProviders = state.providerHealth.filter((h) => h.available);
    const providerHealthOk = healthyProviders.length >= 2;
    rules.push({
      name: "provider_health",
      passed: providerHealthOk,
      detail: providerHealthOk
        ? `${healthyProviders.length}/${state.providerHealth.length} providers healthy — data pipeline operational`
        : `Only ${healthyProviders.length}/${state.providerHealth.length} providers healthy — degraded data pipeline`,
      weight: 0.1,
      category: "data",
    });

    const avgLatency = state.providerHealth.length > 0
      ? state.providerHealth.reduce((sum, h) => sum + h.latencyMs, 0) / state.providerHealth.length
      : 0;
    const latencyOk = avgLatency < 10000;
    rules.push({
      name: "response_latency",
      passed: latencyOk,
      detail: latencyOk
        ? `Average provider latency: ${avgLatency.toFixed(0)}ms — within acceptable range`
        : `Average provider latency: ${avgLatency.toFixed(0)}ms — elevated, may indicate provider issues`,
      weight: 0.05,
      category: "data",
    });

    const duplicateCheck = state.rawResults.length <= 4;
    rules.push({
      name: "duplicate_detection",
      passed: duplicateCheck,
      detail: duplicateCheck
        ? `${state.rawResults.length} raw results — no suspicious duplication detected`
        : `${state.rawResults.length} raw results — possible duplicate data detected`,
      weight: 0.1,
      category: "integrity",
    });

    const passedRules = rules.filter((r) => r.passed);
    const totalWeight = rules.reduce((sum, r) => sum + r.weight, 0);
    const passedWeight = passedRules.reduce(
      (sum, r) => sum + r.weight,
      0
    );
    const confidence = Math.round((passedWeight / totalWeight) * 100);

    let predictedWinner: string;
    let homeScore: number | null = null;
    let awayScore: number | null = null;

    if (
      state.status === "FINISHED" &&
      state.homeScore !== null &&
      state.awayScore !== null
    ) {
      homeScore = state.homeScore;
      awayScore = state.awayScore;
      if (state.homeScore > state.awayScore)
        predictedWinner = state.homeTeam;
      else if (state.awayScore > state.homeScore)
        predictedWinner = state.awayTeam;
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
    const explanation =
      failedRules.length === 0
        ? `All ${rules.length} data integrity checks passed. Match result is verified for settlement.`
        : `${passedRules.length}/${rules.length} checks passed. Issues: ${failedRules.map((r) => r.name.replace(/_/g, " ")).join(", ")}.`;

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
