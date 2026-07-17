import { NextResponse } from "next/server";
import { resolveMarket } from "@/lib/prediction-market";

export async function POST(request: Request) {
  try {
    const { homeTeam, awayTeam, result } = await request.json();
    if (!homeTeam || !awayTeam || !result) {
      return NextResponse.json({ error: "homeTeam, awayTeam, and result required" }, { status: 400 });
    }
    const data = resolveMarket(homeTeam, awayTeam, result);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Resolution failed" }, { status: 500 });
  }
}
