import { NextResponse } from "next/server";
import { getMatches } from "@/lib/consensus-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getMatches();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      matches: [],
      providerHealth: [],
      fetchedAt: new Date().toISOString(),
      error: "Could not load matches. Server may be waking up.",
    });
  }
}
