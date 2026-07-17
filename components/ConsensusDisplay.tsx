"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
} from "lucide-react";
import { cn, settlementColor, confidenceLevel, confidenceColor } from "@/lib/utils";
import type { ConsensusResult } from "@/lib/agents/types";
import type { ProviderHealth } from "@/lib/providers";
import { SettlementBadge } from "./SettlementBadge";
import { ConfidenceGauge } from "./ConfidenceGauge";
import { AgentCard } from "./AgentCard";
import { EvidenceCard } from "./EvidenceCard";
import { ProviderStatus } from "./ProviderStatus";

interface ConsensusDisplayProps {
  result: ConsensusResult;
  providerHealth: ProviderHealth[];
  onBack: () => void;
  className?: string;
}

export function ConsensusDisplay({
  result,
  providerHealth,
  onBack,
  className,
}: ConsensusDisplayProps) {
  const [showWhy, setShowWhy] = useState(false);
  const level = confidenceLevel(result.confidence);
  const colorClass = confidenceColor(level);

  const finished = result.canonicalState.status === "FINISHED";
  const hasScore =
    result.canonicalState.homeScore !== null &&
    result.canonicalState.awayScore !== null;

  return (
    <div className={cn("max-w-3xl mx-auto space-y-6", className)}>
      {/* Back Navigation */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-text-tertiary hover:text-text-secondary transition-colors focus-ring rounded-lg px-1 py-0.5 -ml-1"
      >
        <ArrowLeft size={16} />
        Back to search
      </button>

      {/* Match Header */}
      <div className="text-center py-4">
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="text-right">
            <div className="text-lg font-bold text-text-primary">
              {result.canonicalState.homeTeam}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-3xl font-bold text-text-primary tabular-nums">
              {hasScore ? result.canonicalState.homeScore : "—"}
            </span>
            <span className="text-text-muted text-lg">vs</span>
            <span className="font-mono text-3xl font-bold text-text-primary tabular-nums">
              {hasScore ? result.canonicalState.awayScore : "—"}
            </span>
          </div>
          <div className="text-left">
            <div className="text-lg font-bold text-text-primary">
              {result.canonicalState.awayTeam}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
          {finished && <span>Full Time</span>}
          {!finished && result.canonicalState.status === "LIVE" && (
            <span className="flex items-center gap-1.5 text-accent-red">
              <span className="status-dot status-dot-red" style={{ width: 5, height: 5 }} />
              Live
            </span>
          )}
          {!finished && result.canonicalState.status === "SCHEDULED" && (
            <span>
              {new Date(result.canonicalState.matchDate).toLocaleDateString(
                "en-US",
                { month: "long", day: "numeric", year: "numeric" }
              )}
            </span>
          )}
          <span className="text-text-muted">·</span>
          <span>
            {result.canonicalState.providerCount} provider
            {result.canonicalState.providerCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Settlement Badge + Confidence Gauge */}
      <div className="bg-surface-2 border border-border-subtle rounded-2xl p-8">
        <div className="flex flex-col items-center gap-6">
          <SettlementBadge
            decision={result.settlementDecision}
            size="lg"
          />

          <ConfidenceGauge value={result.confidence} size={140} />

          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <div className="bg-surface-3 border border-border-subtle rounded-xl p-4 text-center">
              <div className="text-2xs text-text-muted uppercase tracking-wider mb-1">
                Agreement
              </div>
              <div className="text-lg font-bold text-text-primary">
                {result.agreement}/{result.totalAgents}
              </div>
              <div className="text-2xs text-text-muted mt-0.5">agents agree</div>
            </div>
            <div className="bg-surface-3 border border-border-subtle rounded-xl p-4 text-center">
              <div className="text-2xs text-text-muted uppercase tracking-wider mb-1">
                Providers
              </div>
              <div className="text-lg font-bold text-text-primary">
                {result.canonicalState.providerAgreement ? "Yes" : "No"}
              </div>
              <div className="text-2xs text-text-muted mt-0.5">
                {result.canonicalState.providerCount} responding
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Minority Opinion */}
      {result.minorityOpinion && (
        <div className="bg-accent-yellow-dim border border-accent-yellow/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-accent-yellow" />
            <span className="text-sm font-medium text-accent-yellow">
              Minority Opinion
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            {result.minorityOpinion.agentName} predicted{" "}
            <span className="font-medium text-text-primary">
              {result.minorityOpinion.prediction.winner}
            </span>{" "}
            with {result.minorityOpinion.confidence}% confidence.
          </p>
        </div>
      )}

      {/* Agent Outputs */}
      <div className="space-y-3">
        <div className="text-2xs text-text-muted uppercase tracking-wider font-medium">
          Verification Agents
        </div>
        {result.agents.map((agent) => (
          <AgentCard
            key={agent.agentId}
            agent={agent}
            agreedWithMajority={
              agent.prediction.winner === result.finalPrediction.winner
            }
            isLLMUnavailable={
              agent.confidence === 0 && agent.agentId === "llm-reasoning"
            }
          />
        ))}
      </div>

      {/* Why This Consensus */}
      <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
        <button
          onClick={() => setShowWhy(!showWhy)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-text-tertiary" />
            <span className="text-sm font-medium text-text-primary">
              Why this consensus?
            </span>
          </div>
          {showWhy ? (
            <ChevronUp size={16} className="text-text-muted" />
          ) : (
            <ChevronDown size={16} className="text-text-muted" />
          )}
        </button>

        {showWhy && (
          <div className="px-5 pb-5 space-y-4 animate-fade-in">
            <div className="h-px bg-border-subtle" />
            <p className="text-xs text-text-secondary leading-relaxed">
              {result.reasoning}
            </p>
          </div>
        )}
      </div>

      {/* Evidence */}
      <div className="bg-surface-2 border border-border-subtle rounded-xl p-5">
        <EvidenceCard evidence={result.evidence} />
      </div>

      {/* Provider Status */}
      <div className="bg-surface-2 border border-border-subtle rounded-xl p-5">
        <ProviderStatus providers={providerHealth} />
      </div>

      {/* Settlement Recommendation */}
      {finished && (
        <div
          className={cn(
            "border rounded-xl p-5",
            result.settlementDecision === "SETTLE"
              ? "bg-accent-green-dim border-accent-green/20"
              : result.settlementDecision === "DO_NOT_SETTLE"
                ? "bg-accent-red-dim border-accent-red/20"
                : "bg-surface-2 border-border-subtle"
          )}
        >
          <div className="text-sm font-semibold text-text-primary mb-2">
            Settlement Recommendation
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            {result.settlementDecision === "SETTLE"
              ? `This match result has been verified by ${result.agreement}/${result.totalAgents} independent agents with ${result.confidence}% confidence. It is safe to settle prediction market positions.`
              : result.settlementDecision === "DO_NOT_SETTLE"
                ? `This match result could not achieve consensus. ${result.agreement}/${result.totalAgents} agents agree. Settlement is NOT recommended until further verification.`
                : "Settlement recommendation is pending additional data or match completion."}
          </p>
        </div>
      )}
    </div>
  );
}
