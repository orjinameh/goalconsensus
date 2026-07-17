import { NextResponse } from "next/server";
import { getPremiumReport } from "@/lib/consensus-service";

export async function POST(request: Request) {
  try {
    const { homeTeam, awayTeam, reportType } = await request.json();
    if (!homeTeam || !awayTeam || !reportType) {
      return NextResponse.json({ error: "homeTeam, awayTeam, and reportType required" }, { status: 400 });
    }
    const report = await getPremiumReport(reportType, homeTeam, awayTeam);
    if (!report) {
      return NextResponse.json({ error: "Could not generate report" }, { status: 404 });
    }
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}
