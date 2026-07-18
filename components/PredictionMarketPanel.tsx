"use client";

import { useState, useCallback } from "react";
import { Coins, ArrowRightLeft, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface PredictionMarketPanelProps {
  homeTeam: string;
  awayTeam: string;
  odds: { home: number; draw: number; away: number };
  totalStaked: number;
  onStake: (side: "home" | "draw" | "away", amount: number) => void;
  isResolving?: boolean;
  matchStatus?: string;
  stakeError?: string | null;
  cctpTransfers?: {
    id: string;
    fromChain: string;
    toChain: string;
    amount: string;
    status: "pending" | "confirmed" | "failed";
    txHash: string;
    timestamp: string;
  }[];
}

type Side = "home" | "draw" | "away";

const SIDE_LABELS: Record<Side, string> = {
  home: "Home",
  draw: "Draw",
  away: "Away",
};

function impliedProbability(decimalOdds: number): number {
  if (decimalOdds <= 0) return 0;
  return Math.round((1 / decimalOdds) * 100);
}

export function PredictionMarketPanel({
  homeTeam,
  awayTeam,
  odds,
  totalStaked,
  onStake,
  isResolving = false,
  matchStatus,
  stakeError,
  cctpTransfers = [],
}: PredictionMarketPanelProps) {
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);
  const [amount, setAmount] = useState<string>("");

  const parsedAmount = parseFloat(amount);
  const validAmount = !isNaN(parsedAmount) && parsedAmount > 0;
  const isLocked = matchStatus === "LIVE" || matchStatus === "FINISHED";

  const handleStake = useCallback(() => {
    if (!selectedSide || !validAmount) return;
    onStake(selectedSide, parsedAmount);
    setAmount("");
    setSelectedSide(null);
  }, [selectedSide, validAmount, parsedAmount, onStake]);

  const formatUsdc = (value: number): string => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  const oddsEntries: { side: Side; value: number; team: string }[] = [
    { side: "home", value: odds.home, team: homeTeam },
    { side: "draw", value: odds.draw, team: "Draw" },
    { side: "away", value: odds.away, team: awayTeam },
  ];

  const maxProbability = Math.max(
    ...oddsEntries.map((e) => impliedProbability(e.value))
  );

  return (
    <div
      className={cn(
        "bg-surface-2 border border-border-subtle rounded-xl overflow-hidden",
        "transition-opacity duration-300",
        (isResolving || isLocked) && "opacity-70 pointer-events-none"
      )}
    >
      {isResolving && (
        <div className="relative overflow-hidden">
          <div className="h-0.5 bg-surface-4">
            <div className="h-full bg-accent-purple w-1/3 animate-[shimmer_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      )}

      <div className="p-4">
        {isLocked && (
          <div className="mb-4 p-3 bg-accent-yellow-dim border border-accent-yellow/20 rounded-lg text-center">
            <span className="text-xs font-medium text-accent-yellow">
              {matchStatus === "LIVE" ? "Match is live — staking locked" : "Match is finished — staking closed"}
            </span>
          </div>
        )}

        {stakeError && (
          <div className="mb-4 p-3 bg-accent-red-dim border border-accent-red/20 rounded-lg">
            <span className="text-xs font-medium text-accent-red">{stakeError}</span>
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-purple-dim flex items-center justify-center">
              <Coins size={13} className="text-accent-purple" />
            </div>
            <span className="text-xs font-semibold text-text-primary">
              Prediction Market
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield size={10} className="text-accent-green" />
            <span className="text-2xs text-text-muted">USDC on CCTP</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {oddsEntries.map(({ side, value, team }) => {
            const prob = impliedProbability(value);
            const isSelected = selectedSide === side;
            const isHighest = prob === maxProbability;

            return (
              <button
                key={side}
                onClick={() => setSelectedSide(isSelected ? null : side)}
                disabled={isResolving || isLocked}
                className={cn(
                  "relative flex flex-col items-center gap-1 p-3 rounded-lg border transition-all duration-150 cursor-pointer",
                  "focus-ring",
                  isSelected
                    ? "bg-accent-green-dim border-accent-green/40 text-text-primary"
                    : "bg-surface-3 border-border-subtle hover:border-border text-text-secondary hover:text-text-primary",
                  (isResolving || isLocked) && "cursor-not-allowed"
                )}
              >
                <span className="text-2xs text-text-muted truncate max-w-full">
                  {team}
                </span>
                <span
                  className={cn(
                    "font-mono text-lg font-bold tabular-nums",
                    isSelected ? "text-accent-green" : "text-text-primary"
                  )}
                >
                  {value.toFixed(2)}
                </span>
                <span
                  className={cn(
                    "text-2xs font-medium",
                    isSelected ? "text-accent-green" : "text-text-tertiary"
                  )}
                >
                  {prob}%
                </span>
                {isHighest && !isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent-green" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mb-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-medium">
              $
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={isResolving || isLocked}
              min="0"
              step="0.01"
              className={cn(
                "search-input pl-7 pr-4 w-full",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              aria-label="Stake amount in USDC"
            />
          </div>
        </div>

        <button
          onClick={handleStake}
          disabled={!selectedSide || !validAmount || isResolving || isLocked}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg",
            "text-sm font-semibold transition-all duration-200 cursor-pointer",
            "focus-ring",
            selectedSide && validAmount && !isResolving && !isLocked
              ? "bg-accent-green text-black hover:bg-accent-green/90"
              : "bg-surface-4 text-text-muted cursor-not-allowed"
          )}
        >
          {isResolving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
              Resolving market...
            </>
          ) : (
            <>
              <Coins size={14} />
              {selectedSide && validAmount
                ? `Stake $${parsedAmount.toFixed(2)} on ${SIDE_LABELS[selectedSide]}`
                : "Place stake"}
            </>
          )}
        </button>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
            <span className="text-2xs text-text-muted">
              Total staked
            </span>
            <span className="text-2xs font-mono font-medium text-text-secondary tabular-nums">
              {formatUsdc(totalStaked)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {oddsEntries.map(({ side, value }) => {
              const prob = impliedProbability(value);
              const width = Math.max((prob / maxProbability) * 100, 8);
              const colors: Record<Side, string> = {
                home: "bg-accent-green/60",
                draw: "bg-accent-yellow/60",
                away: "bg-accent-purple/60",
              };
              return (
                <div
                  key={side}
                  className={cn("h-1 rounded-full", colors[side])}
                  style={{ width: `${width}%` }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-surface-3 border-t border-border-subtle">
        {cctpTransfers.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRightLeft size={11} className="text-accent-blue shrink-0" />
              <span className="text-2xs font-medium text-text-secondary">CCTP Transfers</span>
            </div>
            {cctpTransfers.slice(-3).reverse().map((t) => (
              <div key={t.id} className="flex items-center justify-between text-2xs">
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    t.status === "confirmed" ? "bg-accent-green" :
                    t.status === "pending" ? "bg-accent-yellow animate-pulse" :
                    "bg-red-500"
                  )} />
                  <span className="text-text-muted">
                    {t.fromChain.replace("-", " ")} → {t.toChain.replace("-", " ")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-text-secondary">${t.amount}</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-2xs font-medium",
                    t.status === "confirmed" ? "bg-accent-green-dim text-accent-green" :
                    t.status === "pending" ? "bg-accent-yellow-dim text-accent-yellow" :
                    "bg-red-500/10 text-red-400"
                  )}>
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={11} className="text-accent-blue shrink-0" />
            <span className="text-2xs text-text-muted">
              Bridge USDC via CCTP to deposit and participate in markets
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
