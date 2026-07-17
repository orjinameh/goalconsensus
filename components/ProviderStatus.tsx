"use client";

import { Wifi, WifiOff } from "lucide-react";
import { cn, formatMs } from "@/lib/utils";
import type { ProviderHealth } from "@/lib/providers";

interface ProviderStatusProps {
  providers: ProviderHealth[];
  className?: string;
}

const providerNames: Record<string, string> = {
  "football-data": "football-data.org",
  thesportsdb: "TheSportsDB",
};

export function ProviderStatus({ providers, className }: ProviderStatusProps) {
  const onlineCount = providers.filter((p) => p.available).length;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="text-2xs text-text-muted uppercase tracking-wider font-medium">
          Provider Status
        </div>
        <div className="flex items-center gap-1.5 text-2xs text-text-muted">
          <span
            className={cn(
              "status-dot",
              onlineCount === providers.length
                ? "status-dot-green"
                : onlineCount > 0
                  ? "status-dot-yellow"
                  : "status-dot-red"
            )}
          />
          <span>
            {onlineCount}/{providers.length} online
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {providers.map((p) => (
          <div
            key={p.providerId}
            className="flex items-center justify-between px-3 py-2 bg-surface-2 border border-border-subtle rounded-lg"
          >
            <div className="flex items-center gap-2.5">
              {p.available ? (
                <Wifi size={12} className="text-accent-green" />
              ) : (
                <WifiOff size={12} className="text-accent-red" />
              )}
              <div>
                <span className="text-xs font-medium text-text-primary">
                  {providerNames[p.providerId] || p.providerId}
                </span>
                {p.error && (
                  <div className="text-2xs text-accent-red/70 mt-0.5 truncate max-w-[200px]">
                    {p.error}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 text-2xs text-text-muted">
              {p.available && (
                <span className="font-mono">{formatMs(p.latencyMs)}</span>
              )}
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-2xs font-medium",
                  p.available
                    ? "bg-accent-green-dim text-accent-green"
                    : "bg-accent-red-dim text-accent-red"
                )}
              >
                {p.available ? "Healthy" : "Down"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
