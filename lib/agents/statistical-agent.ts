import {
  VerificationAgent,
  CanonicalMatchState,
  AgentOutput,
  AgentEvidence,
} from "./types";
import {
  getTeamRating,
  getHeadToHeadModifier,
  type TeamRating,
} from "../team-ratings";

const BASE_GOALS_HOME = 1.45;
const BASE_GOALS_AWAY = 1.15;
const MONTE_CARLO_SIMS = 1500;

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
): { homeXG: number; awayXG: number; homeRating: TeamRating; awayRating: TeamRating } {
  const homeRating = getTeamRating(homeTeam);
  const awayRating = getTeamRating(awayTeam);

  const avgStrength = 75;
  const homeAttackMod = (homeRating.attackStrength - 0.5) * 2;
  const awayDefenseMod = (0.5 - awayRating.defenseStrength) * 1.5;
  const awayAttackMod = (awayRating.attackStrength - 0.5) * 2;
  const homeDefenseMod = (0.5 - homeRating.defenseStrength) * 1.5;

  const h2hModifier = getHeadToHeadModifier(homeTeam, awayTeam);

  let homeXG =
    BASE_GOALS_HOME + homeAttackMod + awayDefenseMod + homeRating.homeAdvantage + h2hModifier;
  let awayXG =
    BASE_GOALS_AWAY + awayAttackMod + homeDefenseMod - h2hModifier;

  if (providerHomeScore !== null && providerAwayScore !== null) {
    homeXG = homeXG * 0.4 + providerHomeScore * 0.6;
    awayXG = awayXG * 0.4 + providerAwayScore * 0.6;
  }

  homeXG = Math.max(0.2, Math.min(4.5, homeXG));
  awayXG = Math.max(0.2, Math.min(4.5, awayXG));

  return { homeXG, awayXG, homeRating, awayRating };
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
  awayXG: number
): { home: number; draw: number; away: number } {
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  for (let s = 0; s < MONTE_CARLO_SIMS; s++) {
    const h = samplePoisson(homeXG);
    const a = samplePoisson(awayXG);
    if (h > a) homeWins++;
    else if (h === a) draws++;
    else awayWins++;
  }
  return {
    home: homeWins / MONTE_CARLO_SIMS,
    draw: draws / MONTE_CARLO_SIMS,
    away: awayWins / MONTE_CARLO_SIMS,
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

    const { homeXG, awayXG, homeRating, awayRating } = computeExpectedGoals(
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

    const evidence: AgentEvidence[] = [
      {
        source: "statistical",
        detail: `${state.homeTeam} dynamic rating: ${homeRating.rating}/99 (attack: ${(homeRating.attackStrength * 100).toFixed(0)}%, defense: ${(homeRating.defenseStrength * 100).toFixed(0)}%)`,
        weight: 0.2,
      },
      {
        source: "statistical",
        detail: `${state.awayTeam} dynamic rating: ${awayRating.rating}/99 (attack: ${(awayRating.attackStrength * 100).toFixed(0)}%, defense: ${(awayRating.defenseStrength * 100).toFixed(0)}%)`,
        weight: 0.2,
      },
      {
        source: "statistical",
        detail: `Expected goals: ${state.homeTeam} ${homeXG.toFixed(2)} xG vs ${state.awayTeam} ${awayXG.toFixed(2)} xG`,
        weight: 0.2,
      },
      {
        source: "statistical",
        detail: `Monte Carlo (${MONTE_CARLO_SIMS} sims): Home ${(probs.home * 100).toFixed(1)}% | Draw ${(probs.draw * 100).toFixed(1)}% | Away ${(probs.away * 100).toFixed(1)}%`,
        weight: 0.2,
      },
      {
        source: "statistical",
        detail: `Model certainty: ${confidence}% (entropy-based confidence from probability distribution)`,
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
        `Based on dynamic team ratings and Poisson model, predicts ${state.homeTeam} ${score.home}-${score.away} ${state.awayTeam}. ` +
        `Home win: ${(probs.home * 100).toFixed(0)}%, ` +
        `Draw: ${(probs.draw * 100).toFixed(0)}%, ` +
        `Away win: ${(probs.away * 100).toFixed(0)}%. ` +
        `Team ratings: ${state.homeTeam} ${homeRating.rating} vs ${state.awayTeam} ${awayRating.rating}.`,
      evidence,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start,
    };
  },
};
