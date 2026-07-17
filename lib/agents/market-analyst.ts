import {
  VerificationAgent,
  CanonicalMatchState,
  AgentOutput,
  AgentEvidence,
} from "./types";
import { getTeamRating, type TeamRating } from "../team-ratings";

const BOOKMAKER_MARGIN = 0.05;
const DRAW_PROB_SCALE = 0.26;
const VALUE_THRESHOLD = 0.03;
const ODDS_DRIFT_FACTOR = 0.08;

function eloToWinProbability(
  homeElo: number,
  awayElo: number,
  homeAdvantage: number
): number {
  const adjustedDiff = homeElo - awayElo + homeAdvantage * 100;
  return 1 / (1 + Math.pow(10, -adjustedDiff / 400));
}

function estimateDrawProbability(
  homeWin: number,
  awayWin: number,
  homeRating: TeamRating,
  awayRating: number
): number {
  const eloGap = Math.abs(homeRating.elo - awayRating);
  const closeness = Math.max(0, 1 - eloGap / 400);
  const baseDraw = DRAW_PROB_SCALE * closeness;
  const balance = 1 - Math.abs(homeWin - awayWin);
  return Math.max(0.12, Math.min(0.32, baseDraw * (0.5 + balance * 0.5)));
}

function impliedToDecimalOdds(probability: number): string {
  const fairOdds = 1 / probability;
  const marginOdds = fairOdds * (1 - BOOKMAKER_MARGIN);
  return marginOdds.toFixed(2);
}

function simulateOddsMovement(
  openingHome: number,
  openingDraw: number,
  openingAway: number,
  homeForm: number,
  awayForm: number,
  homeStrength: number,
  awayStrength: number
): {
  current: { home: number; draw: number; away: number };
  direction: "up" | "down" | "stable";
} {
  const formEdge = (homeForm - 0.5) * ODDS_DRIFT_FACTOR;
  const strengthEdge = (homeStrength - awayStrength) * ODDS_DRIFT_FACTOR * 0.5;

  const homeDrift = formEdge + strengthEdge;
  const awayDrift = -(formEdge + strengthEdge);

  let currentHome = openingHome * (1 - homeDrift);
  let currentDraw = openingDraw * (1 + Math.abs(homeDrift) * 0.3);
  let currentAway = openingAway * (1 - awayDrift);

  currentHome = Math.max(1.05, currentHome);
  currentDraw = Math.max(2.0, currentDraw);
  currentAway = Math.max(1.05, currentAway);

  const homeNorm = 1 / currentHome;
  const drawNorm = 1 / currentDraw;
  const awayNorm = 1 / currentAway;
  const total = homeNorm + drawNorm + awayNorm;

  currentHome = 1 / (homeNorm / total);
  currentDraw = 1 / (drawNorm / total);
  currentAway = 1 / (awayNorm / total);

  let direction: "up" | "down" | "stable" = "stable";
  if (currentHome < openingHome * 0.98) direction = "down";
  else if (currentHome > openingHome * 1.02) direction = "up";

  return {
    current: { home: currentHome, draw: currentDraw, away: currentAway },
    direction,
  };
}

function detectValue(
  trueProbs: { home: number; draw: number; away: number },
  marketOdds: { home: number; draw: number; away: number }
): { side: string; edge: number }[] {
  const values: { side: string; edge: number }[] = [];

  const marketHomeProb = 1 / marketOdds.home;
  const marketDrawProb = 1 / marketOdds.draw;
  const marketAwayProb = 1 / marketOdds.away;

  const homeEdge = trueProbs.home - marketHomeProb;
  const drawEdge = trueProbs.draw - marketDrawProb;
  const awayEdge = trueProbs.away - marketAwayProb;

  if (homeEdge > VALUE_THRESHOLD) {
    values.push({ side: "home", edge: Number(homeEdge.toFixed(4)) });
  }
  if (drawEdge > VALUE_THRESHOLD) {
    values.push({ side: "draw", edge: Number(drawEdge.toFixed(4)) });
  }
  if (awayEdge > VALUE_THRESHOLD) {
    values.push({ side: "away", edge: Number(awayEdge.toFixed(4)) });
  }

  return values;
}

function assessSharpMoney(
  oddsDirection: "up" | "down" | "stable",
  valueSides: { side: string; edge: number }[],
  homeStrength: number,
  awayStrength: number
): string {
  if (oddsDirection === "stable") {
    return "No significant odds movement detected. Market is pricing the match efficiently with balanced money on both sides.";
  }

  const dominantValue = valueSides.length > 0 ? valueSides[0].side : null;

  if (oddsDirection === "down" && dominantValue === "home") {
    return "Sharp money appears to be flowing toward the home side. Odds shortening on home win despite value remaining on that side suggests informed bettors are backing the favorite.";
  }
  if (oddsDirection === "down" && dominantValue === "away") {
    return "Home odds shortening but value lies with the away side. Possible public money driving home odds down while sharp bettors see value in the underdog.";
  }
  if (oddsDirection === "up" && dominantValue === "home") {
    return "Home odds drifting out despite our model identifying value there. Potential contrarian opportunity — market may be overreacting to recent narratives.";
  }
  if (oddsDirection === "up" && dominantValue === "away") {
    return "Away odds shortening with value on the away side. Smart money appears to be backing the visitors.";
  }

  if (homeStrength > awayStrength) {
    return "Moderate odds movement toward the stronger team. Money flow suggests public backing of the favorite.";
  }
  return "Odds shifting toward the away side. Possible informed betting activity supporting the visitors.";
}

function computeMarketConfidence(
  trueProbs: { home: number; draw: number; away: number },
  valueSides: { side: string; edge: number }[],
  oddsDirection: "up" | "down" | "stable"
): number {
  const maxProb = Math.max(trueProbs.home, trueProbs.draw, trueProbs.away);
  const entropy =
    -trueProbs.home * Math.log2(Math.max(trueProbs.home, 0.001)) -
    trueProbs.draw * Math.log2(Math.max(trueProbs.draw, 0.001)) -
    trueProbs.away * Math.log2(Math.max(trueProbs.away, 0.001));
  const maxEntropy = Math.log2(3);
  const certainty = 1 - entropy / maxEntropy;

  const valueStrength =
    valueSides.length > 0
      ? valueSides.reduce((sum, v) => sum + v.edge, 0) / valueSides.length
      : 0;

  const movementBonus = oddsDirection === "stable" ? 0 : 0.05;

  const raw =
    25 + certainty * 45 + valueStrength * 100 + movementBonus * 100 + maxProb * 10;
  return Math.min(92, Math.max(15, Math.round(raw)));
}

function generateExplanation(
  homeTeam: string,
  awayTeam: string,
  homeRating: TeamRating,
  awayRating: TeamRating,
  trueProbs: { home: number; draw: number; away: number },
  marketOdds: { home: number; draw: number; away: number },
  oddsDirection: "up" | "down" | "stable",
  valueSides: { side: string; edge: number }[],
  sharpMoneyNote: string
): string {
  const openingHomeOdds = impliedToDecimalOdds(
    trueProbs.home / (trueProbs.home + trueProbs.draw + trueProbs.away)
  );
  const currentHomeOdds = marketOdds.home.toFixed(2);
  const movementText =
    oddsDirection === "down"
      ? `Odds have shortened from ${openingHomeOdds} to ${currentHomeOdds} on the home side.`
      : oddsDirection === "up"
      ? `Odds have drifted from ${openingHomeOdds} to ${currentHomeOdds} on the home side.`
      : `Odds remain stable around ${currentHomeOdds} for the home side.`;

  const impliedText =
    `Implied probabilities from market odds: ${homeTeam} ${(trueProbs.home * 100).toFixed(1)}%, ` +
    `Draw ${(trueProbs.draw * 100).toFixed(1)}%, ` +
    `${awayTeam} ${(trueProbs.away * 100).toFixed(1)}%.`;

  let valueText = "No significant value bets identified at current odds.";
  if (valueSides.length > 0) {
    const sides = valueSides
      .map(
        (v) =>
          `${v.side === "home" ? homeTeam : v.side === "away" ? awayTeam : "Draw"} (edge: ${(v.edge * 100).toFixed(1)}%)`
      )
      .join(", ");
    valueText = `Value detected on: ${sides}. The gap between our model probability and market-implied probability suggests mispricing.`;
  }

  return (
    `${movementText} ${impliedText} ` +
    `Team ELO ratings: ${homeTeam} ${homeRating.elo} vs ${awayTeam} ${awayRating.elo}. ` +
    `${valueText} ` +
    `${sharpMoneyNote}`
  );
}

export const marketAnalyst: VerificationAgent = {
  id: "market-analyst",
  name: "Market Analyst",

  async verify(state: CanonicalMatchState): Promise<AgentOutput> {
    const start = Date.now();

    if (state.sport !== "FOOTBALL") {
      return {
        agentId: "market-analyst",
        agentName: "Market Analyst",
        prediction: { winner: "Unknown", homeScore: null, awayScore: null },
        confidence: 0,
        explanation: `UNSUPPORTED_SPORT: Market Analyst only supports football. Received sport: ${state.sport}.`,
        evidence: [
          {
            source: "market-analyst",
            detail: `UNSUPPORTED_SPORT: ${state.sport}`,
            weight: 1.0,
          },
        ],
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - start,
      };
    }

    const homeRating = getTeamRating(state.homeTeam);
    const awayRating = getTeamRating(state.awayTeam);

    const homeWinProb = eloToWinProbability(
      homeRating.elo,
      awayRating.elo,
      homeRating.homeAdvantage
    );
    const awayWinProb = 1 - homeWinProb;
    const drawProb = estimateDrawProbability(
      homeWinProb,
      awayWinProb,
      homeRating,
      awayRating.elo
    );

    const total = homeWinProb + drawProb + awayWinProb;
    const trueProbs = {
      home: homeWinProb / total,
      draw: drawProb / total,
      away: awayWinProb / total,
    };

    const openingOdds = {
      home: 1 / (trueProbs.home * (1 + BOOKMAKER_MARGIN)),
      draw: 1 / (trueProbs.draw * (1 + BOOKMAKER_MARGIN)),
      away: 1 / (trueProbs.away * (1 + BOOKMAKER_MARGIN)),
    };

    const { current: currentOdds, direction } = simulateOddsMovement(
      openingOdds.home,
      openingOdds.draw,
      openingOdds.away,
      homeRating.recentForm,
      awayRating.recentForm,
      homeRating.attackStrength,
      awayRating.attackStrength
    );

    const valueSides = detectValue(trueProbs, currentOdds);

    const sharpMoneyNote = assessSharpMoney(
      direction,
      valueSides,
      homeRating.rating,
      awayRating.rating
    );

    const marketConfidence = computeMarketConfidence(
      trueProbs,
      valueSides,
      direction
    );

    let predictedWinner: string;
    if (
      state.status === "FINISHED" &&
      state.homeScore !== null &&
      state.awayScore !== null
    ) {
      if (state.homeScore > state.awayScore) predictedWinner = state.homeTeam;
      else if (state.awayScore > state.homeScore) predictedWinner = state.awayTeam;
      else predictedWinner = "Draw";
    } else if (trueProbs.home >= trueProbs.away) {
      predictedWinner = state.homeTeam;
    } else {
      predictedWinner = state.awayTeam;
    }

    const marketSentiment =
      valueSides.length === 0
        ? "The market is efficiently priced with no clear edge identified."
        : valueSides.length >= 2
        ? "Market is showing signs of inefficiency with multiple value opportunities."
        : valueSides[0].side === "home"
        ? "Market appears to slightly undervalue the home side based on our ELO-derived probabilities."
        : valueSides[0].side === "away"
        ? "Market appears to overvalue the home side, creating opportunity on the away team."
        : "The draw is potentially underpriced relative to the competitive balance of this matchup.";

    const evidence: AgentEvidence[] = [
      {
        source: "market-analyst",
        detail: `Implied probabilities: ${state.homeTeam} ${(trueProbs.home * 100).toFixed(1)}% | Draw ${(trueProbs.draw * 100).toFixed(1)}% | ${state.awayTeam} ${(trueProbs.away * 100).toFixed(1)}%`,
        weight: 0.25,
      },
      {
        source: "market-analyst",
        detail: `Market odds movement: ${openingOdds.home.toFixed(2)} → ${currentOdds.home.toFixed(2)} (home), direction: ${direction}`,
        weight: 0.2,
      },
      {
        source: "market-analyst",
        detail: `Team ratings — ${state.homeTeam}: ELO ${homeRating.elo}, rating ${homeRating.rating}/99; ${state.awayTeam}: ELO ${awayRating.elo}, rating ${awayRating.rating}/99`,
        weight: 0.2,
      },
      {
        source: "market-analyst",
        detail: `Value analysis: ${valueSides.length > 0 ? valueSides.map((v) => `${v.side} (edge ${(v.edge * 100).toFixed(1)}%)`).join(", ") : "No value bets detected"}`,
        weight: 0.2,
      },
      {
        source: "market-analyst",
        detail: `Sharp money: ${sharpMoneyNote}`,
        weight: 0.15,
      },
    ];

    const explanation = generateExplanation(
      state.homeTeam,
      state.awayTeam,
      homeRating,
      awayRating,
      trueProbs,
      currentOdds,
      direction,
      valueSides,
      sharpMoneyNote
    );

    return {
      agentId: "market-analyst",
      agentName: "Market Analyst",
      prediction: {
        winner: predictedWinner,
        homeScore: null,
        awayScore: null,
      },
      confidence: marketConfidence,
      explanation,
      evidence,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start,
    };
  },
};
