import { NextResponse } from "next/server";
import { getPremiumReport } from "@/lib/consensus-service";
import { verifyX402Payment, x402PaymentRequired } from "@/lib/x402";

const REPORT_COSTS: Record<string, string> = {
  "full-tactical": "0.002",
  "historical-breakdown": "0.002",
  "player-report": "0.005",
  "market-intelligence": "0.005",
  "risk-report": "0.01",
};

export async function POST(request: Request) {
  try {
    const { homeTeam, awayTeam, reportType } = await request.json();
    if (!homeTeam || !awayTeam || !reportType) {
      return NextResponse.json(
        { error: "homeTeam, awayTeam, and reportType required" },
        { status: 400 }
      );
    }

    const paymentHeader = request.headers.get("x-payment");
    if (!verifyX402Payment(paymentHeader)) {
      const cost = REPORT_COSTS[reportType] || "0.001";
      return NextResponse.json(
        {
          status: 402,
          protocol: "x402",
          payment: {
            amount: `${cost} USDC`,
            token: "USDC",
            chain: "Injective Testnet",
            networkId: "injective-testnet",
            endpoint: "injective-testnet.evm.neutron.org",
          },
          reportType,
          x402Version: "1",
          message: `This premium report costs ${cost} USDC. Include an X-PAYMENT header with your x402 payment proof to proceed.`,
        },
        { status: 402 }
      );
    }

    const report = await getPremiumReport(reportType, homeTeam, awayTeam);
    if (!report) {
      return NextResponse.json(
        { error: "Could not generate report" },
        { status: 404 }
      );
    }
    return NextResponse.json(report);
  } catch {
    return NextResponse.json(
      { error: "Report generation failed" },
      { status: 500 }
    );
  }
}
