import { NextResponse } from "next/server";
import { transferUSDC, getHouseBalance } from "@/lib/settlement";
import { getAddressFromRequest } from "@/lib/auth";

const FAUCET_AMOUNT_USDC = 10; // 10 USDC per user

// In-memory track of who has already received faucet funds (persists across requests in same process)
const faucetRecipients = new Set<string>();

export async function POST(request: Request) {
  try {
    const address = getAddressFromRequest(request);
    if (!address) {
      return NextResponse.json({ error: "Authentication required — connect wallet first" }, { status: 401 });
    }

    const normalized = address.toLowerCase();

    // Check if already received
    if (faucetRecipients.has(normalized)) {
      return NextResponse.json({
        success: false,
        alreadyReceived: true,
        message: `You already received ${FAUCET_AMOUNT_USDC} USDC testnet tokens.`,
      });
    }

    // Check house balance
    const balance = await getHouseBalance();
    if (!balance) {
      return NextResponse.json({
        success: false,
        message: "Testnet faucet not configured. Set HOUSE_WALLET_PRIVATE_KEY env var.",
      }, { status: 503 });
    }

    const balanceNum = parseFloat(balance.usdc);
    if (balanceNum < FAUCET_AMOUNT_USDC) {
      return NextResponse.json({
        success: false,
        message: `House wallet has insufficient USDC (${balance.usdc}). Faucet empty.`,
        balance: balance.usdc,
      }, { status: 503 });
    }

    // Send testnet USDC to user
    const result = await transferUSDC(normalized, FAUCET_AMOUNT_USDC);

    if (result.success) {
      faucetRecipients.add(normalized);
      return NextResponse.json({
        success: true,
        amount: FAUCET_AMOUNT_USDC,
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
        message: `${FAUCET_AMOUNT_USDC} USDC sent to ${normalized.slice(0, 10)}... on Base Sepolia testnet.`,
      });
    }

    return NextResponse.json({
      success: false,
      message: result.error || "Transfer failed",
    }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Faucet request failed" }, { status: 500 });
  }
}
