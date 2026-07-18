"use client";

import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn, settlementColor, confidenceLevel, confidenceColor } from "@/lib/utils";
import type { MatchWithConsensus } from "@/lib/api";

interface MatchCardProps {
  match: MatchWithConsensus;
  onClick: () => void;
  className?: string;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
  SETTLE: {
    label: "Consensus",
    color: "text-accent-green",
    bg: "bg-accent-green-dim border-accent-green/20",
    icon: CheckCircle2,
  },
  DO_NOT_SETTLE: {
    label: "Contested",
    color: "text-accent-red",
    bg: "bg-accent-red-dim border-accent-red/20",
    icon: XCircle,
  },
  PENDING: {
    label: "Analyzing",
    color: "text-accent-yellow",
    bg: "bg-accent-yellow-dim border-accent-yellow/20",
    icon: Clock,
  },
  INSUFFICIENT_DATA: {
    label: "Insufficient data",
    color: "text-text-tertiary",
    bg: "bg-surface-3 border-border-subtle",
    icon: AlertTriangle,
  },
  UNSUPPORTED_SPORT: {
    label: "Not supported",
    color: "text-text-tertiary",
    bg: "bg-surface-3 border-border-subtle",
    icon: AlertTriangle,
  },
};

export function MatchCard({ match, onClick, className }: MatchCardProps) {
  const v = match.consensus;
  const hasConsensus = !!v;
  const verdict = hasConsensus ? (statusConfig[v.settlementDecision] || statusConfig.PENDING) : statusConfig.INSUFFICIENT_DATA;
  const VerdictIcon = verdict.icon;
  const finished = match.status === "FINISHED";
  const live = match.status === "LIVE";
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const level = hasConsensus ? confidenceLevel(v.confidence) : "low";
  const colorClass = confidenceColor(level);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left bg-surface-2 border border-border-subtle rounded-xl",
        "transition-all duration-200 hover:border-border hover:bg-surface-3",
        "focus-ring cursor-pointer group",
        className
      )}
      aria-label={`View intelligence for ${match.homeTeam} vs ${match.awayTeam}`}
    >
      <div className="p-4">
        {/* Top row: status + competition + time */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-2xs font-medium px-2 py-0.5 rounded-full border",
                verdict.bg,
                verdict.color
              )}
            >
              <VerdictIcon size={10} />
              {verdict.label}
              {match.llmPending && (
                <Loader2 size={8} className="animate-spin" />
              )}
            </span>
            {match.competition && (
              <span className="text-2xs text-text-muted hidden sm:inline">
                {match.competition}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {live && (
              <span className="flex items-center gap-1 text-2xs text-accent-red font-medium">
                <span className="status-dot status-dot-red" style={{ width: 5, height: 5 }} />
                LIVE
              </span>
            )}
            {finished && (
              <span className="text-2xs text-text-muted">FT</span>
            )}
            {!finished && !live && (
              <span className="text-2xs text-text-muted">
                {new Date(match.matchDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        {/* Score row */}
        <div className="flex items-center justify-between">
          <div className="flex-1 text-right pr-3">
            <div className="text-sm font-semibold text-text-primary truncate">
              {match.homeTeam}
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="font-mono text-xl font-bold text-text-primary tabular-nums">
              {hasScore ? match.homeScore : "\u2014"}
            </span>
            <span className="text-text-muted text-xs">vs</span>
            <span className="font-mono text-xl font-bold text-text-primary tabular-nums">
              {hasScore ? match.awayScore : "\u2014"}
            </span>
          </div>
          <div className="flex-1 text-left pl-3">
            <div className="text-sm font-semibold text-text-primary truncate">
              {match.awayTeam}
            </div>
          </div>
        </div>

        {/* Bottom row: consensus info + CTA */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
          <div className="flex items-center gap-3">
            {hasConsensus ? (
              <>
                <div className="text-2xs text-text-muted">
                  {v.agreement}/{v.totalAgents} agree
                </div>
                <div className="w-px h-3 bg-border-subtle" />
                <div className={cn("text-2xs font-medium", colorClass)}>
                  {v.confidence}%
                </div>
              </>
            ) : (
              <div className="text-2xs text-text-muted">
                Click to analyze
              </div>
            )}
          </div>
          <div className="text-2xs text-accent-green font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Analyze &rarr;
          </div>
        </div>
      </div>
    </button>
  );
}
