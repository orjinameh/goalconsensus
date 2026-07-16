"use client";

import { ConsensusResult } from "@/lib/consensus";
import { AgentOutput } from "@/lib/agents/types";

interface Props {
  consensus: ConsensusResult;
}

const agentIcons: Record<string, string> = {
  statistical: "S",
  "llm-reasoning": "L",
  "deterministic-rules": "D",
};

const agentColors: Record<string, string> = {
  statistical: "bg-blue-500",
  "llm-reasoning": "bg-purple-500",
  "deterministic-rules": "bg-orange-500",
};

export function ConsensusIndicator({ consensus }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 justify-center">
        {consensus.agents.map((agent) => {
          const agrees =
            agent.prediction.winner === consensus.finalPrediction.winner;
          return (
            <div key={agent.agentId} className="flex flex-col items-center gap-1">
              <div
                className={`w-10 h-10 rounded-full ${agrees ? "bg-green-500" : "bg-red-500"} flex items-center justify-center text-sm font-mono text-white`}
                title={`${agent.agentName}: ${agent.prediction.winner} (${agent.confidence}%)`}
              >
                {agentIcons[agent.agentId] || "?"}
              </div>
              <span className="text-[10px] text-gray-400 max-w-[70px] text-center truncate">
                {agent.agentName.split(" ")[0]}
              </span>
              <span className="text-[9px] text-gray-600">
                {agent.confidence}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500 font-mono">
        <span>
          votes: {consensus.agreement}/{consensus.totalAgents}
        </span>
        <span>|</span>
        <span
          className={
            consensus.settlementDecision === "SETTLE"
              ? "text-green-400"
              : consensus.settlementDecision === "DO_NOT_SETTLE"
                ? "text-red-400"
                : "text-yellow-400"
          }
        >
          {consensus.settlementDecision}
        </span>
      </div>

      {consensus.minorityOpinion && (
        <div className="text-[10px] text-gray-500 text-center">
          Minority: {consensus.minorityOpinion.agentName} predicted{" "}
          {consensus.minorityOpinion.prediction.winner}
        </div>
      )}
    </div>
  );
}
