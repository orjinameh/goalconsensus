"use client";

import { ConsensusVerdict } from "@/lib/consensus";

interface Props {
  verdict: ConsensusVerdict;
}

const sourceLabels = ["football-data", "thesportsdb", "simulated"];

export function ConsensusIndicator({ verdict }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        {sourceLabels.map((src) => {
          const isConflicting = verdict.conflictingSources.includes(src);
          const isSimulated = src === "simulated";
          let color = "bg-gray-600";
          if (verdict.verdict === "PENDING" || verdict.verdict === "INSUFFICIENT_DATA") {
            color = "bg-gray-600";
          } else if (isConflicting) {
            color = "bg-red-500";
          } else if (isSimulated) {
            color = "bg-gray-600 border border-dashed border-gray-400";
          } else {
            color = "bg-green-500";
          }

          return (
            <div key={src} className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-xs font-mono text-white`}
              >
                {isSimulated ? "~" : src[0].toUpperCase()}
              </div>
              <span className="text-[10px] text-gray-500 max-w-[60px] text-center truncate">
                {src}
              </span>
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-gray-500 font-mono">
        n={verdict.totalNodes} f=1 threshold≥2 | passing={verdict.passingNodes}
      </div>
    </div>
  );
}
