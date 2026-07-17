"use client";

import { useEffect, useState } from "react";
import {
  Target,
  BarChart3,
  TrendingUp,
  HeartPulse,
  Newspaper,
} from "lucide-react";
import { cn, confidenceLevel, confidenceColor, formatMs } from "@/lib/utils";

interface SpecialistCardProps {
  agent: {
    agentId: string;
    agentName: string;
    confidence: number;
    prediction: {
      winner: string;
      homeScore: number | null;
      awayScore: number | null;
    };
    latencyMs: number;
    explanation: string;
    evidence: { source: string; detail: string; weight: number }[];
  };
  index: number;
  isAnimating?: boolean;
}

const agentConfig: Record<
  string,
  {
    icon: typeof Target;
    accentText: string;
    accentBg: string;
    accentBar: string;
    border: string;
  }
> = {
  "tactical-analyst": {
    icon: Target,
    accentText: "text-accent-blue",
    accentBg: "bg-accent-blue-dim",
    accentBar: "bg-accent-blue",
    border: "border-accent-blue/20",
  },
  "statistical-analyst": {
    icon: BarChart3,
    accentText: "text-accent-green",
    accentBg: "bg-accent-green-dim",
    accentBar: "bg-accent-green",
    border: "border-accent-green/20",
  },
  "market-analyst": {
    icon: TrendingUp,
    accentText: "text-accent-yellow",
    accentBg: "bg-accent-yellow-dim",
    accentBar: "bg-accent-yellow",
    border: "border-accent-yellow/20",
  },
  "injury-analyst": {
    icon: HeartPulse,
    accentText: "text-accent-red",
    accentBg: "bg-accent-red-dim",
    accentBar: "bg-accent-red",
    border: "border-accent-red/20",
  },
  "news-analyst": {
    icon: Newspaper,
    accentText: "text-accent-purple",
    accentBg: "bg-accent-purple-dim",
    accentBar: "bg-accent-purple",
    border: "border-accent-purple/20",
  },
};

const defaultConfig = {
  icon: BarChart3,
  accentText: "text-text-tertiary",
  accentBg: "bg-surface-4",
  accentBar: "bg-text-muted",
  border: "border-border-subtle",
};

export function SpecialistCard({
  agent,
  index,
  isAnimating = false,
}: SpecialistCardProps) {
  const [animatedBar, setAnimatedBar] = useState(false);
  const config = agentConfig[agent.agentId] || defaultConfig;
  const Icon = config.icon;
  const level = confidenceLevel(agent.confidence);
  const colorClass = confidenceColor(level);
  const topEvidence = agent.evidence.slice(0, 2);
  const hasScore =
    agent.prediction.homeScore !== null && agent.prediction.awayScore !== null;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedBar(true), 200 + index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      className={cn(
        "relative rounded-xl border overflow-hidden",
        "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)]",
        "transition-all duration-300",
        "animate-stagger-in opacity-0",
        !isAnimating && "hover:border-[rgba(255,255,255,0.1)]"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {isAnimating && (
        <div className="absolute inset-0 animate-pulse-soft pointer-events-none">
          <div
            className={cn(
              "absolute inset-0 opacity-[0.03]",
              config.accentBg
            )}
          />
        </div>
      )}

      <div className="relative p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                isAnimating ? config.accentBg : "bg-surface-3"
              )}
            >
              {isAnimating ? (
                <div className="w-3.5 h-3.5 border-[1.5px] border-text-muted border-t-text-primary rounded-full animate-spin" />
              ) : (
                <Icon size={14} className={config.accentText} />
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-text-primary">
                {agent.agentName}
              </div>
              <div className="text-2xs text-text-muted font-mono">
                {formatMs(agent.latencyMs)} &middot; {agent.evidence.length} evidence points
              </div>
            </div>
          </div>
          <div className="text-right">
            {isAnimating ? (
              <div className="w-12 h-4 rounded bg-surface-4 shimmer-bg" />
            ) : (
              <span
                className={cn("text-sm font-bold tabular-nums", colorClass)}
              >
                {Math.round(agent.confidence)}%
              </span>
            )}
          </div>
        </div>

        <div className="mb-3">
          <div className="h-1.5 rounded-full bg-surface-4 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                config.accentBar,
                isAnimating && "opacity-40"
              )}
              style={{
                width: isAnimating ? "0%" : `${agent.confidence}%`,
                transitionDelay: animatedBar ? "0ms" : `${index * 80 + 200}ms`,
              }}
            />
          </div>
        </div>

        <div
          className={cn(
            "rounded-lg p-3 mb-3 border",
            "bg-surface-2",
            config.border
          )}
        >
          <div className="text-2xs text-text-muted uppercase tracking-wider font-medium mb-1.5">
            Prediction
          </div>
          {isAnimating ? (
            <div className="space-y-1.5">
              <div className="w-24 h-4 rounded bg-surface-4 shimmer-bg" />
              <div className="w-16 h-3 rounded bg-surface-4 shimmer-bg" />
            </div>
          ) : (
            <>
              <div className="text-sm font-semibold text-text-primary">
                {agent.prediction.winner}
              </div>
              {hasScore && (
                <div className="font-mono text-xs text-text-secondary mt-0.5 tabular-nums">
                  {agent.prediction.homeScore} - {agent.prediction.awayScore}
                </div>
              )}
            </>
          )}
        </div>

        {topEvidence.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-2xs text-text-muted uppercase tracking-wider font-medium">
              Evidence
            </div>
            {isAnimating ? (
              <div className="space-y-1.5">
                <div className="w-full h-6 rounded bg-surface-4 shimmer-bg" />
                <div className="w-3/4 h-6 rounded bg-surface-4 shimmer-bg" />
              </div>
            ) : (
              topEvidence.map((ev, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2 text-2xs text-text-tertiary",
                    "rounded-md bg-surface-3 px-2.5 py-1.5"
                  )}
                >
                  <span
                    className={cn(
                      "w-1 h-1 rounded-full mt-1.5 shrink-0",
                      config.accentBar
                    )}
                  />
                  <span className="leading-relaxed flex-1">{ev.detail}</span>
                  <span className="text-text-muted font-mono shrink-0 ml-1">
                    {Math.round(ev.weight * 100)}%
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
