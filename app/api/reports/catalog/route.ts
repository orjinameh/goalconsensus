import { NextResponse } from "next/server";
import { getReportCatalogInfo } from "@/lib/consensus-service";

export async function GET() {
  const reports = getReportCatalogInfo();
  return NextResponse.json({ reports });
}
