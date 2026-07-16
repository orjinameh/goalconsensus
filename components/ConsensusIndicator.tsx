"use client";

import { ConsensusVerdict } from "@/lib/consensus";

interface Props {
  verdict: ConsensusVerdict;
}

export function ConsensusIndicator({ verdict }: Props) {
  const allProviderIds = verdict.providerHealth.map((h) => h.providerId);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        {verdict.providerHealth.map((h) => {
          const isConflicting = verdict.conflictingProviders.includes(
            h.providerId
          );
          let color = "bg-gray-600";
          if (
            verdict.verdict === "PENDING" ||
            verdict.verdict === "INSUFFICIENT_DATA"
          ) {
            color = "bg-gray-600";
          } else if (!h.available) {
            color = "bg-red-500/50 border border-dashed border-red-400";
          } else if (isConflicting) {
            color = "bg-red-500";
          } else {
            color = "bg-green-500";
          }

          return (
            <div key={h.providerId} className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-xs font-mono text-white`}
                title={
                  h.available
                    ? `${h.providerId} — ${h.latencyMs}ms`
                    : `${h.providerId} — DOWN: ${h.error || "unavailable"}`
                }
              >
                {!h.available ? "!" : h.providerId[0].toUpperCase()}
              </div>
              <span className="text-[10px] text-gray-500 max-w-[70px] text-center truncate">
                {h.providerId}
              </span>
              {h.available && (
                <span className="text-[9px] text-gray-600">{h.latencyMs}ms</span>
              )}
              {!h.available && (
                <span className="text-[9px] text-red-400">down</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-gray-500 font-mono">
        n={verdict.totalNodes} threshold≥{Math.ceil((2 * verdict.totalNodes) / 3)} | passing={verdict.passingNodes}
      </div>
    </div>
  );
}
