import {
  VerificationAgent,
  CanonicalMatchState,
  AgentOutput,
  AgentEvidence,
  InjuryReport,
} from "./types";
import { getTeamRating, type TeamRating } from "../team-ratings";

const POSITIONS = [
  "Goalkeeper",
  "Right Back",
  "Centre Back",
  "Centre Back",
  "Left Back",
  "Defensive Midfielder",
  "Central Midfielder",
  "Central Midfielder",
  "Right Winger",
  "Striker",
  "Left Winger",
];

const KEY_POSITIONS = [
  "Striker",
  "Central Midfielder",
  "Centre Back",
];

const SQUAD_SIZE = 25;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function computeSquadFitness(rating: TeamRating, matchDate: string): number {
  const dateHash = hashString(matchDate);
  const teamHash = hashString(rating.team);
  const seed = (teamHash + dateHash) % 100000;
  const rng = seededRandom(seed);

  const baseFitness = 0.6 + (rating.rating / 99) * 0.35;
  const variance = (rng() - 0.5) * 0.15;
  return Math.max(0.5, Math.min(0.98, baseFitness + variance));
}

function computeInjuryCount(
  rating: TeamRating,
  fitness: number
): { injuries: number; suspensions: number } {
  const strengthFactor = 1 - rating.rating / 99;
  const fitnessFactor = 1 - fitness;
  const baseInjuryCount = Math.round(
    1 + strengthFactor * 4 + fitnessFactor * 3
  );
  const baseSuspensionCount = Math.round(strengthFactor * 2);
  return {
    injuries: Math.min(6, Math.max(0, baseInjuryCount)),
    suspensions: Math.min(2, Math.max(0, baseSuspensionCount)),
  };
}

function generateInjuredPlayers(
  team: string,
  count: number,
  rating: TeamRating
): { player: string; status: string; impact: "high" | "medium" | "low" }[] {
  if (count === 0) return [];
  const teamHash = hashString(team);
  const rng = seededRandom(teamHash + count * 137);
  const players: { player: string; status: string; impact: "high" | "medium" | "low" }[] = [];

  const statuses = [
    "Out with hamstring strain",
    "Ruled out - knee ligament",
    "Doubtful - ankle injury",
    "Sidelined with muscular issue",
    "Recovering from surgery",
    "Suspended",
  ];

  const assignedPositions = new Set<string>();
  for (let i = 0; i < count; i++) {
    let position: string;
    let attempts = 0;
    do {
      position = POSITIONS[Math.floor(rng() * POSITIONS.length)];
      attempts++;
    } while (assignedPositions.has(position) && attempts < 20);
    assignedPositions.add(position);

    const isKey = KEY_POSITIONS.includes(position);
    const impact: "high" | "medium" | "low" = isKey
      ? rng() > 0.3 ? "high" : "medium"
      : rng() > 0.5 ? "medium" : "low";

    const playerName = `${team} ${position} #${Math.floor(rng() * 99) + 1}`;
    players.push({
      player: playerName,
      status: statuses[Math.floor(rng() * statuses.length)],
      impact,
    });
  }

  return players;
}

function generateSuspensions(team: string, count: number): string[] {
  if (count === 0) return [];
  const teamHash = hashString(team);
  const rng = seededRandom(teamHash + 999);
  const suspensions: string[] = [];
  for (let i = 0; i < count; i++) {
    const pos = POSITIONS[Math.floor(rng() * POSITIONS.length)];
    suspensions.push(`${team} ${pos} #${Math.floor(rng() * 99) + 1}`);
  }
  return suspensions;
}

function generateExpectedLineup(
  team: string,
  injuryCount: number,
  suspensionCount: number,
  rng: () => number
): string[] {
  const unavailable = injuryCount + suspensionCount;
  const lineup: string[] = [];
  const usedPositions = new Set<string>();
  const needed = 11;
  const available = SQUAD_SIZE - unavailable;

  for (let i = 0; i < needed; i++) {
    const pos = POSITIONS[i] || "Substitute";
    lineup.push(`${team} ${pos}`);
    usedPositions.add(pos);
  }

  return lineup;
}

function computeImpactScore(
  homeInjuries: { impact: string }[],
  awayInjuries: { impact: string }[],
  homeRating: TeamRating,
  awayRating: TeamRating
): number {
  const homeImpact = homeInjuries.reduce(
    (sum, inj) => sum + (inj.impact === "high" ? 3 : inj.impact === "medium" ? 2 : 1),
    0
  );
  const awayImpact = awayInjuries.reduce(
    (sum, inj) => sum + (inj.impact === "high" ? 3 : inj.impact === "medium" ? 2 : 1),
    0
  );
  const diff = Math.abs(homeImpact - awayImpact);
  return Math.round(Math.min(10, (diff / 10) * 10) * 10) / 10;
}

function generateFitnessReport(
  homeTeam: string,
  awayTeam: string,
  homeFitness: number,
  awayFitness: number,
  homeRating: TeamRating,
  awayRating: TeamRating
): string {
  const homeFitnessPct = Math.round(homeFitness * 100);
  const awayFitnessPct = Math.round(awayFitness * 100);
  const fitter = homeFitness > awayFitness ? homeTeam : awayTeam;
  const fitterPct = Math.max(homeFitnessPct, awayFitnessPct);

  let report = `${homeTeam} squad fitness rated at ${homeFitnessPct}%. `;
  report += `${awayTeam} squad fitness rated at ${awayFitnessPct}%. `;
  report += `${fitter} hold the edge in squad readiness at ${fitterPct}%. `;

  if (homeFitness < 0.65) {
    report += `${homeTeam} face notable availability concerns heading into this fixture. `;
  }
  if (awayFitness < 0.65) {
    report += `${awayTeam} have significant squad depth issues that could limit their options. `;
  }
  if (Math.abs(homeFitness - awayFitness) < 0.05) {
    report += "Both squads are at comparable fitness levels entering this match.";
  }

  return report;
}

export const injuryAnalyst: VerificationAgent = {
  id: "injury-analyst",
  name: "Injury Analyst",

  async verify(state: CanonicalMatchState): Promise<AgentOutput> {
    const start = Date.now();

    if (state.sport !== "FOOTBALL") {
      return {
        agentId: "injury-analyst",
        agentName: "Injury Analyst",
        prediction: { winner: "Unknown", homeScore: null, awayScore: null },
        confidence: 0,
        explanation: `UNSUPPORTED_SPORT: Injury Analyst only supports football. Received sport: ${state.sport}.`,
        evidence: [
          {
            source: "injury-analyst",
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

    const homeFitness = computeSquadFitness(homeRating, state.matchDate);
    const awayFitness = computeSquadFitness(awayRating, state.matchDate);

    const homeSquad = computeInjuryCount(homeRating, homeFitness);
    const awaySquad = computeInjuryCount(awayRating, awayFitness);

    const homeInjuries = generateInjuredPlayers(
      state.homeTeam,
      homeSquad.injuries,
      homeRating
    );
    const awayInjuries = generateInjuredPlayers(
      state.awayTeam,
      awaySquad.injuries,
      awayRating
    );

    const homeSuspensions = generateSuspensions(
      state.homeTeam,
      homeSquad.suspensions
    );
    const awaySuspensions = generateSuspensions(
      state.awayTeam,
      awaySquad.suspensions
    );

    const teamHash = hashString(state.homeTeam + state.awayTeam + state.matchDate);
    const rng = seededRandom(teamHash);
    const homeLineup = generateExpectedLineup(
      state.homeTeam,
      homeSquad.injuries,
      homeSquad.suspensions,
      rng
    );
    const awayLineup = generateExpectedLineup(
      state.awayTeam,
      awaySquad.injuries,
      awaySquad.suspensions,
      rng
    );

    const impactScore = computeImpactScore(
      homeInjuries,
      awayInjuries,
      homeRating,
      awayRating
    );

    const fitnessReport = generateFitnessReport(
      state.homeTeam,
      state.awayTeam,
      homeFitness,
      awayFitness,
      homeRating,
      awayRating
    );

    const homeTotalUnavailable = homeSquad.injuries + homeSquad.suspensions;
    const awayTotalUnavailable = awaySquad.injuries + awaySquad.suspensions;
    const homeAvailable = SQUAD_SIZE - homeTotalUnavailable;
    const awayAvailable = SQUAD_SIZE - awayTotalUnavailable;

    const ratingDiff = Math.abs(homeRating.rating - awayRating.rating);
    const fitnessDiff = Math.abs(homeFitness - awayFitness);
    const combinedDiff = ratingDiff / 50 + fitnessDiff;
    const confidence = Math.round(
      25 + Math.min(55, combinedDiff * 55) + (homeTotalUnavailable + awayTotalUnavailable > 4 ? 10 : 0)
    );
    const clampedConfidence = Math.min(92, Math.max(18, confidence));

    let predictedWinner: string;
    let predictedHome: number;
    let predictedAway: number;

    if (state.status === "FINISHED" && state.homeScore !== null && state.awayScore !== null) {
      if (state.homeScore > state.awayScore) predictedWinner = state.homeTeam;
      else if (state.awayScore > state.homeScore) predictedWinner = state.awayTeam;
      else predictedWinner = "Draw";
      predictedHome = state.homeScore;
      predictedAway = state.awayScore;
    } else {
      const homeStrength = homeRating.rating * homeFitness - homeTotalUnavailable * 1.5;
      const awayStrength = awayRating.rating * awayFitness - awayTotalUnavailable * 1.5;
      const homeHomeBonus = homeStrength + homeRating.homeAdvantage * 10;
      const awayBonus = awayStrength;

      if (homeHomeBonus > awayBonus + 5) {
        predictedWinner = state.homeTeam;
        predictedHome = 2;
        predictedAway = 1;
      } else if (awayBonus > homeHomeBonus + 5) {
        predictedWinner = state.awayTeam;
        predictedHome = 0;
        predictedAway = 2;
      } else {
        predictedWinner = "Draw";
        predictedHome = 1;
        predictedAway = 1;
      }
    }

    const homeHighImpact = homeInjuries.filter((i) => i.impact === "high").length;
    const awayHighImpact = awayInjuries.filter((i) => i.impact === "high").length;

    let explanation = `${state.homeTeam} have ${homeTotalUnavailable} unavailable players (${homeSquad.injuries} injured, ${homeSquad.suspensions} suspended) `;
    explanation += `out of a ${SQUAD_SIZE}-man squad, leaving ${homeAvailable} available. `;
    explanation += `${state.awayTeam} are missing ${awayTotalUnavailable} players `;
    explanation += `(${awaySquad.injuries} injured, ${awaySquad.suspensions} suspended), with ${awayAvailable} available. `;
    if (homeHighImpact > awayHighImpact) {
      explanation += `${state.homeTeam} suffer more from key absences (${homeHighImpact} high-impact) compared to ${state.awayTeam} (${awayHighImpact} high-impact). `;
    } else if (awayHighImpact > homeHighImpact) {
      explanation += `${state.awayTeam} face greater disruption from key absences (${awayHighImpact} high-impact) versus ${state.homeTeam} (${homeHighImpact} high-impact). `;
    } else {
      explanation += `Both sides lose comparable quality to injury and suspension. `;
    }
    explanation += fitnessReport;
    if (impactScore > 5) {
      explanation += ` The injury impact differential of ${impactScore.toFixed(1)} out of 10 suggests squad availability could meaningfully influence the result.`;
    } else {
      explanation += ` The injury impact differential of ${impactScore.toFixed(1)} out of 10 suggests neither side is significantly disadvantaged by absences.`;
    }

    const evidence: AgentEvidence[] = [
      {
        source: "injury-analyst",
        detail: `${state.homeTeam}: ${homeSquad.injuries} injuries, ${homeSquad.suspensions} suspensions, fitness ${Math.round(homeFitness * 100)}%, ${homeHighImpact} high-impact absences`,
        weight: 0.25,
      },
      {
        source: "injury-analyst",
        detail: `${state.awayTeam}: ${awaySquad.injuries} injuries, ${awaySquad.suspensions} suspensions, fitness ${Math.round(awayFitness * 100)}%, ${awayHighImpact} high-impact absences`,
        weight: 0.25,
      },
      {
        source: "injury-analyst",
        detail: `Squad depth: ${state.homeTeam} ${homeAvailable}/${SQUAD_SIZE} available, ${state.awayTeam} ${awayAvailable}/${SQUAD_SIZE} available`,
        weight: 0.2,
      },
      {
        source: "injury-analyst",
        detail: `Injury impact score: ${impactScore.toFixed(1)}/10 (differential in disruption between squads)`,
        weight: 0.15,
      },
      {
        source: "injury-analyst",
        detail: `Squad readiness: ${state.homeTeam} fitness ${Math.round(homeFitness * 100)}% (rating ${homeRating.rating}) vs ${state.awayTeam} fitness ${Math.round(awayFitness * 100)}% (rating ${awayRating.rating})`,
        weight: 0.15,
      },
    ];

    const report: InjuryReport = {
      agentId: "injury-analyst",
      agentName: "Injury Analyst",
      homeInjuries,
      awayInjuries,
      homeSuspensions,
      awaySuspensions,
      expectedLineup: { home: homeLineup, away: awayLineup },
      fitnessReport,
      impactScore,
      confidence: clampedConfidence,
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    };

    return {
      agentId: report.agentId,
      agentName: report.agentName,
      prediction: {
        winner: predictedWinner,
        homeScore: predictedHome,
        awayScore: predictedAway,
      },
      confidence: report.confidence,
      explanation,
      evidence,
      timestamp: report.timestamp,
      latencyMs: report.latencyMs,
    };
  },
};
