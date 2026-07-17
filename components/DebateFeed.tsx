"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Target,
  BarChart3,
  TrendingUp,
  HeartPulse,
  Newspaper,
  type LucideIcon,
} from "lucide-react";

interface DebateMessage {
  agentId: string;
  agentName: string;
  stance: "agree" | "disagree" | "neutral";
  position: string;
  reasoning: string;
  confidence: number;
  respondingTo?: string;
  timestamp: string;
}

interface DebateFeedProps {
  messages: DebateMessage[];
  isVisible: boolean;
}

const AGENT_ICONS: Record<string, LucideIcon> = {
  "tactical-analyst": Target,
  "statistical-analyst": BarChart3,
  "market-analyst": TrendingUp,
  "injury-analyst": HeartPulse,
  "news-analyst": Newspaper,
};

const STANCE_COLORS: Record<DebateMessage["stance"], string> = {
  agree: "accent-green",
  disagree: "accent-red",
  neutral: "accent-yellow",
};

const STANCE_LABELS: Record<DebateMessage["stance"], string> = {
  agree: "Agrees",
  disagree: "Disagrees",
  neutral: "Neutral",
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted" />
      </div>
      <span className="ml-1 text-xs text-text-muted">Analyzing...</span>
    </div>
  );
}

export default function DebateFeed({ messages, isVisible }: DebateFeedProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setVisibleCount(0);
      return;
    }
    setVisibleCount(0);
    if (messages.length === 0) return;

    const timers: NodeJS.Timeout[] = [];
    for (let i = 0; i < messages.length; i++) {
      timers.push(
        setTimeout(() => setVisibleCount(i + 1), (i + 1) * 400)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [isVisible, messages.length]);

  if (!isVisible || messages.length === 0) return null;

  const displayed = messages.slice(0, visibleCount);
  const isTyping = visibleCount < messages.length;

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      {displayed.map((msg, idx) => {
        const Icon = AGENT_ICONS[msg.agentId] ?? Target;
        const stanceColor = STANCE_COLORS[msg.stance];
        const delayClass = `animate-delay-${String((idx % 5) * 75)}`;

        return (
          <div
            key={`${msg.agentId}-${msg.timestamp}-${idx}`}
            className={cn(
              "animate-fade-in-up rounded-xl border border-border-subtle bg-surface-2 p-4 opacity-0",
              delayClass
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg bg-surface-3"
                  )}
                >
                  <Icon className={cn("h-4 w-4", `text-${stanceColor}`)} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-text-primary">
                    {msg.agentName}
                  </span>
                  <span className={cn("text-xs", `text-${stanceColor}`)}>
                    {STANCE_LABELS[msg.stance]}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">
                  {Math.round(msg.confidence * 100)}% confidence
                </span>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-text-secondary">
              {msg.position}
            </p>

            <div className="mt-2 flex items-center justify-end">
              <span className="text-[10px] text-text-tertiary">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        );
      })}

      {isTyping && (
        <div className="animate-fade-in-up rounded-xl border border-border-subtle bg-surface-3 opacity-0">
          <TypingIndicator />
        </div>
      )}
    </div>
  );
}
