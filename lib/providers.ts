import axios from "axios";

export interface MatchResult {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "SCHEDULED" | "LIVE" | "FINISHED";
  matchDate: string;
  sport: "FOOTBALL";
  providerId: string;
  competition?: string;
}

export interface ProviderMetadata {
  id: string;
  name: string;
  baseUrl: string;
  rateLimit: string;
}

export interface ProviderHealth {
  providerId: string;
  available: boolean;
  latencyMs: number;
  lastChecked: string;
  error?: string;
}

export interface ProviderResult {
  providerId: string;
  matches: MatchResult[];
  health: ProviderHealth;
}

export interface Provider {
  metadata: ProviderMetadata;
  fetchMatches(): Promise<MatchResult[]>;
  healthCheck(): Promise<ProviderHealth>;
}

const DEFAULT_TIMEOUT = 8000;
const DEFAULT_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const FOOTBALL_DATA_COMPETITIONS = [
  "WC",
];

function normalizeTeamName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z\s]/g, "");
}

function teamMatches(a: string, b: string): boolean {
  return normalizeTeamName(a) === normalizeTeamName(b);
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = DEFAULT_RETRIES,
  delayMs: number = RETRY_DELAY_MS
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

class FootballDataProvider implements Provider {
  metadata: ProviderMetadata = {
    id: "football-data",
    name: "football-data.org",
    baseUrl: "https://api.football-data.org/v4",
    rateLimit: "10 req/min (free tier)",
  };

  private matchCache: MatchResult[] | null = null;
  private cacheTimestamp = 0;
  private cacheTtlMs = 30_000;

  async fetchMatches(): Promise<MatchResult[]> {
    const now = Date.now();
    if (this.matchCache && now - this.cacheTimestamp < this.cacheTtlMs) {
      return this.matchCache;
    }

    const apiKey = process.env.FOOTBALL_DATA_API_KEY || "";
    if (!apiKey) return [];

    const allMatches: MatchResult[] = [];
    const seen = new Set<string>();

    for (const comp of FOOTBALL_DATA_COMPETITIONS) {
      try {
        const res = await withRetry(async () => {
          return axios.get(
            `${this.metadata.baseUrl}/competitions/${comp}/matches`,
            {
              headers: { "X-Auth-Token": apiKey },
              timeout: DEFAULT_TIMEOUT,
              params: { status: "LIVE,SCHEDULED,FINISHED" },
            }
          );
        }, 1, 500);

        const matches = (res.data.matches || [])
          .filter((m: Record<string, unknown>) => {
            const sport = m.sport as string | undefined;
            if (sport && sport.toLowerCase() !== "football") return false;
            const home = m.homeTeam as Record<string, string> | undefined;
            const away = m.awayTeam as Record<string, string> | undefined;
            const teamStr = `${home?.name || ""} ${away?.name || ""}`.toLowerCase();
            if (/\brugby\b|\bbasketball\b|\bbaseball\b|\bhockey\b|\bcricket\b/.test(teamStr)) return false;
            return true;
          })
          .map((m: Record<string, unknown>) => {
            const home = m.homeTeam as Record<string, string> | undefined;
            const away = m.awayTeam as Record<string, string> | undefined;
            const score = m.score as
              | Record<string, Record<string, number>>
              | undefined;
            const fullTime = score?.fullTime;
            let status: "SCHEDULED" | "LIVE" | "FINISHED" = "SCHEDULED";
            if (m.status === "FINISHED") status = "FINISHED";
            else if (m.status === "IN_PLAY" || m.status === "PAUSED")
              status = "LIVE";

            const competition = m.competition as Record<string, string> | undefined;

            return {
              id: `${this.metadata.id}-${m.id}`,
              homeTeam: home?.name || "Unknown",
              awayTeam: away?.name || "Unknown",
              homeScore: fullTime?.home ?? null,
              awayScore: fullTime?.away ?? null,
              status,
              matchDate: (m.utcDate as string) || new Date().toISOString(),
              sport: "FOOTBALL" as const,
              providerId: this.metadata.id,
              competition: competition?.name || comp,
            } as MatchResult;
          });

        for (const match of matches) {
          const key = `${normalizeTeamName(match.homeTeam)}-${normalizeTeamName(match.awayTeam)}-${match.status}`;
          if (!seen.has(key)) {
            seen.add(key);
            allMatches.push(match);
          }
        }
      } catch {
        continue;
      }
    }

    this.matchCache = allMatches;
    this.cacheTimestamp = now;
    return allMatches;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      await axios.get(`${this.metadata.baseUrl}/competitions/WC/matches`, {
        headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY || "" },
        timeout: DEFAULT_TIMEOUT,
        params: { status: "LIVE,SCHEDULED,FINISHED" },
      });
      return {
        providerId: this.metadata.id,
        available: true,
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    } catch (err) {
      return {
        providerId: this.metadata.id,
        available: false,
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}

const THESPORTSDB_LEAGUES: Array<{ id: string; name: string }> = [
  { id: "4429", name: "FIFA World Cup" },
];

class TheSportsDBProvider implements Provider {
  metadata: ProviderMetadata = {
    id: "thesportsdb",
    name: "thesportsdb.com",
    baseUrl: "https://thesportsdb.com/api/v1/json/3",
    rateLimit: "30 req/min (free tier)",
  };

  private matchCache: MatchResult[] | null = null;
  private cacheTimestamp = 0;
  private cacheTtlMs = 30_000;

  async fetchMatches(): Promise<MatchResult[]> {
    const now = Date.now();
    if (this.matchCache && now - this.cacheTimestamp < this.cacheTtlMs) {
      return this.matchCache;
    }

    const allMatches: MatchResult[] = [];
    const seen = new Set<string>();

    for (const league of THESPORTSDB_LEAGUES) {
      try {
        const year = new Date().getFullYear();
        const res = await withRetry(async () => {
          return axios.get(
            `${this.metadata.baseUrl}/eventsseason.php?id=${league.id}&s=${year}`,
            { timeout: DEFAULT_TIMEOUT }
          );
        }, 1, 500);

        const events = (res.data.events || [])
          .filter((e: Record<string, unknown>) => {
            const sport = (e.strSport as string) || "";
            const isFootball =
              sport.toLowerCase() === "soccer" ||
              sport.toLowerCase() === "football";
            if (!isFootball) return false;
            const teamStr = `${e.strHomeTeam || ""} ${e.strAwayTeam || ""}`.toLowerCase();
            if (/\brugby\b|\bbasketball\b|\bbaseball\b|\bhockey\b|\bcricket\b/.test(teamStr)) return false;
            return true;
          })
          .map(
            (e: Record<string, unknown>) =>
              ({
                id: `${this.metadata.id}-${e.idEvent}`,
                homeTeam: (e.strHomeTeam as string) || "Unknown",
                awayTeam: (e.strAwayTeam as string) || "Unknown",
                homeScore: e.intHomeScore
                  ? parseInt(e.intHomeScore as string, 10)
                  : null,
                awayScore: e.intAwayScore
                  ? parseInt(e.intAwayScore as string, 10)
                  : null,
                status:
                  e.strStatus === "Match Finished"
                    ? "FINISHED"
                    : e.strStatus === "1H" || e.strStatus === "2H"
                      ? "LIVE"
                      : "SCHEDULED",
                matchDate: e.dateEvent
                  ? `${e.dateEvent}T${e.strTime || "00:00:00"}Z`
                  : new Date().toISOString(),
                sport: "FOOTBALL" as const,
                providerId: this.metadata.id,
                competition: league.name,
              }) as MatchResult
          );

        for (const match of events) {
          const key = `${normalizeTeamName(match.homeTeam)}-${normalizeTeamName(match.awayTeam)}-${match.status}`;
          if (!seen.has(key)) {
            seen.add(key);
            allMatches.push(match);
          }
        }
      } catch {
        continue;
      }
    }

    this.matchCache = allMatches;
    this.cacheTimestamp = now;
    return allMatches;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      await axios.get(
        `${this.metadata.baseUrl}/eventsseason.php?id=4429&s=${new Date().getFullYear()}`,
        { timeout: DEFAULT_TIMEOUT }
      );
      return {
        providerId: this.metadata.id,
        available: true,
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    } catch (err) {
      return {
        providerId: this.metadata.id,
        available: false,
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}

export const providers: Provider[] = [
  new FootballDataProvider(),
  new TheSportsDBProvider(),
];

export async function fetchAllProviders(): Promise<ProviderResult[]> {
  const results = await Promise.allSettled(
    providers.map(async (p) => {
      const start = Date.now();
      try {
        const matches = await p.fetchMatches();
        return {
          providerId: p.metadata.id,
          matches,
          health: {
            providerId: p.metadata.id,
            available: true,
            latencyMs: Date.now() - start,
            lastChecked: new Date().toISOString(),
          } as ProviderHealth,
        } as ProviderResult;
      } catch (err) {
        return {
          providerId: p.metadata.id,
          matches: [],
          health: {
            providerId: p.metadata.id,
            available: false,
            latencyMs: Date.now() - start,
            lastChecked: new Date().toISOString(),
            error: err instanceof Error ? err.message : "Unknown error",
          } as ProviderHealth,
        } as ProviderResult;
      }
    })
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      providerId: providers[i].metadata.id,
      matches: [],
      health: {
        providerId: providers[i].metadata.id,
        available: false,
        latencyMs: 0,
        lastChecked: new Date().toISOString(),
        error: r.reason?.message || "Promise rejected",
      } as ProviderHealth,
    } as ProviderResult;
  });
}

export async function fetchMatchesForPair(
  homeTeam: string,
  awayTeam: string
): Promise<ProviderResult[]> {
  const all = await fetchAllProviders();
  return all.map((pr) => ({
    ...pr,
    matches: pr.matches.filter(
      (m) =>
        teamMatches(m.homeTeam, homeTeam) && teamMatches(m.awayTeam, awayTeam)
    ),
  }));
}

export async function buildCanonicalState(
  homeTeam: string,
  awayTeam: string
): Promise<import("./agents/types").CanonicalMatchState | null> {
  const providerResults = await fetchMatchesForPair(homeTeam, awayTeam);
  const responding = providerResults.filter((pr) => pr.health.available);
  const allMatches = responding.flatMap((pr) => pr.matches);

  if (allMatches.length === 0) return null;

  const providerAgreement = responding.length >= 2;
  const first = allMatches[0];

  return {
    homeTeam: first.homeTeam,
    awayTeam: first.awayTeam,
    homeScore: first.homeScore,
    awayScore: first.awayScore,
    status: first.status,
    matchDate: first.matchDate,
    sport: "FOOTBALL",
    providerAgreement,
    providerCount: responding.length,
    providerHealth: providerResults.map((pr) => pr.health),
    rawResults: allMatches,
  };
}

export function getSupportedSports(): readonly string[] {
  return ["FOOTBALL"] as const;
}
