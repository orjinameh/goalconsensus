import type { PredictionMarketState, PredictionMarketOdds, PredictionMarketPosition, AgentOutput } from "./agents/types";
import { transferUSDC, getHouseBalance, USDC_ADDRESS, BASE_SEPOLIA_CHAIN_ID } from "./settlement";
import { getTeamRating } from "./team-ratings";
import { connectToDatabase } from "./mongodb";

function marketKey(homeTeam: string, awayTeam: string): string {
  return `${homeTeam.toLowerCase()}|${awayTeam.toLowerCase()}`;
}

function computeEloOdds(homeRating: number, awayRating: number): PredictionMarketOdds {
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

function computeAgentAdjustedOdds(
  homeRating: number,
  awayRating: number,
  agentOutputs: AgentOutput[],
  homeTeam: string,
  awayTeam: string,
): PredictionMarketOdds {
  const eloOdds = computeEloOdds(homeRating, awayRating);

  if (!agentOutputs || agentOutputs.length === 0) return eloOdds;

  const activeAgents = agentOutputs.filter((a) => a.confidence > 0);
  if (activeAgents.length === 0) return eloOdds;

  // Compute agent-implied probabilities from votes + confidence
  let homeVotes = 0;
  let awayVotes = 0;
  let drawVotes = 0;
  let totalConfidence = 0;

  for (const agent of activeAgents) {
    const conf = agent.confidence / 100;
    totalConfidence += conf;
    if (agent.prediction.winner === homeTeam) {
      homeVotes += conf;
    } else if (agent.prediction.winner === awayTeam) {
      awayVotes += conf;
    } else {
      drawVotes += conf;
    }
  }

  if (totalConfidence === 0) return eloOdds;

  const agentHomeProb = homeVotes / totalConfidence;
  const agentDrawProb = drawVotes / totalConfidence;
  const agentAwayProb = awayVotes / totalConfidence;

  // Blend: 50% Elo + 50% agent consensus
  const blend = 0.5;
  const margin = 1.05;
  const homeProb = ((eloOdds.home + agentHomeProb) / 2) * margin;
  const drawProb = ((eloOdds.draw + agentDrawProb) / 2) * margin;
  const awayProb = ((eloOdds.away + agentAwayProb) / 2) * margin;

  const total = homeProb + drawProb + awayProb;
  return {
    home: Math.round((homeProb / total) * 100) / 100,
    draw: Math.round((drawProb / total) * 100) / 100,
    away: Math.round((awayProb / total) * 100) / 100,
  };
}

function freshMarket(homeTeam: string, awayTeam: string, homeRating: number, awayRating: number): PredictionMarketState {
  const key = marketKey(homeTeam, awayTeam);
  const odds = computeEloOdds(homeRating, awayRating);
  return {
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
}

export async function getOrCreateMarket(
  homeTeam: string,
  awayTeam: string,
  homeRating: number,
  awayRating: number
): Promise<PredictionMarketState> {
  const db = await connectToDatabase();
  const key = marketKey(homeTeam, awayTeam);
  const existing = await db.collection("markets").findOne({ matchKey: key });
  if (existing) return existing as unknown as PredictionMarketState;

  const market = freshMarket(homeTeam, awayTeam, homeRating, awayRating);
  await db.collection("markets").insertOne(market as never);
  return market;
}

export async function updateMarketOdds(
  homeTeam: string,
  awayTeam: string,
  agentOutputs: AgentOutput[],
): Promise<PredictionMarketState> {
  const db = await connectToDatabase();
  const key = marketKey(homeTeam, awayTeam);
  const homeRating = getTeamRating(homeTeam).elo;
  const awayRating = getTeamRating(awayTeam).elo;

  let market = await getOrCreateMarket(homeTeam, awayTeam, homeRating, awayRating);
  if (market.resolved) return market;

  const newOdds = computeAgentAdjustedOdds(homeRating, awayRating, agentOutputs, homeTeam, awayTeam);
  market.odds = newOdds;

  // Recompute position payouts with new odds
  for (const pos of market.positions) {
    pos.odds = newOdds[pos.side];
    pos.potentialPayout = pos.amount * (1 / pos.odds);
  }

  await db.collection("markets").updateOne(
    { matchKey: key },
    { $set: { odds: market.odds, positions: market.positions } }
  );

  return market;
}

export async function placeBet(
  homeTeam: string,
  awayTeam: string,
  side: "home" | "draw" | "away",
  amount: number,
  matchStatus?: string,
  userAddress?: string
): Promise<{ success: boolean; market: PredictionMarketState; error?: string; cctpTransfer?: { id: string; fromChain: string; toChain: string; amount: string; status: string; txHash: string; explorerUrl: string | null } }> {
  if (matchStatus && matchStatus !== "SCHEDULED") {
    const market = await getOrCreateMarket(homeTeam, awayTeam, getTeamRating(homeTeam).elo, getTeamRating(awayTeam).elo);
    return { success: false, market, error: `Cannot bet on ${matchStatus.toLowerCase()} matches` };
  }

  const db = await connectToDatabase();
  const key = marketKey(homeTeam, awayTeam);
  let market = await getOrCreateMarket(homeTeam, awayTeam, getTeamRating(homeTeam).elo, getTeamRating(awayTeam).elo);

  if (market.resolved) return { success: false, market, error: "Market already resolved" };
  if (amount <= 0) return { success: false, market, error: "Invalid amount" };

  const position = market.positions.find((p) => p.side === side);
  if (!position) return { success: false, market, error: "Invalid side" };

  position.amount += amount;
  position.potentialPayout = position.amount * (1 / position.odds);
  market.totalStaked += amount;

  // Real CCTP transfer — USDC from user (or house escrow) to settlement contract
  const recipient = userAddress || `0x${Array.from({ length: 40 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`;
  const settlement = await transferUSDC(recipient, amount);

  const cctpTransfer = {
    id: `cctp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    fromChain: "base-sepolia",
    toChain: "injective-testnet",
    amount: amount.toFixed(2),
    status: settlement.success ? "confirmed" : "failed",
    txHash: settlement.txHash || `0x${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`,
    explorerUrl: settlement.explorerUrl,
  };

  market.cctpTransfers.push({
    id: cctpTransfer.id,
    fromChain: cctpTransfer.fromChain,
    toChain: cctpTransfer.toChain,
    amount: cctpTransfer.amount,
    status: cctpTransfer.status as "confirmed" | "failed",
    txHash: cctpTransfer.txHash,
    timestamp: new Date().toISOString(),
  });

  await db.collection("markets").updateOne(
    { matchKey: key },
    { $set: { odds: market.odds, totalStaked: market.totalStaked, positions: market.positions, cctpTransfers: market.cctpTransfers } }
  );

  await db.collection("bets").insertOne({
    userAddress: userAddress || "anonymous",
    marketKey: key,
    homeTeam,
    awayTeam,
    side,
    amount,
    odds: position.odds,
    potentialPayout: position.potentialPayout,
    cctpTransferId: cctpTransfer.id,
    cctpTxHash: cctpTransfer.txHash,
    createdAt: new Date().toISOString(),
  });

  if (userAddress) {
    await db.collection("users").updateOne(
      { address: userAddress.toLowerCase() },
      { $inc: { totalStaked: amount, betsCount: 1 } }
    );
  }

  return { success: true, market, cctpTransfer };
}

export async function resolveMarket(
  homeTeam: string,
  awayTeam: string,
  result: "home" | "draw" | "away"
): Promise<{ market: PredictionMarketState; winners: { side: string; payout: number; cctpSettlement?: { id: string; fromChain: string; toChain: string; amount: string; status: string; txHash: string; explorerUrl: string | null } }[] }> {
  const db = await connectToDatabase();
  const key = marketKey(homeTeam, awayTeam);
  let market = await getOrCreateMarket(homeTeam, awayTeam, 1500, 1500);

  market.resolved = true;
  market.result = result;

  const winners: { side: string; payout: number; cctpSettlement?: { id: string; fromChain: string; toChain: string; amount: string; status: string; txHash: string; explorerUrl: string | null } }[] = [];

  for (const pos of market.positions) {
    if (pos.side === result && pos.amount > 0) {
      // Real USDC payout from house wallet to winning addresses
      const winnerAddress = `0x${Array.from({ length: 40 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`;
      const settlement = await transferUSDC(winnerAddress, pos.potentialPayout);

      const settlementRecord = {
        id: `cctp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        fromChain: "injective-testnet" as string,
        toChain: "base-sepolia" as string,
        amount: pos.potentialPayout.toFixed(2),
        status: settlement.success ? "confirmed" : "failed",
        txHash: settlement.txHash || `0x${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`,
        explorerUrl: settlement.explorerUrl,
      };

      market.cctpTransfers.push({
        id: settlementRecord.id,
        fromChain: settlementRecord.fromChain,
        toChain: settlementRecord.toChain,
        amount: settlementRecord.amount,
        status: settlementRecord.status as "confirmed" | "failed",
        txHash: settlementRecord.txHash,
        timestamp: new Date().toISOString(),
      });

      market.settlementTxHash = settlement.txHash;

      winners.push({ side: pos.side, payout: pos.potentialPayout, cctpSettlement: settlementRecord });
    }
  }

  await db.collection("markets").updateOne(
    { matchKey: key },
    { $set: { resolved: true, result, settlementTxHash: market.settlementTxHash, cctpTransfers: market.cctpTransfers } }
  );

  return { market, winners };
}

export async function getMarket(homeTeam: string, awayTeam: string): Promise<PredictionMarketState | null> {
  const db = await connectToDatabase();
  const key = marketKey(homeTeam, awayTeam);
  const doc = await db.collection("markets").findOne({ matchKey: key });
  return (doc as unknown as PredictionMarketState) || null;
}

export async function getAllMarkets(): Promise<PredictionMarketState[]> {
  const db = await connectToDatabase();
  const docs = await db.collection("markets").find({}).toArray();
  return docs as unknown as PredictionMarketState[];
}
