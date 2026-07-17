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

const STANCE_CONFIG: Record<DebateMessage["stance"], { color: string; label: string; emoji: string }> = {
  agree: { color: "accent-green", label: "Supports consensus", emoji: "" },
  disagree: { color: "accent-red", label: "Challenges consensus", emoji: "" },
  neutral: { color: "accent-yellow", label: "Nuanced position", emoji: "" },
};

function TypingIndicator({ agentName }: { agentName: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted" />
      </div>
      <span className="text-xs text-text-muted">{agentName} is analyzing...</span>
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
        setTimeout(() => setVisibleCount(i + 1), (i + 1) * 350)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [isVisible, messages.length]);

  if (!isVisible || messages.length === 0) return null;

  const displayed = messages.slice(0, visibleCount);
  const isTyping = visibleCount < messages.length;
  const nextAgent = isTyping ? messages[visibleCount] : null;

  return (
    <div className="flex flex-col gap-3 overflow-y-auto">
      {displayed.map((msg, idx) => {
        const Icon = AGENT_ICONS[msg.agentId] ?? Target;
        const stance = STANCE_CONFIG[msg.stance];

        return (
          <div
            key={`${msg.agentId}-${msg.timestamp}-${idx}`}
            className={cn(
              "debate-bubble animate-fade-in-up opacity-0",
              msg.stance === "agree" && "debate-bubble-agree",
              msg.stance === "disagree" && "debate-bubble-disagree",
              msg.stance === "neutral" && "debate-bubble-neutral"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-3">
                  <Icon className={cn("h-3.5 w-3.5", `text-${stance.color}`)} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-text-primary">
                    {msg.agentName}
                  </span>
                  <span className={cn("text-2xs font-medium", `text-${stance.color}`)}>
                    {stance.label}
                  </span>
                </div>
              </div>
              <span className="text-2xs text-text-muted font-mono tabular-nums">
                {Math.round(msg.confidence * 100)}%
              </span>
            </div>

            <p className="text-xs leading-relaxed text-text-secondary pl-9.5">
              {msg.position}
            </p>
            {msg.reasoning && msg.reasoning !== msg.position && (
              <p className="text-2xs leading-relaxed text-text-muted pl-9.5 mt-1.5 italic">
                {msg.reasoning}
              </p>
            )}
          </div>
        );
      })}

      {isTyping && nextAgent && (
        <div className="debate-bubble border-dashed opacity-60">
          <TypingIndicator agentName={nextAgent.agentName} />
        </div>
      )}
    </div>
  );
}
