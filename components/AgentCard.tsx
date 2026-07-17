"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Minus,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Brain,
  ShieldCheck,
} from "lucide-react";
import { cn, confidenceLevel, confidenceColor, formatMs } from "@/lib/utils";
import type { AgentOutput } from "@/lib/agents/types";

interface AgentCardProps {
  agent: AgentOutput;
  agreedWithMajority: boolean;
  isLLMUnavailable: boolean;
  isPending?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

const agentIcons: Record<string, typeof BarChart3> = {
  statistical: BarChart3,
  "llm-reasoning": Brain,
  "deterministic-rules": ShieldCheck,
};

const agentLabels: Record<string, string> = {
  statistical: "Statistical Agent",
  "llm-reasoning": "LLM Reasoning Agent",
  "deterministic-rules": "Deterministic Rules Agent",
};

export function AgentCard({
  agent,
  agreedWithMajority,
  isLLMUnavailable,
  isPending = false,
  defaultExpanded = false,
  className,
}: AgentCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const Icon = agentIcons[agent.agentId] || BarChart3;
  const label = agentLabels[agent.agentId] || agent.agentName;
  const level = confidenceLevel(agent.confidence);
  const colorClass = confidenceColor(level);

  return (
    <div
      className={cn(
        "border rounded-xl transition-all duration-200",
        expanded
          ? "bg-surface-3 border-border"
          : "bg-surface-2 border-border-subtle hover:border-border",
        isLLMUnavailable && "opacity-60",
        className
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
        aria-expanded={expanded}
      >
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            isPending
              ? "bg-accent-purple-dim"
              : isLLMUnavailable
                ? "bg-surface-4"
                : agreedWithMajority
                  ? "bg-accent-green-dim"
                  : "bg-accent-red-dim"
          )}
        >
          {isPending ? (
            <div className="w-3 h-3 border-2 border-accent-purple/40 border-t-accent-purple rounded-full animate-spin" />
          ) : isLLMUnavailable ? (
            <Minus size={14} className="text-text-muted" />
          ) : agreedWithMajority ? (
            <CheckCircle2 size={14} className="text-accent-green" />
          ) : (
            <XCircle size={14} className="text-accent-red" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon size={14} className="text-text-tertiary" />
            <span className="text-sm font-medium text-text-primary">
              {label}
            </span>
          </div>
          <div className="text-2xs text-text-muted mt-0.5">
            {isPending
              ? "Analyzing..."
              : isLLMUnavailable
                ? "Unavailable — skipped"
                : `Predicted: ${agent.prediction.winner} (${agent.confidence}%)`}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isPending && !isLLMUnavailable && (
            <span className={cn("text-xs font-mono font-medium", colorClass)}>
              {agent.confidence}%
            </span>
          )}
          {!isPending && agent.latencyMs > 0 && (
            <span className="text-2xs text-text-muted font-mono hidden sm:inline">
              {formatMs(agent.latencyMs)}
            </span>
          )}
          {expanded ? (
            <ChevronUp size={14} className="text-text-muted" />
          ) : (
            <ChevronDown size={14} className="text-text-muted" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 animate-fade-in">
          <div className="h-px bg-border-subtle" />

          {agent.prediction.homeScore !== null &&
            agent.prediction.awayScore !== null && (
              <div className="flex items-center justify-center gap-3 py-2">
                <span className="text-sm text-text-secondary font-medium">
                  {agent.prediction.homeScore}
                </span>
                <span className="text-text-muted">-</span>
                <span className="text-sm text-text-secondary font-medium">
                  {agent.prediction.awayScore}
                </span>
              </div>
            )}

          <p className="text-xs text-text-secondary leading-relaxed">
            {agent.explanation}
          </p>

          {agent.evidence.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-2xs text-text-muted uppercase tracking-wider font-medium">
                Evidence
              </div>
              {agent.evidence.map((ev, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-2xs text-text-tertiary"
                >
                  <span className="w-1 h-1 rounded-full bg-text-muted mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{ev.detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
