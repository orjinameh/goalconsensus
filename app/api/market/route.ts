import { NextResponse } from "next/server";
import { getOrCreateMarket, getAllMarkets } from "@/lib/prediction-market";
import { getTeamRating } from "@/lib/team-ratings";

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
