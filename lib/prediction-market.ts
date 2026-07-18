import type { PredictionMarketState, PredictionMarketOdds, PredictionMarketPosition } from "./agents/types";
import { initiateCCTPTransfer } from "./cctp";

const marketStore = new Map<string, PredictionMarketState>();

function marketKey(homeTeam: string, awayTeam: string): string {
  return `${homeTeam.toLowerCase()}|${awayTeam.toLowerCase()}`;
}

function computeOdds(homeRating: number, awayRating: number): PredictionMarketOdds {
  const homeExpected = 1 / (1 + Math.pow(10, (awayRating - homeRating) / 400));
  const awayExpected = 1 - homeExpected;
  const drawBase = 0.25;
  const gap = Math.abs(homeExpected - awayExpected);
  const drawProb = drawBase * (1 - gap * 0.5);

  const margin = 1.05;
  const homeProb = (homeExpected * (1 - drawProb)) * margin;
  const drawProbMargin = drawProb * margin;
  const awayProb = (awayExpected * (1 - drawProb)) * margin;

  const total = homeProb + drawProbMargin + awayProb;
  return {
    home: Math.round((homeProb / total) * 100) / 100,
    draw: Math.round((drawProbMargin / total) * 100) / 100,
    away: Math.round((awayProb / total) * 100) / 100,
  };
}

export function getOrCreateMarket(
  homeTeam: string,
  awayTeam: string,
  homeRating: number,
  awayRating: number
): PredictionMarketState {
  const key = marketKey(homeTeam, awayTeam);
  const existing = marketStore.get(key);
  if (existing) return existing;

  const odds = computeOdds(homeRating, awayRating);
  const state: PredictionMarketState = {
    matchKey: key,
    homeTeam,
    awayTeam,
    odds,
    totalStaked: 0,
    positions: [
      { side: "home", amount: 0, odds: odds.home, potentialPayout: 0 },
      { side: "draw", amount: 0, odds: odds.draw, potentialPayout: 0 },
      { side: "away", amount: 0, odds: odds.away, potentialPayout: 0 },
    ],
    resolved: false,
    result: null,
    settlementTxHash: null,
    cctpTransfers: [],
  };

  marketStore.set(key, state);
  return state;
}

export function placeBet(
  homeTeam: string,
  awayTeam: string,
  side: "home" | "draw" | "away",
  amount: number
): { success: boolean; market: PredictionMarketState; error?: string; cctpTransfer?: { id: string; fromChain: string; toChain: string; amount: string; status: string; txHash: string } } {
  const key = marketKey(homeTeam, awayTeam);
  const market = marketStore.get(key);
  if (!market) return { success: false, market: getOrCreateMarket(homeTeam, awayTeam, 1500, 1500), error: "Market not found" };
  if (market.resolved) return { success: false, market, error: "Market already resolved" };
  if (amount <= 0) return { success: false, market, error: "Invalid amount" };

  const position = market.positions.find((p) => p.side === side);
  if (!position) return { success: false, market, error: "Invalid side" };

  position.amount += amount;
  position.potentialPayout = position.amount * (1 / position.odds);
  market.totalStaked += amount;

  const cctpTransfer = initiateCCTPTransfer({
    amount: amount.toFixed(2),
    fromChain: "base-sepolia",
    toChain: "injective-testnet",
    sender: `0x${Array.from({ length: 40 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`,
    recipient: `inj1${Array.from({ length: 38 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`,
  });

  market.cctpTransfers.push({
    id: cctpTransfer.id,
    fromChain: cctpTransfer.fromChain,
    toChain: cctpTransfer.toChain,
    amount: cctpTransfer.amount,
    status: cctpTransfer.status,
    txHash: cctpTransfer.txHash,
    timestamp: cctpTransfer.timestamp,
  });

  return { success: true, market, cctpTransfer: { id: cctpTransfer.id, fromChain: cctpTransfer.fromChain, toChain: cctpTransfer.toChain, amount: cctpTransfer.amount, status: cctpTransfer.status, txHash: cctpTransfer.txHash } };
}

export function resolveMarket(
  homeTeam: string,
  awayTeam: string,
  result: "home" | "draw" | "away"
): { market: PredictionMarketState; winners: { side: string; payout: number; cctpSettlement?: { id: string; fromChain: string; toChain: string; amount: string; status: string; txHash: string } }[] } {
  const key = marketKey(homeTeam, awayTeam);
  let market = marketStore.get(key);
  if (!market) {
    market = getOrCreateMarket(homeTeam, awayTeam, 1500, 1500);
  }

  market.resolved = true;
  market.result = result;
  market.settlementTxHash = `0x${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`;

  const winners: { side: string; payout: number; cctpSettlement?: { id: string; fromChain: string; toChain: string; amount: string; status: string; txHash: string } }[] = [];
  for (const pos of market.positions) {
    if (pos.side === result && pos.amount > 0) {
      const settlement = initiateCCTPTransfer({
        amount: pos.potentialPayout.toFixed(2),
        fromChain: "injective-testnet",
        toChain: "base-sepolia",
        sender: `inj1${Array.from({ length: 38 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`,
        recipient: `0x${Array.from({ length: 40 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`,
      });

      market.cctpTransfers.push({
        id: settlement.id,
        fromChain: settlement.fromChain,
        toChain: settlement.toChain,
        amount: settlement.amount,
        status: settlement.status,
        txHash: settlement.txHash,
        timestamp: settlement.timestamp,
      });

      winners.push({ side: pos.side, payout: pos.potentialPayout, cctpSettlement: { id: settlement.id, fromChain: settlement.fromChain, toChain: settlement.toChain, amount: settlement.amount, status: settlement.status, txHash: settlement.txHash } });
    }
  }

  return { market, winners };
}

export function getMarket(homeTeam: string, awayTeam: string): PredictionMarketState | null {
  return marketStore.get(marketKey(homeTeam, awayTeam)) || null;
}

export function getAllMarkets(): PredictionMarketState[] {
  return Array.from(marketStore.values());
}
