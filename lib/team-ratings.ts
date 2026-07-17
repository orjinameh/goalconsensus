export interface TeamRating {
  team: string;
  rating: number;
  attackStrength: number;
  defenseStrength: number;
  homeAdvantage: number;
  recentForm: number;
  elo: number;
  expectedGoals: number;
  lastUpdated: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ratingCache = new Map<string, { rating: TeamRating; ts: number }>();

const BASE_ELO = 1500;
const K_FACTOR = 32;

function hashTeamName(name: string): number {
  const normalized = name.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function computeEloFromName(team: string): number {
  const hash = hashTeamName(team);
  const rng = seededRandom(hash);
  const deviation = rng() * 400 - 200;
  return Math.round(BASE_ELO + deviation);
}

function computeAttackStrength(elo: number): number {
  const normalized = (elo - 1000) / 1000;
  return Math.max(0.2, Math.min(0.95, 0.5 + normalized * 0.4));
}

function computeDefenseStrength(elo: number): number {
  const normalized = (elo - 1000) / 1000;
  return Math.max(0.2, Math.min(0.95, 0.5 + normalized * 0.35));
}

function computeRecentForm(team: string): number {
  const hash = hashTeamName(team);
  const dayOfYear = Math.floor(Date.now() / 86400000) % 365;
  const seed = (hash + dayOfYear * 7) % 1000;
  const rng = seededRandom(seed);
  return Math.max(0.2, Math.min(0.95, 0.5 + (rng() - 0.5) * 0.6));
}

function computeExpectedGoals(attackStrength: number, defenseStrength: number): number {
  return Math.max(0.5, Math.min(3.5, 1.2 + attackStrength * 1.8 - defenseStrength * 0.5));
}

export function getTeamRating(team: string): TeamRating {
  const normalized = team.trim().toLowerCase();
  const cacheKey = normalized;

  const cached = ratingCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.rating;
  }

  const elo = computeEloFromName(team);
  const attackStrength = computeAttackStrength(elo);
  const defenseStrength = computeDefenseStrength(elo);
  const recentForm = computeRecentForm(team);
  const expectedGoals = computeExpectedGoals(attackStrength, defenseStrength);

  const rating: TeamRating = {
    team,
    rating: Math.max(50, Math.min(99, Math.round((elo - 1000) / 10 + 50))),
    attackStrength,
    defenseStrength,
    homeAdvantage: 0.35,
    recentForm,
    elo,
    expectedGoals,
    lastUpdated: new Date().toISOString(),
  };

  ratingCache.set(cacheKey, { rating, ts: Date.now() });
  return rating;
}

export function getHeadToHeadModifier(homeTeam: string, awayTeam: string): number {
  const home = getTeamRating(homeTeam);
  const away = getTeamRating(awayTeam);
  const diff = home.elo - away.elo;
  return (diff / 400) * 0.5;
}

export function clearRatingCache(): void {
  ratingCache.clear();
}
