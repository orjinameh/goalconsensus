import {
  VerificationAgent,
  CanonicalMatchState,
  AgentOutput,
  AgentEvidence,
} from "./types";
import { getTeamRating, TeamRating } from "../team-ratings";

const FORMATIONS = [
  "4-3-3",
  "4-4-2",
  "3-5-2",
  "4-2-3-1",
  "3-4-3",
  "4-1-4-1",
  "5-3-2",
  "4-3-2-1",
];

function deterministicIndex(seed: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % mod;
}

function pickFormation(team: string): string {
  return FORMATIONS[deterministicIndex(team, FORMATIONS.length)];
}

function pressingIntensity(rating: TeamRating): string {
  if (rating.attackStrength > 0.75) return "high-intensity";
  if (rating.attackStrength > 0.55) return "moderate";
  return "low-block";
}

function pressingDescription(rating: TeamRating): string {
  if (rating.attackStrength > 0.75)
    return "Aggressive high press with coordinated triggers across the front line, aiming to win the ball within 8 seconds of losing it.";
  if (rating.attackStrength > 0.55)
    return "Selective pressing in the middle third, dropping into a compact shape when the ball is in advanced areas.";
  return "Deep defensive block with minimal pressing, absorbing pressure and looking to transition quickly.";
}

function setPieceThreat(rating: TeamRating): string {
  if (rating.attackStrength > 0.7) return "HIGH";
  if (rating.attackStrength > 0.5) return "MEDIUM";
  return "LOW";
}

function counterAttackThreat(rating: TeamRating): string {
  const score = (rating.attackStrength + rating.recentForm) / 2;
  if (score > 0.7) return "HIGH";
  if (score > 0.5) return "MEDIUM";
  return "LOW";
}

function defensiveOrganization(rating: TeamRating): string {
  if (rating.defenseStrength > 0.7) return "Excellent";
  if (rating.defenseStrength > 0.5) return "Solid";
  return "Vulnerable";
}

function deriveStrengths(rating: TeamRating): string[] {
  const strengths: string[] = [];
  if (rating.attackStrength > 0.7) strengths.push("Clinical finishing in the final third");
  if (rating.attackStrength > 0.55) strengths.push("Effective wide play and crossing");
  if (rating.defenseStrength > 0.7) strengths.push("Well-organized defensive unit");
  if (rating.defenseStrength > 0.55) strengths.push("Strong aerial presence at set pieces");
  if (rating.recentForm > 0.65) strengths.push("Strong recent form and momentum");
  if (rating.homeAdvantage > 0.3) strengths.push("Exploits home-field advantage well");
  if (strengths.length === 0) strengths.push("Collective discipline and work rate");
  return strengths;
}

function deriveWeaknesses(rating: TeamRating): string[] {
  const weaknesses: string[] = [];
  if (rating.attackStrength < 0.45) weaknesses.push("Struggles to create clear-cut chances");
  if (rating.defenseStrength < 0.45) weaknesses.push("Prone to defensive lapses in transition");
  if (rating.recentForm < 0.4) weaknesses.push("Poor recent form affecting confidence");
  if (rating.attackStrength < 0.55) weaknesses.push("Lacks a consistent goal threat");
  if (rating.defenseStrength < 0.55) weaknesses.push("Vulnerable to pace on the counter");
  if (weaknesses.length === 0) weaknesses.push("Occasional complacency when leading");
  return weaknesses;
}

function derivePlayerMatchups(
  homeTeam: string,
  awayTeam: string,
  homeRating: TeamRating,
  awayRating: TeamRating
): { home: string; away: string; advantage: string }[] {
  const homeMidfieldEdge = homeRating.attackStrength > awayRating.attackStrength;
  const homeDefensiveEdge = homeRating.defenseStrength > awayRating.defenseStrength;

  return [
    {
      home: `${homeTeam} midfield`,
      away: `${awayTeam} midfield`,
      advantage: homeMidfieldEdge ? homeTeam : awayTeam,
    },
    {
      home: `${homeTeam} defence`,
      away: `${awayTeam} attack`,
      advantage: homeDefensiveEdge ? homeTeam : awayTeam,
    },
    {
      home: `${homeTeam} attack`,
      away: `${awayTeam} defence`,
      advantage: homeMidfieldEdge ? homeTeam : awayTeam,
    },
  ];
}

function deriveSubstitutions(
  rating: TeamRating,
  teamName: string
): string[] {
  const subs: string[] = [];
  if (rating.attackStrength < 0.5) {
    subs.push(`Introduce a fresh attacking option off the bench around 60' to add creativity`);
  }
  if (rating.recentForm < 0.45) {
    subs.push(`Bring on a high-energy midfielder at half-time to improve pressing intensity`);
  }
  if (rating.defenseStrength < 0.5) {
    subs.push(`Defensive reinforcement expected around 70' to protect any lead`);
  }
  subs.push(`Tactical substitution around 75' to manage fitness and maintain shape`);
  return subs;
}

function predictScore(
  homeRating: TeamRating,
  awayRating: TeamRating
): { homeScore: number; awayScore: number } {
  const homeGoals = (homeRating.expectedGoals + homeRating.attackStrength * 0.8) / 2;
  const awayGoals = (awayRating.expectedGoals + awayRating.attackStrength * 0.8) / 2;
  const homeScore = Math.round(Math.max(0, Math.min(5, homeGoals)));
  const awayScore = Math.round(Math.max(0, Math.min(5, awayGoals)));
  return { homeScore, awayScore };
}

function computeTacticalConfidence(
  homeRating: TeamRating,
  awayRating: TeamRating,
  state: CanonicalMatchState
): number {
  const ratingDiff = Math.abs(homeRating.rating - awayRating.rating);
  const baseConfidence = 40 + ratingDiff * 0.4;
  const providerBonus = Math.min(10, state.providerCount * 2);
  const healthBonus = state.providerHealth.filter((h) => h.available).length > 0 ? 5 : 0;
  return Math.round(Math.min(85, baseConfidence + providerBonus + healthBonus));
}

function buildExplanation(
  state: CanonicalMatchState,
  homeRating: TeamRating,
  awayRating: TeamRating,
  homeFormation: string,
  awayFormation: string,
  predictedWinner: string,
  predictedScore: { homeScore: number; awayScore: number }
): string {
  const homePressing = pressingDescription(homeRating);
  const awayPressing = pressingDescription(awayRating);
  const homeDefOrg = defensiveOrganization(homeRating);
  const awayDefOrg = defensiveOrganization(awayRating);
  const homeSetPiece = setPieceThreat(homeRating);
  const awaySetPiece = setPieceThreat(awayRating);

  const lines: string[] = [];

  lines.push(
    `Tactical Preview: ${state.homeTeam} vs ${state.awayTeam}.`
  );
  lines.push(
    `${state.homeTeam} are likely to line up in a ${homeFormation}, while ${state.awayTeam} are expected to deploy a ${awayFormation}.`
  );
  lines.push(
    `${state.homeTeam}'s pressing profile: ${homePressing}. Their defensive organization is rated ${homeDefOrg} (defense strength ${homeRating.defenseStrength.toFixed(2)}).`
  );
  lines.push(
    `${state.awayTeam}'s pressing profile: ${awayPressing}. Their defensive organization is rated ${awayDefOrg} (defense strength ${awayRating.defenseStrength.toFixed(2)}).`
  );
  lines.push(
    `Set piece threat: ${state.homeTeam} ${homeSetPiece}, ${state.awayTeam} ${awaySetPiece}.`
  );
  lines.push(
    `The tactical balance favors ${predictedWinner} based on overall team ratings and stylistic matchup.`
  );
  lines.push(
    `Projected scoreline: ${predictedScore.homeScore}-${predictedScore.awayScore}.`
  );
  lines.push(
    `Key tactical battle will be in midfield, where ${state.homeTeam}'s ${homeRating.attackStrength.toFixed(2)} attack strength meets ${state.awayTeam}'s ${awayRating.defenseStrength.toFixed(2)} defensive solidity.`
  );

  return lines.join(" ");
}

export const tacticalAnalyst: VerificationAgent = {
  id: "tactical-analyst",
  name: "Tactical Analyst",

  async verify(state: CanonicalMatchState): Promise<AgentOutput> {
    const start = Date.now();

    if (state.sport !== "FOOTBALL") {
      return {
        agentId: "tactical-analyst",
        agentName: "Tactical Analyst",
        prediction: { winner: "Unknown", homeScore: null, awayScore: null },
        confidence: 0,
        explanation: `UNSUPPORTED_SPORT: Tactical Analyst only supports football. Received sport: ${state.sport}.`,
        evidence: [
          {
            source: "tactical-analyst",
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

    const homeFormation = pickFormation(state.homeTeam);
    const awayFormation = pickFormation(state.awayTeam);

    const homeScore = predictScore(homeRating, awayRating);

    let predictedWinner: string;
    const homeTacticalEdge =
      homeRating.attackStrength * 0.4 +
      homeRating.defenseStrength * 0.3 +
      homeRating.recentForm * 0.3;
    const awayTacticalEdge =
      awayRating.attackStrength * 0.4 +
      awayRating.defenseStrength * 0.3 +
      awayRating.recentForm * 0.3;

    if (homeTacticalEdge > awayTacticalEdge + 0.05) {
      predictedWinner = state.homeTeam;
    } else if (awayTacticalEdge > homeTacticalEdge + 0.05) {
      predictedWinner = state.awayTeam;
    } else {
      predictedWinner = "Draw";
    }

    if (state.status === "FINISHED" && state.homeScore !== null && state.awayScore !== null) {
      homeScore.homeScore = state.homeScore;
      homeScore.awayScore = state.awayScore;
      if (state.homeScore > state.awayScore) predictedWinner = state.homeTeam;
      else if (state.awayScore > state.homeScore) predictedWinner = state.awayTeam;
      else predictedWinner = "Draw";
    }

    const confidence = computeTacticalConfidence(homeRating, awayRating, state);

    const playerMatchups = derivePlayerMatchups(
      state.homeTeam,
      state.awayTeam,
      homeRating,
      awayRating
    );

    const homeSubs = deriveSubstitutions(homeRating, state.homeTeam);
    const awaySubs = deriveSubstitutions(awayRating, state.awayTeam);

    const evidence: AgentEvidence[] = [
      {
        source: "tactical-analyst",
        detail: `Formation Analysis: ${state.homeTeam} ${homeFormation} vs ${state.awayTeam} ${awayFormation}. Home attack strength ${homeRating.attackStrength.toFixed(2)} vs away ${awayRating.attackStrength.toFixed(2)}.`,
        weight: 0.25,
      },
      {
        source: "tactical-analyst",
        detail: `Pressing Intensity: ${state.homeTeam} ${pressingIntensity(homeRating)} (form ${homeRating.recentForm.toFixed(2)}), ${state.awayTeam} ${pressingIntensity(awayRating)} (form ${awayRating.recentForm.toFixed(2)}).`,
        weight: 0.2,
      },
      {
        source: "tactical-analyst",
        detail: `Set Piece Threat: ${state.homeTeam} ${setPieceThreat(homeRating)}, ${state.awayTeam} ${setPieceThreat(awayRating)}.`,
        weight: 0.15,
      },
      {
        source: "tactical-analyst",
        detail: `Counter-Attack Threat: ${state.homeTeam} ${counterAttackThreat(homeRating)}, ${state.awayTeam} ${counterAttackThreat(awayRating)}.`,
        weight: 0.15,
      },
      {
        source: "tactical-analyst",
        detail: `Defensive Organization: ${state.homeTeam} ${defensiveOrganization(homeRating)} (${homeRating.defenseStrength.toFixed(2)}), ${state.awayTeam} ${defensiveOrganization(awayRating)} (${awayRating.defenseStrength.toFixed(2)}).`,
        weight: 0.25,
      },
    ];

    const explanation = buildExplanation(
      state,
      homeRating,
      awayRating,
      homeFormation,
      awayFormation,
      predictedWinner,
      homeScore
    );

    return {
      agentId: "tactical-analyst",
      agentName: "Tactical Analyst",
      prediction: {
        winner: predictedWinner,
        homeScore: homeScore.homeScore,
        awayScore: homeScore.awayScore,
      },
      confidence,
      explanation,
      evidence,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start,
    };
  },
};
