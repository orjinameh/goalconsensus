"use client";

import { useState } from "react";
import { MatchResult } from "@/lib/providers";
import { ConsensusResult } from "@/lib/consensus";
import { X402Receipt } from "@/lib/x402";
import { ConsensusIndicator } from "./ConsensusIndicator";
import {
  Zap,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface Props {
  match: MatchResult & { consensus: ConsensusResult };
}

const verdictColors: Record<string, string> = {
  SETTLE: "bg-green-500/20 text-green-400 border-green-500/30",
  DO_NOT_SETTLE: "bg-red-500/20 text-red-400 border-red-500/30",
  PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  INSUFFICIENT_DATA: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const verdictIcons: Record<string, typeof CheckCircle> = {
  SETTLE: CheckCircle,
  DO_NOT_SETTLE: XCircle,
  PENDING: Clock,
  INSUFFICIENT_DATA: AlertTriangle,
};

export function MatchCard({ match }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  const v = match.consensus;
  const VerdictIcon = verdictIcons[v.settlementDecision] || Clock;

  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${verdictColors[v.settlementDecision] || verdictColors.PENDING}`}
        >
          <VerdictIcon size={10} />
          {v.settlementDecision}
        </span>
        {match.status === "LIVE" && (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            LIVE
          </span>
        )}
        {match.status === "FINISHED" && (
          <span className="text-xs text-gray-500">FT</span>
        )}
        {match.status === "SCHEDULED" && (
          <span className="text-xs text-gray-500">
            {new Date(match.matchDate).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 text-right">
          <span className="text-white font-medium">{match.homeTeam}</span>
        </div>
        <div className="mx-4 font-mono text-xl text-white min-w-[80px] text-center">
          {match.homeScore !== null && match.awayScore !== null
            ? `${match.homeScore} - ${match.awayScore}`
            : "vs"}
        </div>
        <div className="flex-1 text-left">
          <span className="text-white font-medium">{match.awayTeam}</span>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Consensus Confidence</span>
          <span>{v.confidence}%</span>
        </div>
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              v.confidence >= 66
                ? "bg-green-500"
                : v.confidence >= 33
                  ? "bg-yellow-500"
                  : "bg-gray-500"
            }`}
            style={{ width: `${v.confidence}%` }}
          />
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors mb-2"
      >
        <span>Agent Consensus</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="mb-3 space-y-3">
          <ConsensusIndicator consensus={v} />

          <div className="space-y-2">
            {v.agents.map((agent) => (
              <div
                key={agent.agentId}
                className="p-2 bg-white/5 rounded border border-white/5"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white font-medium">
                    {agent.agentName}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {agent.latencyMs}ms
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">{agent.explanation}</p>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-gray-500 font-mono px-2 py-1 bg-white/5 rounded">
            {v.reasoning}
          </div>
        </div>
      )}

      <button
        onClick={() => setShowEvidence(!showEvidence)}
        className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors mb-2"
      >
        <span>Evidence ({v.evidence.length} items)</span>
        {showEvidence ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {showEvidence && (
        <div className="mb-3 space-y-1">
          {v.evidence.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px]">
              <span
                className={`shrink-0 px-1 rounded ${
                  e.source === "statistical"
                    ? "bg-blue-500/20 text-blue-400"
                    : e.source === "llm-reasoning"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-orange-500/20 text-orange-400"
                }`}
              >
                {e.source.split("-")[0]}
              </span>
              <span className="text-gray-400">{e.detail}</span>
              <span className="text-gray-600 shrink-0">
                w:{(e.weight * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
