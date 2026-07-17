import {
  VerificationAgent,
  CanonicalMatchState,
  AgentOutput,
  AgentEvidence,
} from "./types";

const TEAM_STRENGTH: Record<string, number> = {
  argentina: 92,
  brazil: 90,
  france: 91,
  england: 88,
  spain: 89,
  germany: 87,
  portugal: 86,
  netherlands: 85,
  belgium: 84,
  italy: 85,
  croatia: 82,
  morocco: 78,
  japan: 77,
  "south korea": 76,
  usa: 74,
  mexico: 73,
  senegal: 75,
  uruguay: 83,
  colombia: 79,
  ecuador: 72,
  "iran": 68,
  "australia": 70,
  "serbia": 74,
  "switzerland": 76,
  poland: 75,
  "cameroon": 71,
  "ghana": 70,
  "tunisia": 69,
  "canada": 72,
  "saudi arabia": 65,
  "qatar": 62,
};

const HOME_ADVANTAGE_XG = 0.35;

const BASE_GOALS_HOME = 1.45;
const BASE_GOALS_AWAY = 1.15;

function getStrength(team: string): number {
  return TEAM_STRENGTH[team.toLowerCase().trim()] || 70;
}

function poissonProb(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda;
  for (let i = 1; i <= k; i++) logP += Math.log(lambda) - Math.log(i);
  return Math.exp(logP);
}

function samplePoisson(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

function computeExpectedGoals(
  homeTeam: string,
  awayTeam: string,
  providerHomeScore: number | null,
  providerAwayScore: number | null
): { homeXG: number; awayXG: number } {
  const homeStr = getStrength(homeTeam);
  const awayStr = getStrength(awayTeam);
  const avgStrength = 80;

  const homeAttackStrength = (homeStr - avgStrength) / 100;
  const awayDefenseWeakness = (avgStrength - awayStr) / 120;
  const awayAttackStrength = (awayStr - avgStrength) / 100;
  const homeDefenseWeakness = (avgStrength - homeStr) / 120;

  let homeXG =
    BASE_GOALS_HOME + homeAttackStrength + awayDefenseWeakness + HOME_ADVANTAGE_XG;
  let awayXG =
    BASE_GOALS_AWAY + awayAttackStrength + homeDefenseWeakness;

  if (providerHomeScore !== null && providerAwayScore !== null) {
    const observedHome = providerHomeScore;
    const observedAway = providerAwayScore;
    homeXG = homeXG * 0.4 + observedHome * 0.6;
    awayXG = awayXG * 0.4 + observedAway * 0.6;
  }

  homeXG = Math.max(0.2, Math.min(4.5, homeXG));
  awayXG = Math.max(0.2, Math.min(4.5, awayXG));

  return { homeXG, awayXG };
}

function predictMostLikelyScore(
  homeXG: number,
  awayXG: number
): { home: number; away: number } {
  let bestI = 0;
  let bestJ = 0;
  let bestP = 0;
  for (let i = 0; i <= 5; i++) {
    for (let j = 0; j <= 5; j++) {
      const p = poissonProb(homeXG, i) * poissonProb(awayXG, j);
      if (p > bestP) {
        bestP = p;
        bestI = i;
        bestJ = j;
      }
    }
  }
  return { home: bestI, away: bestJ };
}

function monteCarloWinProbability(
  homeXG: number,
  awayXG: number,
  simulations: number = 10000
): { home: number; draw: number; away: number } {
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  for (let s = 0; s < simulations; s++) {
    const h = samplePoisson(homeXG);
    const a = samplePoisson(awayXG);
    if (h > a) homeWins++;
    else if (h === a) draws++;
    else awayWins++;
  }
  return {
    home: homeWins / simulations,
    draw: draws / simulations,
    away: awayWins / simulations,
  };
}

function computeModelCertainty(probs: {
  home: number;
  draw: number;
  away: number;
}): number {
  const maxProb = Math.max(probs.home, probs.draw, probs.away);
  const entropy =
    -probs.home * Math.log2(Math.max(probs.home, 0.001)) -
    probs.draw * Math.log2(Math.max(probs.draw, 0.001)) -
    probs.away * Math.log2(Math.max(probs.away, 0.001));
  const maxEntropy = Math.log2(3);
  const normalizedCertainty = 1 - entropy / maxEntropy;
  const confidence = Math.round(
    20 + normalizedCertainty * 60 + maxProb * 20
  );
  return Math.min(95, Math.max(15, confidence));
}

export const statisticalAgent: VerificationAgent = {
  id: "statistical",
  name: "Statistical Agent",

  async verify(state: CanonicalMatchState): Promise<AgentOutput> {
    const start = Date.now();

    if (state.sport !== "FOOTBALL") {
      return {
        agentId: "statistical",
        agentName: "Statistical Agent",
        prediction: { winner: "Unknown", homeScore: null, awayScore: null },
        confidence: 0,
        explanation: `UNSUPPORTED_SPORT: Statistical Agent only supports football. Received sport: ${state.sport}.`,
        evidence: [
          {
            source: "statistical",
            detail: `UNSUPPORTED_SPORT: ${state.sport}`,
            weight: 1.0,
          },
        ],
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - start,
      };
    }

    const { homeXG, awayXG } = computeExpectedGoals(
      state.homeTeam,
      state.awayTeam,
      state.homeScore,
      state.awayScore
    );

    const score = predictMostLikelyScore(homeXG, awayXG);
    const probs = monteCarloWinProbability(homeXG, awayXG);
    const confidence = computeModelCertainty(probs);

    let predictedWinner: string;
    if (state.status === "FINISHED" && state.homeScore !== null && state.awayScore !== null) {
      if (state.homeScore > state.awayScore) predictedWinner = state.homeTeam;
      else if (state.awayScore > state.homeScore) predictedWinner = state.awayTeam;
      else predictedWinner = "Draw";
    } else if (probs.home > probs.away) {
      predictedWinner = state.homeTeam;
    } else if (probs.away > probs.home) {
      predictedWinner = state.awayTeam;
    } else {
      predictedWinner = "Draw";
    }

    const homeStr = getStrength(state.homeTeam);
    const awayStr = getStrength(state.awayTeam);

    const evidence: AgentEvidence[] = [
      {
        source: "statistical",
        detail: `${state.homeTeam} strength: ${homeStr}/100`,
        weight: 0.2,
      },
      {
        source: "statistical",
        detail: `${state.awayTeam} strength: ${awayStr}/100`,
        weight: 0.2,
      },
      {
        source: "statistical",
        detail: `Expected goals: ${state.homeTeam} ${homeXG.toFixed(2)} xG vs ${state.awayTeam} ${awayXG.toFixed(2)} xG`,
        weight: 0.2,
      },
      {
        source: "statistical",
        detail: `Win probability: Home ${(probs.home * 100).toFixed(1)}% | Draw ${(probs.draw * 100).toFixed(1)}% | Away ${(probs.away * 100).toFixed(1)}%`,
        weight: 0.2,
      },
      {
        source: "statistical",
        detail: `Model certainty: ${confidence}% (entropy-based)`,
        weight: 0.2,
      },
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
      explanation:
        `Based on team form and strength, predicts ${state.homeTeam} ${score.home}-${score.away} ${state.awayTeam}. ` +
        `${state.homeTeam} win chance: ${(probs.home * 100).toFixed(0)}%, ` +
        `Draw: ${(probs.draw * 100).toFixed(0)}%, ` +
        `${state.awayTeam} win: ${(probs.away * 100).toFixed(0)}%.`,
      evidence,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start,
    };
  },
};
