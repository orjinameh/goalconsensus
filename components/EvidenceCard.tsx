"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentEvidence } from "@/lib/agents/types";

interface EvidenceCardProps {
  evidence: AgentEvidence[];
  className?: string;
}

const sourceLabels: Record<string, string> = {
  statistical: "Statistical",
  "llm-reasoning": "LLM",
  "deterministic-rules": "Rules",
};

const sourceColors: Record<string, string> = {
  statistical: "text-accent-blue",
  "llm-reasoning": "text-accent-purple",
  "deterministic-rules": "text-accent-green",
};

export function EvidenceCard({ evidence, className }: EvidenceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? evidence : evidence.slice(0, 4);
  const hasMore = evidence.length > 4;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="text-2xs text-text-muted uppercase tracking-wider font-medium">
          Evidence ({evidence.length})
        </div>
      </div>

      <div className="space-y-1.5">
        {visibleItems.map((ev, i) => (
          <div
            key={i}
            className="evidence-card flex items-start gap-3"
          >
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                ev.weight > 0.2 ? "bg-accent-green" : "bg-text-muted"
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={cn(
                    "text-2xs font-medium",
                    sourceColors[ev.source] || "text-text-tertiary"
                  )}
                >
                  {sourceLabels[ev.source] || ev.source}
                </span>
                <span className="text-2xs text-text-muted">
                  weight: {(ev.weight * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {ev.detail}
              </p>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-2xs text-text-muted hover:text-text-secondary transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp size={10} />
              Show less
            </>
          ) : (
            <>
              <ChevronDown size={10} />
              Show {evidence.length - 4} more
            </>
          )}
        </button>
      )}
    </div>
  );
}
