import { VerificationAgent, CanonicalMatchState, AgentOutput, AgentEvidence } from "./types";

const TEAM_STRENGTH: Record<string, number> = {
  argentina: 92, brazil: 90, france: 91, england: 88, spain: 89,
  germany: 87, portugal: 86, netherlands: 85, belgium: 84, italy: 85,
  croatia: 82, morocco: 78, japan: 77, "south korea": 76, usa: 74,
  mexico: 73, senegal: 75, uruguay: 83, colombia: 79, ecuador: 72,
};

function getStrength(team: string): number {
  return TEAM_STRENGTH[team.toLowerCase().trim()] || 70;
}

function poissonProb(lambda: number, k: number): number {
  let logP = -lambda;
  for (let i = 1; i <= k; i++) logP += Math.log(lambda) - Math.log(i);
  return Math.exp(logP);
}

function estimateGoals(strengthA: number, strengthB: number): number {
  const avgStrength = 80;
  const baseGoals = 1.35;
  const advantage = (strengthA - avgStrength) / 40;
  const opponentWeakness = (avgStrength - strengthB) / 60;
  return Math.max(0.3, baseGoals + advantage + opponentWeakness);
}

function predictScore(homeGoals: number, awayGoals: number): { home: number; away: number } {
  let bestI = 0, bestJ = 0, bestP = 0;
  for (let i = 0; i <= 5; i++) {
    for (let j = 0; j <= 5; j++) {
      const p = poissonProb(homeGoals, i) * poissonProb(awayGoals, j);
      if (p > bestP) { bestP = p; bestI = i; bestJ = j; }
    }
  }
  return { home: bestI, away: bestJ };
}

function winProbability(homeGoals: number, awayGoals: number, simulations = 200): { home: number; draw: number; away: number } {
  let homeWins = 0, draws = 0, awayWins = 0;
  for (let s = 0; s < simulations; s++) {
    const h = samplePoisson(homeGoals);
    const a = samplePoisson(awayGoals);
    if (h > a) homeWins++;
    else if (h === a) draws++;
    else awayWins++;
  }
  return { home: homeWins / simulations, draw: draws / simulations, away: awayWins / simulations };
}

function samplePoisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

export const statisticalAgent: VerificationAgent = {
  id: "statistical",
  name: "Statistical Agent",

  async verify(state: CanonicalMatchState): Promise<AgentOutput> {
    const start = Date.now();

    const homeStr = getStrength(state.homeTeam);
    const awayStr = getStrength(state.awayTeam);
    const homeGoals = estimateGoals(homeStr, awayStr);
    const awayGoals = estimateGoals(awayStr, homeStr);
    const score = predictScore(homeGoals, awayGoals);
    const probs = winProbability(homeGoals, awayGoals);

    const predictedWinner = probs.home > probs.away
      ? state.homeTeam
      : probs.away > probs.home
        ? state.awayTeam
        : "Draw";

    const maxProb = Math.max(probs.home, probs.draw, probs.away);
    const confidence = Math.round(maxProb * 100);

    const evidence: AgentEvidence[] = [
      { source: "statistical", detail: `${state.homeTeam} strength: ${homeStr}/100`, weight: 0.3 },
      { source: "statistical", detail: `${state.awayTeam} strength: ${awayStr}/100`, weight: 0.3 },
      { source: "statistical", detail: `Expected goals: ${homeGoals.toFixed(2)} vs ${awayGoals.toFixed(2)}`, weight: 0.2 },
      { source: "statistical", detail: `Win probability: H${(probs.home * 100).toFixed(0)}% D${(probs.draw * 100).toFixed(0)}% A${(probs.away * 100).toFixed(0)}%`, weight: 0.2 },
    ];

    return {
      agentId: "statistical",
      agentName: "Statistical Agent",
      prediction: {
        winner: predictedWinner,
        homeScore: score.home,
        awayScore: score.away,
      },
      confidence,
      explanation: `Poisson model predicts ${state.homeTeam} ${score.home}-${score.away} ${state.awayTeam}. ` +
        `${state.homeTeam} win probability: ${(probs.home * 100).toFixed(0)}%, ` +
        `draw: ${(probs.draw * 100).toFixed(0)}%, ` +
        `${state.awayTeam} win: ${(probs.away * 100).toFixed(0)}%. ` +
        `Based on team strength ratings (H:${homeStr} vs A:${awayStr}).`,
      evidence,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start,
    };
  },
};
