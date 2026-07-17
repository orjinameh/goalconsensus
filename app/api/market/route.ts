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
    const market = getOrCreateMarket(homeTeam, awayTeam, home.rating, away.rating);
    return NextResponse.json({ market });
  }

  const markets = getAllMarkets();
  return NextResponse.json({ markets });
}
