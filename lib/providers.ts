import axios from "axios";

export interface MatchResult {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "SCHEDULED" | "LIVE" | "FINISHED";
  matchDate: string;
  providerId: string;
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

  async fetchMatches(): Promise<MatchResult[]> {
    return withRetry(async () => {
      const res = await axios.get(
        `${this.metadata.baseUrl}/competitions/WC/matches`,
        {
          headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY || "" },
          timeout: DEFAULT_TIMEOUT,
        }
      );
      return (res.data.matches || []).map((m: Record<string, unknown>) => {
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
        return {
          id: `${this.metadata.id}-${m.id}`,
          homeTeam: home?.name || "Unknown",
          awayTeam: away?.name || "Unknown",
          homeScore: fullTime?.home ?? null,
          awayScore: fullTime?.away ?? null,
          status,
          matchDate: (m.utcDate as string) || new Date().toISOString(),
          providerId: this.metadata.id,
        } as MatchResult;
      });
    });
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      await axios.get(`${this.metadata.baseUrl}/competitions/WC/matches`, {
        headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY || "" },
        timeout: DEFAULT_TIMEOUT,
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

class TheSportsDBProvider implements Provider {
  metadata: ProviderMetadata = {
    id: "thesportsdb",
    name: "thesportsdb.com",
    baseUrl: "https://thesportsdb.com/api/v1/json/3",
    rateLimit: "30 req/min (free tier)",
  };

  async fetchMatches(): Promise<MatchResult[]> {
    return withRetry(async () => {
      const res = await axios.get(
        `${this.metadata.baseUrl}/eventsseason.php?id=4551&s=2026`,
        { timeout: DEFAULT_TIMEOUT }
      );
      return (res.data.events || []).map(
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
            providerId: this.metadata.id,
          }) as MatchResult
      );
    });
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      await axios.get(
        `${this.metadata.baseUrl}/eventsseason.php?id=4551&s=2026`,
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

class ApiFootballProvider implements Provider {
  metadata: ProviderMetadata = {
    id: "api-football",
    name: "api-football.com (RapidAPI)",
    baseUrl: "https://api-football-v1.p.rapidapi.com/v3",
    rateLimit: "100 req/day (free tier)",
  };

  async fetchMatches(): Promise<MatchResult[]> {
    return withRetry(async () => {
      const res = await axios.get(`${this.metadata.baseUrl}/fixtures`, {
        params: { league: 1, season: 2026 },
        headers: {
          "x-rapidapi-key": process.env.APIFOOTBALL_API_KEY || "",
          "x-rapidapi-host": "api-football-v1.p.rapidapi.com",
        },
        timeout: DEFAULT_TIMEOUT,
      });
      return (res.data.response || []).map((f: Record<string, unknown>) => {
        const teams = f.teams as Record<string, Record<string, string>>;
        const goals = f.goals as Record<string, number | null>;
        const fixture = f.fixture as Record<string, unknown>;
        const statusObj = fixture?.status as Record<string, string> | undefined;
        let status: "SCHEDULED" | "LIVE" | "FINISHED" = "SCHEDULED";
        if (statusObj?.short === "FT") status = "FINISHED";
        else if (
          statusObj?.short === "1H" ||
          statusObj?.short === "2H" ||
          statusObj?.short === "ET" ||
          statusObj?.short === "BT"
        )
          status = "LIVE";
        return {
          id: `${this.metadata.id}-${fixture?.id}`,
          homeTeam: teams?.home?.name || "Unknown",
          awayTeam: teams?.away?.name || "Unknown",
          homeScore: goals?.home ?? null,
          awayScore: goals?.away ?? null,
          status,
          matchDate:
            (fixture?.date as string) || new Date().toISOString(),
          providerId: this.metadata.id,
        } as MatchResult;
      });
    });
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      await axios.get(`${this.metadata.baseUrl}/status`, {
        headers: {
          "x-rapidapi-key": process.env.APIFOOTBALL_API_KEY || "",
          "x-rapidapi-host": "api-football-v1.p.rapidapi.com",
        },
        timeout: DEFAULT_TIMEOUT,
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

export const providers: Provider[] = [
  new FootballDataProvider(),
  new TheSportsDBProvider(),
  new ApiFootballProvider(),
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
