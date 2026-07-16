import { NextResponse } from "next/server";
import { fetchAllProviders, MatchResult } from "@/lib/providers";
import { computeConsensus } from "@/lib/consensus";

export const revalidate = 60;

interface EnrichedMatch extends MatchResult {
  consensus: ReturnType<typeof computeConsensus>;
}

function dedupeMatches(matches: MatchResult[]): MatchResult[] {
  const seen = new Map<string, MatchResult>();
  for (const m of matches) {
    const key = `${m.homeTeam.toLowerCase()}-${m.awayTeam.toLowerCase()}-${m.status}`;
    if (!seen.has(key)) {
      seen.set(key, m);
    }
  }
  return Array.from(seen.values());
}

export async function GET() {
  const providerResults = await fetchAllProviders();

  const allMatches = providerResults.flatMap((pr) => pr.matches);
  const combined = dedupeMatches(allMatches);

  const grouped = new Map<string, MatchResult[]>();
  for (const m of combined) {
    const key = `${m.homeTeam.toLowerCase()}-${m.awayTeam.toLowerCase()}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }

  const enriched: EnrichedMatch[] = [];
  for (const [, group] of grouped) {
    const matchProviderResults = providerResults.map((pr) => ({
      ...pr,
      matches: pr.matches.filter(
        (m) =>
          m.homeTeam.toLowerCase() === group[0].homeTeam.toLowerCase() &&
          m.awayTeam.toLowerCase() === group[0].awayTeam.toLowerCase()
      ),
    }));
    const verdict = computeConsensus(matchProviderResults);
    enriched.push({ ...group[0], consensus: verdict });
  }

  const providerHealth = providerResults.map((pr) => pr.health);

  return NextResponse.json({
    matches: enriched,
    providerHealth,
    fetchedAt: new Date().toISOString(),
  });
}
