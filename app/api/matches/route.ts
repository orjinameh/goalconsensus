import { NextResponse } from "next/server";
import { fetchAllSources, MatchResult } from "@/lib/sources";
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
  const all = await fetchAllSources();
  const combined = dedupeMatches([
    ...all.footballData,
    ...all.thesportsdb,
    ...all.simulated,
  ]);

  const grouped = new Map<string, MatchResult[]>();
  for (const m of combined) {
    const key = `${m.homeTeam.toLowerCase()}-${m.awayTeam.toLowerCase()}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }

  const enriched: EnrichedMatch[] = [];
  for (const [, group] of grouped) {
    const verdict = computeConsensus(group);
    enriched.push({ ...group[0], consensus: verdict });
  }

  return NextResponse.json({ matches: enriched, fetchedAt: new Date().toISOString() });
}
