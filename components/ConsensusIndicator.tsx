"use client";

import { CheckCircle2, XCircle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConsensusResult } from "@/lib/consensus";

interface Props {
  consensus: ConsensusResult;
}

const agentLabels: Record<string, string> = {
  statistical: "Stats Model",
  "llm-reasoning": "AI Reasoning",
  "deterministic-rules": "Rule Check",
};

export function ConsensusIndicator({ consensus }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 justify-center">
        {consensus.agents.map((agent) => {
          const agrees =
            agent.prediction.winner === consensus.finalPrediction.winner;
          const isUnavailable =
            agent.confidence === 0 && agent.agentId === "llm-reasoning";
          const label =
            agentLabels[agent.agentId] || agent.agentName;

          return (
            <div
              key={agent.agentId}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                  isUnavailable
                    ? "bg-surface-4 text-text-muted"
                    : agrees
                      ? "bg-accent-green-dim text-accent-green"
                      : "bg-accent-red-dim text-accent-red"
                )}
                title={`${label}: ${agent.prediction.winner}`}
              >
                {isUnavailable ? (
                  <Minus size={14} />
                ) : agrees ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <XCircle size={14} />
                )}
              </div>
              <span className="text-2xs text-text-muted max-w-[60px] text-center leading-tight">
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 text-2xs text-text-muted">
        <span>
          {consensus.agreement} of {consensus.totalAgents} agree
        </span>
        <span className="text-text-muted">|</span>
        <span
          className={cn(
            "font-medium",
            consensus.settlementDecision === "SETTLE"
              ? "text-accent-green"
              : consensus.settlementDecision === "DO_NOT_SETTLE"
                ? "text-accent-red"
                : "text-accent-yellow"
          )}
        >
          {consensus.settlementDecision === "SETTLE"
            ? "Safe to Settle"
            : consensus.settlementDecision === "DO_NOT_SETTLE"
              ? "Do Not Settle"
              : consensus.settlementDecision === "PENDING"
                ? "Waiting"
                : "Insufficient Data"}
        </span>
      </div>
    </div>
  );
}
