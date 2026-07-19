import { NextResponse } from "next/server";
import { getOrCreateMarket, getAllMarkets, updateMarketOdds } from "@/lib/prediction-market";
import { getTeamRating } from "@/lib/team-ratings";
import type { AgentOutput } from "@/lib/agents/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const homeTeam = url.searchParams.get("homeTeam");
  const awayTeam = url.searchParams.get("awayTeam");

  if (homeTeam && awayTeam) {
    const home = getTeamRating(homeTeam);
    const away = getTeamRating(awayTeam);
    const market = await getOrCreateMarket(homeTeam, awayTeam, home.elo, away.elo);
    return NextResponse.json({ market });
  }

  const markets = await getAllMarkets();
  return NextResponse.json({ markets });
}

export async function POST(request: Request) {
  try {
    const { homeTeam, awayTeam, agentOutputs } = await request.json();
    if (!homeTeam || !awayTeam) {
      return NextResponse.json({ error: "homeTeam and awayTeam required" }, { status: 400 });
    }

    const market = await updateMarketOdds(
      homeTeam,
      awayTeam,
      (agentOutputs || []) as AgentOutput[],
    );

    return NextResponse.json({ market });
  } catch {
    return NextResponse.json({ error: "Failed to update odds" }, { status: 500 });
  }
}
