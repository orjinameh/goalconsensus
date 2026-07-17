"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Bot,
  Brain,
  Lightbulb,
  ShieldAlert,
  AlertTriangle,
  CircleDot,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn, confidenceLevel, confidenceColor } from "@/lib/utils";
import type { AgentOutput, PredictionResult } from "@/lib/agents/types";
import { VerificationTimeline, type VerificationStep } from "./VerificationTimeline";

interface ConsensusDisplayProps {
  agreement: number;
  totalAgents: number;
  confidence: number;
  prediction?: {
    winner: string;
    homeScore: number | null;
    awayScore: number | null;
  };
  minorityOpinion?: AgentOutput | null;
  reasoning: string;
  decision: string;
  agents: AgentOutput[];
  predictionResult?: PredictionResult | null;
  matchStatus?: "SCHEDULED" | "LIVE" | "FINISHED";
}

function isPredictionStatus(status?: string): boolean {
  return status === "SCHEDULED";
}

function decisionLabel(decision: string, isPrediction: boolean): string {
  if (isPrediction) {
    switch (decision) {
      case "UNANIMOUS": return "Unanimous Ensemble";
      case "STRONG_MAJORITY": return "Strong Majority";
      case "MAJORITY": return "Majority";
      case "SPLIT": return "Split Ensemble";
      case "COMPLETED": return "Completed";
      case "INSUFFICIENT_DATA": return "No Data";
      case "UNSUPPORTED_SPORT": return "Unsupported";
      default: return decision;
    }
  }
  switch (decision) {
    case "SETTLE": return "Safe to Settle";
    case "DO_NOT_SETTLE": return "Do Not Settle";
    case "PENDING": return "Pending";
    case "INSUFFICIENT_DATA": return "No Data";
    case "UNSUPPORTED_SPORT": return "Unsupported";
    default: return decision;
  }
}

function decisionColor(decision: string): string {
  switch (decision) {
    case "SETTLE":
    case "UNANIMOUS":
    case "STRONG_MAJORITY":
    case "COMPLETED":
      return "text-accent-green";
    case "DO_NOT_SETTLE":
    case "SPLIT":
      return "text-accent-red";
    case "PENDING":
    case "MAJORITY":
      return "text-accent-yellow";
    case "INSUFFICIENT_DATA":
    case "UNSUPPORTED_SPORT":
      return "text-text-muted";
    default:
      return "text-text-secondary";
  }
}

function decisionIcon(decision: string) {
  switch (decision) {
    case "SETTLE":
    case "UNANIMOUS":
    case "STRONG_MAJORITY":
    case "COMPLETED":
      return <CircleDot size={10} />;
    case "DO_NOT_SETTLE":
    case "SPLIT":
      return <AlertTriangle size={10} />;
    case "PENDING":
    case "MAJORITY":
      return <Clock size={10} />;
    default:
      return <CircleDot size={10} />;
  }
}

function riskBadge(rating: "low" | "medium" | "high") {
  const config = {
    low: { label: "Low Risk", icon: TrendingDown, color: "text-accent-green bg-accent-green-dim border-accent-green/20" },
    medium: { label: "Med Risk", icon: Minus, color: "text-accent-yellow bg-accent-yellow-dim border-accent-yellow/20" },
    high: { label: "High Risk", icon: TrendingUp, color: "text-accent-red bg-accent-red-dim border-accent-red/20" },
  };
  const { label, icon: Icon, color } = config[rating];
  return (
    <span className={cn("inline-flex items-center gap-1 text-2xs font-medium px-2 py-0.5 rounded-full border", color)}>
      <Icon size={8} />
      {label}
    </span>
  );
}

export function ConsensusDisplay({
  agreement,
  totalAgents,
  confidence,
  prediction,
  minorityOpinion,
  reasoning,
  decision,
  agents,
  predictionResult,
  matchStatus,
}: ConsensusDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const level = confidenceLevel(confidence);
  const colorClass = confidenceColor(level);
  const isPred = isPredictionStatus(matchStatus);
  const minority = predictionResult?.minorityOpinion || minorityOpinion;

  const steps: VerificationStep[] = agents.map((a, i) => {
    const isMajority = a.prediction.winner === prediction?.winner;
    return {
      id: a.agentId,
      label: `${a.agentName} — ${a.prediction.winner} ${a.prediction.homeScore ?? "?"}-${a.prediction.awayScore ?? "?"}`,
      status: isMajority ? "completed" : "error",
      detail: a.explanation,
      latencyMs: a.latencyMs,
    };
  });

  return (
    <div className="bg-surface-2 border border-border-subtle rounded-xl">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isPred ? (
              <Brain size={14} className="text-accent-blue" />
            ) : (
              <ShieldAlert size={14} className="text-accent-green" />
            )}
            <span className="text-sm font-semibold text-text-primary">
              {isPred ? "AI Ensemble" : "BFT Verification"}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-2xs font-medium px-2 py-0.5 rounded-full border",
                isPred
                  ? "bg-accent-blue-dim border-accent-blue/20 text-accent-blue"
                  : "bg-accent-green-dim border-accent-green/20 text-accent-green"
              )}
            >
              {decisionIcon(decision)}
              {decisionLabel(decision, isPred)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isPred && predictionResult && riskBadge(predictionResult.riskRating)}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-surface-4 rounded-md transition-colors cursor-pointer"
            >
              {expanded ? (
                <ChevronUp size={14} className="text-text-muted" />
              ) : (
                <ChevronDown size={14} className="text-text-muted" />
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <div className="text-2xs text-text-muted mb-1">
              {isPred ? "Ensemble Confidence" : "Confidence"}
            </div>
            <div className={cn("text-lg font-bold tabular-nums", colorClass)}>
              {confidence}%
            </div>
          </div>
          <div>
            <div className="text-2xs text-text-muted mb-1">Agreement</div>
            <div className="text-lg font-bold text-text-primary tabular-nums">
              {agreement}/{totalAgents}
            </div>
          </div>
          {isPred && prediction && (
            <div>
              <div className="text-2xs text-text-muted mb-1">Ensemble Pick</div>
              <div className="text-sm font-semibold text-text-primary">
                {prediction.winner}
              </div>
              {prediction.homeScore !== null && (
                <div className="text-2xs text-text-muted">
                  {prediction.homeScore}-{prediction.awayScore}
                </div>
              )}
            </div>
          )}
          {!isPred && prediction && (
            <div>
              <div className="text-2xs text-text-muted mb-1">Score</div>
              <div className="text-sm font-semibold text-text-primary">
                {prediction.homeScore ?? "?"} — {prediction.awayScore ?? "?"}
              </div>
            </div>
          )}
        </div>

        {isPred && predictionResult && (
          <div className="flex items-center gap-4 mb-3 text-2xs text-text-muted">
            <span>
              Upset prob: <span className="text-text-secondary font-medium">{predictionResult.upsetProbability}%</span>
            </span>
            {minority && (
              <span>
                Minority: <span className="text-text-secondary font-medium">{minority.agentName}</span> ({minority.prediction.winner})
              </span>
            )}
          </div>
        )}

        {reasoning && (
          <div className="bg-surface-3 border border-border-subtle rounded-lg p-3 mb-3">
            <div className="text-2xs text-text-muted mb-1">
              {isPred ? "Ensemble Reasoning" : "Consensus Reasoning"}
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              {reasoning}
            </p>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border-subtle p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Bot size={12} className="text-text-muted" />
            <span className="text-2xs text-text-muted font-medium uppercase tracking-wider">
              {isPred ? "Agent Predictions" : "Agent Consensus"}
            </span>
          </div>
          <VerificationTimeline steps={steps} />
          {minority && (
            <div className="mt-3 bg-accent-yellow-dim border border-accent-yellow/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Lightbulb size={10} className="text-accent-yellow" />
                <span className="text-2xs font-medium text-accent-yellow">
                  Minority Opinion
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                {minority.agentName} predicts {minority.prediction.winner}{" "}
                {minority.prediction.homeScore ?? "?"}-{minority.prediction.awayScore ?? "?"} with{" "}
                {minority.confidence}% confidence
              </p>
              {minority.explanation && (
                <p className="text-2xs text-text-muted mt-1">
                  {minority.explanation}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
