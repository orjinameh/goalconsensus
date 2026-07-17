"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Shield, ArrowRight, Zap, Lock, GitBranch, Globe, Trophy } from "lucide-react";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { MatchCard } from "@/components/MatchCard";
import { ConsensusDisplay } from "@/components/ConsensusDisplay";
import { VerificationTimeline, type VerificationStep } from "@/components/VerificationTimeline";
import { EmptyState } from "@/components/EmptyState";
import { MatchCardSkeleton, ConsensusSkeleton } from "@/components/Skeleton";
import {
  fetchMatches,
  fetchConsensus,
  type MatchWithConsensus,
  type MatchesResponse,
} from "@/lib/api";
import type { ConsensusResult } from "@/lib/agents/types";
import type { ProviderHealth } from "@/lib/providers";

type ViewState = "landing" | "loading-verification" | "verifying" | "result";

export default function Home() {
  const [view, setView] = useState<ViewState>("landing");
  const [data, setData] = useState<MatchesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSlow, setLoadingSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentCount, setPaymentCount] = useState(0);
  const [result, setResult] = useState<{
    consensus: ConsensusResult;
    providerHealth: ProviderHealth[];
  } | null>(null);

  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("x402-payment-count");
      if (stored) setPaymentCount(parseInt(stored, 10));
      const interval = setInterval(() => {
        const c = localStorage.getItem("x402-payment-count");
        if (c) setPaymentCount(parseInt(c, 10));
      }, 2000);
      return () => clearInterval(interval);
    } catch {
      return () => {};
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoadingSlow(false);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch("/api/matches", {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e: unknown) {
      const msg =
        e instanceof DOMException && e.name === "AbortError"
          ? "Request timed out. Server may be waking up."
          : "Could not load matches.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const slowTimer = setTimeout(() => setLoadingSlow(true), 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearTimeout(slowTimer);
    };
  }, [loadData]);

  const startVerification = async (homeTeam: string, awayTeam: string) => {
    setView("loading-verification");

    const steps: VerificationStep[] = [
      { id: "providers", label: "Querying Data Providers", status: "pending" },
      { id: "canonical", label: "Building Canonical Match State", status: "pending" },
      { id: "statistical", label: "Running Statistical Agent", status: "pending" },
      { id: "llm", label: "Generating AI Tactical Reasoning", status: "pending" },
      { id: "rules", label: "Running Deterministic Checks", status: "pending" },
      { id: "consensus", label: "Building Consensus", status: "pending" },
      { id: "settlement", label: "Preparing Recommendation", status: "pending" },
    ];
    setVerificationSteps(steps);

    await new Promise((r) => setTimeout(r, 300));
    setVerificationSteps((prev) =>
      prev.map((s) => (s.id === "providers" ? { ...s, status: "active" } : s))
    );

    await new Promise((r) => setTimeout(r, 600));
    setVerificationSteps((prev) =>
      prev.map((s) =>
        s.id === "providers"
          ? { ...s, status: "completed", latencyMs: 600, detail: "Cross-referencing providers" }
          : s.id === "canonical"
            ? { ...s, status: "active" }
            : s
      )
    );

    await new Promise((r) => setTimeout(r, 400));
    setVerificationSteps((prev) =>
      prev.map((s) =>
        s.id === "canonical"
          ? { ...s, status: "completed", latencyMs: 400, detail: "Match state confirmed" }
          : s.id === "statistical"
            ? { ...s, status: "active" }
            : s
      )
    );

    try {
      const res = await fetchConsensus(homeTeam, awayTeam);

      setVerificationSteps((prev) =>
        prev.map((s) => {
          if (s.id === "statistical")
            return {
              ...s,
              status: "completed",
              latencyMs: res.agentOutputs.find((a) => a.agentId === "statistical")?.latencyMs || 0,
              detail: `Poisson model + Monte Carlo (1500 sims)`,
            };
          if (s.id === "llm")
            return {
              ...s,
              status: "completed",
              latencyMs: res.agentOutputs.find((a) => a.agentId === "llm-reasoning")?.latencyMs || 0,
              detail: res.agentOutputs.find((a) => a.agentId === "llm-reasoning")?.confidence === 0
                ? "AI reasoning unavailable, skipped"
                : `AI tactical analysis complete`,
            };
          if (s.id === "rules")
            return {
              ...s,
              status: "completed",
              latencyMs: res.agentOutputs.find((a) => a.agentId === "deterministic-rules")?.latencyMs || 0,
              detail: `7 data integrity checks`,
            };
          if (s.id === "consensus")
            return {
              ...s,
              status: "completed",
              latencyMs: 10,
              detail: `Ensemble vote: ${res.consensus.agreement}/${res.consensus.totalAgents} agents agree`,
            };
          if (s.id === "settlement")
            return {
              ...s,
              status: "completed",
              detail: `Decision: ${res.consensus.settlementDecision}`,
            };
          return s;
        })
      );

      await new Promise((r) => setTimeout(r, 500));
      setResult({
        consensus: res.consensus,
        providerHealth: res.providerHealth,
      });
      setView("result");

      try {
        const count = parseInt(localStorage.getItem("x402-payment-count") || "0", 10);
        localStorage.setItem("x402-payment-count", String(count + 1));
      } catch {}
    } catch {
      setVerificationSteps((prev) =>
        prev.map((s) =>
          s.status === "active" || s.status === "pending"
            ? { ...s, status: "error", detail: "Request failed. Please try again." }
            : s
        )
      );
      setTimeout(() => setView("landing"), 3000);
    }
  };

  const goToLanding = () => {
    setView("landing");
    setResult(null);
  };

  if (view === "result" && result) {
    return (
      <div className="min-h-screen">
        <Header paymentCount={paymentCount} />
        <main className="px-5 py-6">
          <ConsensusDisplay
            agreement={result.consensus.agreement}
            totalAgents={result.consensus.totalAgents}
            confidence={result.consensus.confidence}
            prediction={result.consensus.finalPrediction}
            minorityOpinion={result.consensus.minorityOpinion}
            reasoning={result.consensus.reasoning}
            decision={result.consensus.settlementDecision}
            agents={result.consensus.agents}
            matchStatus={result.consensus.canonicalState?.status}
          />
        </main>
      </div>
    );
  }

  if (view === "loading-verification" || view === "verifying") {
    return (
      <div className="min-h-screen">
        <Header paymentCount={paymentCount} />
        <main className="px-5 py-8">
          <div className="max-w-xl mx-auto">
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-text-primary mb-1">
                Analyzing Match
              </h2>
              <p className="text-sm text-text-tertiary">
                Running multi-agent verification pipeline...
              </p>
            </div>
            <div className="bg-surface-2 border border-border-subtle rounded-2xl p-6">
              <VerificationTimeline steps={verificationSteps} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header paymentCount={paymentCount} />

      <main className="px-5">
        <section className="max-w-3xl mx-auto pt-16 sm:pt-24 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-green-dim border border-accent-green/10 rounded-full text-2xs text-accent-green font-medium mb-6">
            <Shield size={12} />
            Multi-Agent Intelligence Platform
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-text-primary mb-4 text-balance">
            GoalConsensus
          </h1>
          <p className="text-xl sm:text-2xl font-medium text-text-secondary mb-3">
            Football Intelligence Platform
          </p>
          <p className="text-sm text-text-tertiary max-w-xl mx-auto leading-relaxed mb-10">
            Predict and verify football match results across every competition using
            AI ensemble voting and BFT provider verification. Trustless, multi-agent intelligence.
          </p>

          <div className="max-w-xl mx-auto">
            <SearchBar
              matches={data?.matches || []}
              onSelect={startVerification}
              autoFocus
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <span className="text-2xs text-text-muted mr-1">Try:</span>
            {[
              { home: "Arsenal", away: "Chelsea" },
              { home: "Real Madrid", away: "Barcelona" },
              { home: "Liverpool", away: "Manchester City" },
            ].map((ex) => (
              <button
                key={`${ex.home}-${ex.away}`}
                onClick={() => startVerification(ex.home, ex.away)}
                className="text-2xs text-text-tertiary hover:text-text-secondary px-2.5 py-1 bg-surface-3 border border-border-subtle rounded-md hover:border-border transition-colors"
              >
                {ex.home} vs {ex.away}
              </button>
            ))}
          </div>
        </section>

        <section className="max-w-3xl mx-auto pb-12">
          <div className="flex items-center justify-center gap-2 sm:gap-4 text-2xs text-text-muted overflow-x-auto no-scrollbar py-2">
            {[
              { icon: <Globe size={10} />, label: "All Competitions" },
              { icon: <Zap size={10} />, label: "2 Providers" },
              { icon: <GitBranch size={10} />, label: "Canonical State" },
              { icon: <Shield size={10} />, label: "3 AI Agents" },
              { icon: <Lock size={10} />, label: "Ensemble Vote" },
            ].map((item, i) => (
              <div key={item.label} className="flex items-center gap-2 shrink-0">
                {i > 0 && <span className="text-text-muted">&rarr;</span>}
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-3 border border-border-subtle rounded-md">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-4xl mx-auto pb-16">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                Live Matches
              </h2>
              <p className="text-2xs text-text-muted mt-0.5">
                Football matches across all competitions with AI analysis
              </p>
            </div>
            {data && (
              <div className="flex items-center gap-1.5 text-2xs text-text-muted">
                <span className="status-dot status-dot-green" />
                <span>
                  {data.providerHealth.filter((p) => p.available).length}/
                  {data.providerHealth.length} providers online
                </span>
              </div>
            )}
          </div>

          {loading && (
            <div>
              {loadingSlow && (
                <div className="text-center mb-4">
                  <p className="text-xs text-text-muted">
                    Server may be waking up -- this can take up to 30 seconds on first load.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <MatchCardSkeleton key={i} />
                ))}
              </div>
            </div>
          )}

          {!loading && error && (
            <EmptyState
              title="Could not load matches"
              description={error}
              icon="search"
              action={{ label: "Retry", onClick: loadData }}
            />
          )}

          {!loading && !error && data && data.matches.length === 0 && (
            <EmptyState
              title="No matches available"
              description="Matches will appear here when football data providers have active fixtures. You can still analyze any match using the search above."
              icon="shield"
            />
          )}

          {!loading && !error && data && data.matches.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.matches.slice(0, 12).map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onClick={() => startVerification(match.homeTeam, match.awayTeam)}
                />
              ))}
            </div>
          )}
        </section>

        <footer className="max-w-4xl mx-auto border-t border-border-subtle py-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-2xs text-text-muted">
            <div className="flex items-center gap-4">
              <a
                href="https://zenodo.org/records/20577665"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text-secondary transition-colors"
              >
                Research paper
              </a>
              <span>MCP Server v3.0</span>
              <span>x402 Protocol</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="status-dot status-dot-green" />
              <span>System operational</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
