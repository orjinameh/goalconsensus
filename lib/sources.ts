import axios from "axios";

export interface MatchResult {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "SCHEDULED" | "LIVE" | "FINISHED";
  matchDate: string;
  source: "football-data" | "thesportsdb" | "simulated";
}

const SIMULATED_MATCHES: MatchResult[] = [
  {
    id: "wc2026-qf-1",
    homeTeam: "Argentina",
    awayTeam: "France",
    homeScore: 2,
    awayScore: 1,
    status: "FINISHED",
    matchDate: "2026-07-04T20:00:00Z",
    source: "simulated",
  },
  {
    id: "wc2026-qf-2",
    homeTeam: "Brazil",
    awayTeam: "England",
    homeScore: 1,
    awayScore: 1,
    status: "LIVE",
    matchDate: "2026-07-05T00:00:00Z",
    source: "simulated",
  },
  {
    id: "wc2026-qf-3",
    homeTeam: "Spain",
    awayTeam: "Morocco",
    homeScore: null,
    awayScore: null,
    status: "SCHEDULED",
    matchDate: "2026-07-05T20:00:00Z",
    source: "simulated",
  },
  {
    id: "wc2026-qf-4",
    homeTeam: "Portugal",
    awayTeam: "USA",
    homeScore: null,
    awayScore: null,
    status: "SCHEDULED",
    matchDate: "2026-07-06T00:00:00Z",
    source: "simulated",
  },
];

async function fetchFootballData(): Promise<MatchResult[]> {
  try {
    const res = await axios.get(
      "https://api.football-data.org/v4/competitions/WC/matches",
      {
        headers: { "X-Auth-Token": "" },
        timeout: 5000,
      }
    );
    return (res.data.matches || []).map((m: Record<string, unknown>) => {
      const home = m.homeTeam as Record<string, string> | undefined;
      const away = m.awayTeam as Record<string, string> | undefined;
      const score = m.score as Record<string, Record<string, number>> | undefined;
      const fullTime = score?.fullTime;
      let status: "SCHEDULED" | "LIVE" | "FINISHED" = "SCHEDULED";
      if (m.status === "FINISHED") status = "FINISHED";
      else if (m.status === "IN_PLAY") status = "LIVE";
      return {
        id: `fd-${m.id}`,
        homeTeam: home?.name || "Unknown",
        awayTeam: away?.name || "Unknown",
        homeScore: fullTime?.home ?? null,
        awayScore: fullTime?.away ?? null,
        status,
        matchDate: (m.utcDate as string) || new Date().toISOString(),
        source: "football-data" as const,
      } as MatchResult;
    });
  } catch {
    return [];
  }
}

async function fetchTheSportsDB(): Promise<MatchResult[]> {
  try {
    const res = await axios.get(
      "https://thesportsdb.com/api/v1/json/3/eventsseason.php?id=4551&s=2026",
      { timeout: 5000 }
    );
    return (res.data.events || []).map(
      (e: Record<string, unknown>) =>
        ({
          id: `tsdb-${e.idEvent}`,
          homeTeam: (e.strHomeTeam as string) || "Unknown",
          awayTeam: (e.strAwayTeam as string) || "Unknown",
          homeScore: e.intHomeScore ? parseInt(e.intHomeScore as string, 10) : null,
          awayScore: e.intAwayScore ? parseInt(e.intAwayScore as string, 10) : null,
          status:
            e.strStatus === "Match Finished"
              ? "FINISHED"
              : e.strStatus === "1H" || e.strStatus === "2H"
                ? "LIVE"
                : "SCHEDULED",
          matchDate: e.dateEvent ? `${e.dateEvent}T${e.strTime || "00:00:00"}Z` : new Date().toISOString(),
          source: "thesportsdb" as const,
        }) as MatchResult
    );
  } catch {
    return [];
  }
}

function getSimulatedMatches(): MatchResult[] {
  return SIMULATED_MATCHES.map((m) => ({ ...m, source: "simulated" as const }));
}

export async function fetchAllSources(): Promise<{
  footballData: MatchResult[];
  thesportsdb: MatchResult[];
  simulated: MatchResult[];
}> {
  const [fd, tsdb] = await Promise.allSettled([fetchFootballData(), fetchTheSportsDB()]);
  return {
    footballData: fd.status === "fulfilled" ? fd.value : [],
    thesportsdb: tsdb.status === "fulfilled" ? tsdb.value : [],
    simulated: getSimulatedMatches(),
  };
}

function normalizeTeamName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z\s]/g, "");
}

function teamMatches(a: string, b: string): boolean {
  return normalizeTeamName(a) === normalizeTeamName(b);
}

export async function fetchMatchesForPair(
  homeTeam: string,
  awayTeam: string
): Promise<MatchResult[]> {
  const all = await fetchAllSources();
  const combined = [...all.footballData, ...all.thesportsdb, ...all.simulated];
  return combined.filter(
    (m) =>
      teamMatches(m.homeTeam, homeTeam) && teamMatches(m.awayTeam, awayTeam)
  );
}
