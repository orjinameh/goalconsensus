"use client";

import { useState } from "react";
import { MatchResult } from "@/lib/providers";
import { ConsensusResult } from "@/lib/consensus";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Shield,
  Zap,
} from "lucide-react";

interface Props {
  match: MatchResult & { consensus: ConsensusResult; llmPending?: boolean };
}

const verdictConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof CheckCircle2; description: string }
> = {
  SETTLE: {
    label: "Prediction Confirmed",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    icon: CheckCircle2,
    description: "All 3 analysts agree on the result. Safe to settle.",
  },
  DO_NOT_SETTLE: {
    label: "Analysts Disagree",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    icon: XCircle,
    description: "The analysts don't agree. Do not settle yet.",
  },
  PENDING: {
    label: "Analyzing",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    icon: Clock,
    description: "Match hasn't finished yet. Prediction updates live.",
  },
  INSUFFICIENT_DATA: {
    label: "Waiting for Data",
    color: "text-gray-400",
    bg: "bg-gray-500/10 border-gray-500/20",
    icon: AlertTriangle,
    description: "Not enough data sources to make a prediction.",
  },
  UNSUPPORTED_SPORT: {
    label: "Not Supported",
    color: "text-gray-400",
    bg: "bg-gray-500/10 border-gray-500/20",
    icon: AlertTriangle,
    description: "This sport is not supported yet.",
  },
};

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            value >= 70
              ? "bg-green-500"
              : value >= 40
                ? "bg-yellow-500"
                : "bg-red-500"
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 tabular-nums w-8 text-right">
        {value}%
      </span>
    </div>
  );
}

export function MatchCard({ match }: Props) {
  const [expanded, setExpanded] = useState(false);

  const v = match.consensus;
  const verdict = verdictConfig[v.settlementDecision] || verdictConfig.PENDING;
  const VerdictIcon = verdict.icon;

  const predictionLabel =
    v.finalPrediction.winner === "Draw"
      ? "Draw"
      : v.finalPrediction.winner;

  const finished = match.status === "FINISHED";
  const live = match.status === "LIVE";
  const hasScore =
    match.homeScore !== null && match.awayScore !== null;

  return (
    <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
      {/* Score Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${verdict.bg} ${verdict.color}`}
          >
            <VerdictIcon size={12} />
            {verdict.label}
            {match.llmPending && (
              <Loader2 size={10} className="animate-spin ml-0.5" />
            )}
          </span>
          <div className="flex items-center gap-2">
            {live && (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                LIVE
              </span>
            )}
            {finished && (
              <span className="text-xs text-gray-500">Full Time</span>
            )}
            {!finished && !live && (
              <span className="text-xs text-gray-500">
                {new Date(match.matchDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1 text-right pr-4">
            <div className="text-white font-semibold text-sm leading-tight">
              {match.homeTeam}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-2xl font-bold text-white tabular-nums">
              {hasScore ? match.homeScore : "-"}
            </span>
            <span className="text-gray-600 text-lg">:</span>
            <span className="font-mono text-2xl font-bold text-white tabular-nums">
              {hasScore ? match.awayScore : "-"}
            </span>
          </div>
          <div className="flex-1 text-left pl-4">
            <div className="text-white font-semibold text-sm leading-tight">
              {match.awayTeam}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-5 pb-4 grid grid-cols-3 gap-3">
        <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
            Our Prediction
          </div>
          <div className="text-xs text-white font-medium truncate">
            {predictionLabel}
          </div>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
            Confidence
          </div>
          <div className="text-xs text-white font-medium">
            {v.confidence}%
          </div>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
            Agreement
          </div>
          <div className="text-xs text-white font-medium">
            {v.agreement}/{v.totalAgents}
          </div>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="px-5 pb-4">
        <ConfidenceBar value={v.confidence} />
      </div>

      {/* Verdict Description */}
      <div className={`mx-5 mb-4 px-3 py-2 rounded-lg text-xs ${verdict.bg} ${verdict.color}`}>
        {verdict.description}
      </div>

      {/* How It Works */}
      <div className="border-t border-white/5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-3 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Shield size={12} />
            How was this predicted?
          </span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expanded && (
          <div className="px-5 pb-4 space-y-3">
            {/* Agent Votes */}
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                Verification Agents
              </div>
              <div className="space-y-1.5">
                {v.agents.map((agent) => {
                  const agrees =
                    agent.prediction.winner === v.finalPrediction.winner;
                  const isLLM = agent.agentId === "llm-reasoning";
                  const isUnavailable =
                    agent.confidence === 0 && isLLM;
                  const isPending = match.llmPending && isLLM && isUnavailable;
                  const agentLabel =
                    agent.agentId === "statistical"
                      ? "Stats Model"
                      : isLLM
                        ? "AI Reasoning"
                        : "Rule Check";

                  return (
                    <div
                      key={agent.agentId}
                      className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-lg"
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          isPending
                            ? "bg-purple-500/20"
                            : isUnavailable
                              ? "bg-gray-700 text-gray-500"
                              : agrees
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {isPending ? (
                          <Loader2 size={12} className="text-purple-400 animate-spin" />
                        ) : isUnavailable ? (
                          <span className="text-[10px]">-</span>
                        ) : agrees ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white font-medium">
                          {agentLabel}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {isPending
                            ? "Analyzing..."
                            : isUnavailable
                              ? "Unavailable"
                              : `Predicted: ${agent.prediction.winner} (${agent.confidence}%)`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simple Reasoning */}
            <div className="text-[11px] text-gray-400 bg-white/[0.02] rounded-lg p-3 leading-relaxed">
              {v.agreement === v.totalAgents && v.agreement > 0 && (
                <span className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="text-green-400 mt-0.5 shrink-0" />
                  All {v.agreement} analysts agree on the result.
                </span>
              )}
              {v.agreement < v.totalAgents && v.agreement > 0 && (
                <span className="flex items-start gap-2">
                  <AlertTriangle size={12} className="text-yellow-400 mt-0.5 shrink-0" />
                  {v.agreement} of {v.totalAgents} analysts agree.
                  {v.minorityOpinion && (
                    <span className="text-gray-500">
                      {" "}One analyst sees it differently.
                    </span>
                  )}
                </span>
              )}
              {v.agreement === 0 && (
                <span className="flex items-start gap-2">
                  <XCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
                  No analysts agree on the outcome.
                </span>
              )}
            </div>

            {/* Data Sources */}
            <div className="text-[10px] text-gray-600 flex items-center gap-2">
              <Zap size={10} />
              Verified from {v.canonicalState.providerCount} data source
              {v.canonicalState.providerCount !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
