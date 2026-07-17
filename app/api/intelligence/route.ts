import { NextResponse } from "next/server";
import { getIntelligence } from "@/lib/consensus-service";

export async function POST(request: Request) {
  try {
    const { homeTeam, awayTeam } = await request.json();
    if (!homeTeam || !awayTeam) {
      return NextResponse.json({ error: "homeTeam and awayTeam required" }, { status: 400 });
    }
    const data = await getIntelligence(homeTeam, awayTeam);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Intelligence generation failed" }, { status: 500 });
  }
}
