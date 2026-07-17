"use client";

import { ConsensusResult } from "@/lib/consensus";
import { CheckCircle2, XCircle, Minus } from "lucide-react";

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
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  isUnavailable
                    ? "bg-gray-700/50 text-gray-500"
                    : agrees
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                }`}
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
              <span className="text-[10px] text-gray-400 max-w-[60px] text-center leading-tight">
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500">
        <span>
          {consensus.agreement} of {consensus.totalAgents} agree
        </span>
        <span className="text-gray-700">|</span>
        <span
          className={
            consensus.settlementDecision === "SETTLE"
              ? "text-green-400 font-medium"
              : consensus.settlementDecision === "DO_NOT_SETTLE"
                ? "text-red-400 font-medium"
                : "text-yellow-400"
          }
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
