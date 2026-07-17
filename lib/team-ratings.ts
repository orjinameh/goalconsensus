export interface TeamRating {
  team: string;
  rating: number;
  attackStrength: number;
  defenseStrength: number;
  homeAdvantage: number;
  recentForm: number;
  leaguePosition: number;
  goalsScored: number;
  goalsConceded: number;
  historicalPerformance: number;
  lastUpdated: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ratingCache = new Map<string, { rating: TeamRating; ts: number }>();

const DEFAULT_RATING: TeamRating = {
  team: "",
  rating: 70,
  attackStrength: 0.5,
  defenseStrength: 0.5,
  homeAdvantage: 0.35,
  recentForm: 0.5,
  leaguePosition: 10,
  goalsScored: 30,
  goalsConceded: 30,
  historicalPerformance: 0.5,
  lastUpdated: new Date().toISOString(),
};

const BASE_RATINGS: Record<string, Partial<TeamRating>> = {
  argentina: { rating: 92, attackStrength: 0.85, defenseStrength: 0.78, recentForm: 0.9, leaguePosition: 1, goalsScored: 68, goalsConceded: 22, historicalPerformance: 0.92 },
  brazil: { rating: 90, attackStrength: 0.82, defenseStrength: 0.75, recentForm: 0.85, leaguePosition: 2, goalsScored: 64, goalsConceded: 25, historicalPerformance: 0.88 },
  france: { rating: 91, attackStrength: 0.84, defenseStrength: 0.80, recentForm: 0.88, leaguePosition: 1, goalsScored: 66, goalsConceded: 20, historicalPerformance: 0.90 },
  england: { rating: 88, attackStrength: 0.78, defenseStrength: 0.76, recentForm: 0.82, leaguePosition: 4, goalsScored: 58, goalsConceded: 24, historicalPerformance: 0.84 },
  spain: { rating: 89, attackStrength: 0.80, defenseStrength: 0.77, recentForm: 0.86, leaguePosition: 3, goalsScored: 62, goalsConceded: 21, historicalPerformance: 0.86 },
  germany: { rating: 87, attackStrength: 0.76, defenseStrength: 0.74, recentForm: 0.80, leaguePosition: 5, goalsScored: 56, goalsConceded: 26, historicalPerformance: 0.82 },
  portugal: { rating: 86, attackStrength: 0.75, defenseStrength: 0.72, recentForm: 0.78, leaguePosition: 6, goalsScored: 54, goalsConceded: 27, historicalPerformance: 0.80 },
  netherlands: { rating: 85, attackStrength: 0.74, defenseStrength: 0.71, recentForm: 0.77, leaguePosition: 7, goalsScored: 52, goalsConceded: 28, historicalPerformance: 0.79 },
  belgium: { rating: 84, attackStrength: 0.73, defenseStrength: 0.68, recentForm: 0.74, leaguePosition: 8, goalsScored: 50, goalsConceded: 30, historicalPerformance: 0.76 },
  italy: { rating: 85, attackStrength: 0.72, defenseStrength: 0.75, recentForm: 0.76, leaguePosition: 6, goalsScored: 48, goalsConceded: 22, historicalPerformance: 0.82 },
  croatia: { rating: 82, attackStrength: 0.68, defenseStrength: 0.70, recentForm: 0.72, leaguePosition: 10, goalsScored: 44, goalsConceded: 28, historicalPerformance: 0.75 },
  morocco: { rating: 78, attackStrength: 0.62, defenseStrength: 0.72, recentForm: 0.70, leaguePosition: 12, goalsScored: 38, goalsConceded: 24, historicalPerformance: 0.68 },
  japan: { rating: 77, attackStrength: 0.60, defenseStrength: 0.68, recentForm: 0.68, leaguePosition: 14, goalsScored: 40, goalsConceded: 28, historicalPerformance: 0.65 },
  "south korea": { rating: 76, attackStrength: 0.58, defenseStrength: 0.66, recentForm: 0.66, leaguePosition: 16, goalsScored: 38, goalsConceded: 30, historicalPerformance: 0.63 },
  usa: { rating: 74, attackStrength: 0.55, defenseStrength: 0.62, recentForm: 0.64, leaguePosition: 18, goalsScored: 36, goalsConceded: 32, historicalPerformance: 0.60 },
  mexico: { rating: 73, attackStrength: 0.54, defenseStrength: 0.60, recentForm: 0.62, leaguePosition: 20, goalsScored: 34, goalsConceded: 32, historicalPerformance: 0.58 },
  senegal: { rating: 75, attackStrength: 0.57, defenseStrength: 0.64, recentForm: 0.65, leaguePosition: 15, goalsScored: 38, goalsConceded: 28, historicalPerformance: 0.62 },
  uruguay: { rating: 83, attackStrength: 0.70, defenseStrength: 0.72, recentForm: 0.76, leaguePosition: 9, goalsScored: 48, goalsConceded: 26, historicalPerformance: 0.78 },
  colombia: { rating: 79, attackStrength: 0.64, defenseStrength: 0.66, recentForm: 0.70, leaguePosition: 11, goalsScored: 42, goalsConceded: 26, historicalPerformance: 0.68 },
  ecuador: { rating: 72, attackStrength: 0.52, defenseStrength: 0.60, recentForm: 0.60, leaguePosition: 22, goalsScored: 32, goalsConceded: 30, historicalPerformance: 0.56 },
  australia: { rating: 70, attackStrength: 0.50, defenseStrength: 0.58, recentForm: 0.58, leaguePosition: 24, goalsScored: 30, goalsConceded: 32, historicalPerformance: 0.54 },
  serbia: { rating: 74, attackStrength: 0.56, defenseStrength: 0.62, recentForm: 0.64, leaguePosition: 17, goalsScored: 36, goalsConceded: 28, historicalPerformance: 0.62 },
  switzerland: { rating: 76, attackStrength: 0.58, defenseStrength: 0.68, recentForm: 0.66, leaguePosition: 13, goalsScored: 36, goalsConceded: 24, historicalPerformance: 0.66 },
  poland: { rating: 75, attackStrength: 0.57, defenseStrength: 0.64, recentForm: 0.64, leaguePosition: 16, goalsScored: 38, goalsConceded: 28, historicalPerformance: 0.63 },
  cameroon: { rating: 71, attackStrength: 0.51, defenseStrength: 0.58, recentForm: 0.58, leaguePosition: 23, goalsScored: 30, goalsConceded: 30, historicalPerformance: 0.55 },
  ghana: { rating: 70, attackStrength: 0.50, defenseStrength: 0.56, recentForm: 0.56, leaguePosition: 25, goalsScored: 28, goalsConceded: 32, historicalPerformance: 0.53 },
  tunisia: { rating: 69, attackStrength: 0.48, defenseStrength: 0.56, recentForm: 0.55, leaguePosition: 26, goalsScored: 26, goalsConceded: 30, historicalPerformance: 0.52 },
  canada: { rating: 72, attackStrength: 0.52, defenseStrength: 0.58, recentForm: 0.60, leaguePosition: 21, goalsScored: 32, goalsConceded: 30, historicalPerformance: 0.56 },
  "saudi arabia": { rating: 65, attackStrength: 0.42, defenseStrength: 0.50, recentForm: 0.48, leaguePosition: 30, goalsScored: 22, goalsConceded: 34, historicalPerformance: 0.45 },
  qatar: { rating: 62, attackStrength: 0.38, defenseStrength: 0.46, recentForm: 0.42, leaguePosition: 32, goalsScored: 18, goalsConceded: 36, historicalPerformance: 0.40 },
};

function normalizeTeamName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z\s]/g, "");
}

function computeDynamicAdjustment(team: string): number {
  let hash = 0;
  for (let i = 0; i < team.length; i++) {
    hash = (hash * 31 + team.charCodeAt(i)) | 0;
  }
  const dayOfYear = Math.floor(Date.now() / 86400000) % 365;
  const seed = (hash + dayOfYear) % 100;
  return (seed / 100 - 0.5) * 4;
}

export function getTeamRating(team: string): TeamRating {
  const normalized = normalizeTeamName(team);
  const cacheKey = normalized;

  const cached = ratingCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.rating;
  }

  const base = BASE_RATINGS[normalized] || {};
  const adjustment = computeDynamicAdjustment(team);

  const rating: TeamRating = {
    team,
    rating: Math.max(50, Math.min(99, (base.rating || DEFAULT_RATING.rating) + adjustment)),
    attackStrength: base.attackStrength || DEFAULT_RATING.attackStrength,
    defenseStrength: base.defenseStrength || DEFAULT_RATING.defenseStrength,
    homeAdvantage: DEFAULT_RATING.homeAdvantage,
    recentForm: base.recentForm || DEFAULT_RATING.recentForm,
    leaguePosition: base.leaguePosition || DEFAULT_RATING.leaguePosition,
    goalsScored: base.goalsScored || DEFAULT_RATING.goalsScored,
    goalsConceded: base.goalsConceded || DEFAULT_RATING.goalsConceded,
    historicalPerformance: base.historicalPerformance || DEFAULT_RATING.historicalPerformance,
    lastUpdated: new Date().toISOString(),
  };

  ratingCache.set(cacheKey, { rating, ts: Date.now() });
  return rating;
}

export function getHeadToHeadModifier(homeTeam: string, awayTeam: string): number {
  const home = getTeamRating(homeTeam);
  const away = getTeamRating(awayTeam);
  const diff = home.rating - away.rating;
  return diff * 0.002;
}

export function clearRatingCache(): void {
  ratingCache.clear();
}
