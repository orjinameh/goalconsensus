"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Shield,
  Brain,
  Globe,
  Zap,
  GitBranch,
  Lock,
  ArrowRight,
  Target,
  BarChart3,
  TrendingUp,
  HeartPulse,
  Newspaper,
  Code2,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { MatchCard } from "@/components/MatchCard";
import { MatchCardSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { IntelligencePanel } from "@/components/IntelligencePanel";
import { cn } from "@/lib/utils";
import type { MatchWithConsensus } from "@/lib/api";

const SPECIALIST_AGENTS = [
  { id: "tactical", name: "Tactical", icon: Target, color: "text-accent-blue", description: "Formations & pressing" },
  { id: "statistical", name: "Statistical", icon: BarChart3, color: "text-accent-green", description: "Poisson & xG models" },
  { id: "market", name: "Market", icon: TrendingUp, color: "text-accent-yellow", description: "Odds & value detection" },
  { id: "injury", name: "Injury", icon: HeartPulse, color: "text-accent-red", description: "Squad fitness analysis" },
  { id: "news", name: "News", icon: Newspaper, color: "text-accent-purple", description: "Form & context" },
];

const PIPELINE_STEPS = [
  { icon: <Globe size={10} />, label: "Live Data" },
  { icon: <Zap size={10} />, label: "Canonical State" },
  { icon: <Brain size={10} />, label: "5 AI Agents" },
  { icon: <GitBranch size={10} />, label: "Live Debate" },
  { icon: <Lock size={10} />, label: "Consensus" },
];

export default function HomePage() {
  const [view, setView] = useState<"terminal" | "intelligence" | "developers" | "docs">("terminal");
  const [selectedMatch, setSelectedMatch] = useState<{ home: string; away: string } | null>(null);
  const [matches, setMatches] = useState<MatchWithConsensus[]>([]);
  const [providerHealth, setProviderHealth] = useState<{ providerId: string; available: boolean; latencyMs: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlow, setLoadingSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentCount, setPaymentCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const count = parseInt(localStorage.getItem("x402-payment-count") || "0", 10);
      setPaymentCount(count);
    } catch {}
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const controller = new AbortController();
      timerRef.current = setTimeout(() => controller.abort(), 30000);
      const res = await fetch("/api/matches", { signal: controller.signal });
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setMatches(data.matches || []);
      setProviderHealth(data.providerHealth || []);
    } catch (e) {
      const msg =
        e instanceof DOMException && e.name === "AbortError"
          ? "Server may be waking up. First request can take up to 30 seconds."
          : "Could not connect to intelligence sources. Check your network and try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const slowTimer = setTimeout(() => setLoadingSlow(true), 8000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearTimeout(slowTimer);
    };
  }, [loadData]);

  const handleSelectMatch = (homeTeam: string, awayTeam: string) => {
    setSelectedMatch({ home: homeTeam, away: awayTeam });
    setView("intelligence");
    try {
      const count = parseInt(localStorage.getItem("x402-payment-count") || "0", 10);
      localStorage.setItem("x402-payment-count", String(count + 1));
      setPaymentCount(count + 1);
    } catch {}
  };

  const handleBack = () => {
    setView("terminal");
    setSelectedMatch(null);
  };

  if (view === "intelligence" && selectedMatch) {
    return (
      <IntelligencePanel
        homeTeam={selectedMatch.home}
        awayTeam={selectedMatch.away}
        onBack={handleBack}
      />
    );
  }

  if (view === "developers") {
    return <DevelopersPage onBack={handleBack} />;
  }

  if (view === "docs") {
    return <DocsPage onBack={handleBack} />;
  }

  return (
    <div className="min-h-screen">
      <Header
        paymentCount={paymentCount}
        activeView={view}
        onNavigate={(v) => setView(v as "terminal" | "developers" | "docs")}
      />

      <main>
        {/* Hero */}
        <section className="relative px-5 pt-20 sm:pt-28 pb-12 overflow-hidden">
          {/* Subtle radial glow behind hero */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent-green/[0.04] rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-green-dim border border-accent-green/15 rounded-full text-2xs text-accent-green font-medium mb-6 animate-fade-in">
              <Shield size={12} />
              AI Intelligence Marketplace
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary mb-4 text-balance leading-[1.1]">
              Five AI agents.{" "}
              <span className="gradient-text-green">One consensus.</span>
            </h1>

            <p className="text-base sm:text-lg text-text-secondary max-w-xl mx-auto leading-relaxed mb-8">
              GoalConsensus is the intelligence layer for the 2026 World Cup.
              Five specialist AI agents analyze every match, debate the outcome, and deliver a single trusted verdict.
            </p>

            <div className="max-w-xl mx-auto mb-8">
              <SearchBar
                matches={matches}
                onSelect={handleSelectMatch}
                placeholder="Search any match — Spain vs Argentina, Brazil vs Germany..."
                autoFocus
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-2xs text-text-muted mr-1">Try now:</span>
              {[
                { home: "Arsenal", away: "Chelsea" },
                { home: "Real Madrid", away: "Barcelona" },
                { home: "Liverpool", away: "Manchester City" },
              ].map((ex) => (
                <button
                  key={`${ex.home}-${ex.away}`}
                  onClick={() => handleSelectMatch(ex.home, ex.away)}
                  className="text-2xs text-text-tertiary hover:text-text-primary px-2.5 py-1 bg-surface-2 border border-border-subtle rounded-md hover:border-border transition-all duration-150"
                >
                  {ex.home} vs {ex.away}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Pipeline strip */}
        <section className="px-5 pb-12">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-1 sm:gap-2 text-2xs text-text-muted overflow-x-auto no-scrollbar py-2">
              {PIPELINE_STEPS.map((item, i) => (
                <div key={item.label} className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {i > 0 && <span className="text-text-muted/50 text-2xs">&rarr;</span>}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 border border-border-subtle rounded-md">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Specialist Agents */}
        <section className="px-5 pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-lg font-semibold text-text-primary mb-2">Meet the Agents</h2>
              <p className="text-sm text-text-tertiary max-w-md mx-auto">
                Each agent is an independent domain expert. They analyze the same match from different angles, then debate to reach consensus.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {SPECIALIST_AGENTS.map((agent) => {
                const Icon = agent.icon;
                return (
                  <div
                    key={agent.id}
                    className="group bg-surface-2 border border-border-subtle rounded-xl p-4 text-center hover:border-border transition-all duration-200 hover:bg-surface-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-surface-3 group-hover:bg-surface-4 flex items-center justify-center mx-auto mb-3 transition-colors">
                      <Icon size={18} className={agent.color} />
                    </div>
                    <div className="text-xs font-medium text-text-primary mb-0.5">{agent.name}</div>
                    <div className="text-2xs text-text-muted">{agent.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Live Matches */}
        <section className="px-5 pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Live Intelligence</h2>
                <p className="text-sm text-text-tertiary mt-0.5">
                  Click any match to watch five AI agents analyze and debate in real-time
                </p>
              </div>
              {providerHealth.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 text-2xs text-text-muted">
                  <span className="status-dot status-dot-green" />
                  <span>
                    {providerHealth.filter((p) => p.available).length}/
                    {providerHealth.length} sources online
                  </span>
                </div>
              )}
            </div>

            {loading && (
              <div>
                {loadingSlow && (
                  <div className="text-center mb-4 py-3 bg-surface-2 border border-border-subtle rounded-xl">
                    <p className="text-xs text-text-muted">
                      Waking up football data sources — this takes up to 30 seconds on first request.
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
                title="Could not reach intelligence sources"
                description={error}
                icon="search"
                action={{ label: "Retry", onClick: loadData }}
              />
            )}

            {!loading && !error && matches.length === 0 && (
              <EmptyState
                title="No active fixtures"
                description="Match intelligence will appear here when football data sources have active competitions."
                icon="shield"
              />
            )}

            {!loading && !error && matches.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {matches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    onClick={() => handleSelectMatch(m.homeTeam, m.awayTeam)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Developer CTA */}
        <section className="px-5 pb-16">
          <div className="max-w-3xl mx-auto">
            <div className="bg-surface-2 border border-border-subtle rounded-2xl p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-accent-blue/[0.04] rounded-full blur-3xl pointer-events-none" />
              <div className="relative flex flex-col sm:flex-row sm:items-start gap-5">
                <div className="w-12 h-12 rounded-2xl bg-accent-blue-dim flex items-center justify-center shrink-0">
                  <Code2 size={20} className="text-accent-blue" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-text-primary mb-1.5">Built for developers</h3>
                  <p className="text-sm text-text-tertiary leading-relaxed mb-4">
                    GoalConsensus exposes every capability via MCP tools and REST APIs.
                    Build autonomous agents, prediction markets, or fan apps on top of our intelligence layer.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                    {[
                      { label: "MCP Server", desc: "15 tools for agents", icon: Globe },
                      { label: "x402 Payments", desc: "Per-query micropayments", icon: Lock },
                      { label: "5 Agent Skills", desc: "Specialist intelligence", icon: Brain },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="bg-surface-3 border border-border-subtle rounded-lg p-3">
                          <Icon size={14} className="text-accent-blue mb-2" />
                          <div className="text-xs font-medium text-text-primary">{item.label}</div>
                          <div className="text-2xs text-text-muted mt-0.5">{item.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setView("developers")}
                    className="btn-primary text-xs inline-flex items-center gap-1.5"
                  >
                    Explore Developer Tools <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-subtle px-5 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-2xs text-text-muted">
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-accent-green" />
            <span>GoalConsensus v4.0 — The AI Intelligence Marketplace</span>
          </div>
          <span>Built for Injective Global Cup</span>
        </div>
      </footer>
    </div>
  );
}

function DevelopersPage({ onBack }: { onBack: () => void }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copySnippet = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const mcpConfig = `{
  "mcpServers": {
    "goalconsensus": {
      "command": "npx",
      "args": ["tsx", "mcp-server/index.ts"],
      "env": {
        "FOOTBALL_DATA_API_KEY": "",
        "GEMINI_API_KEY": ""
      }
    }
  }
}`;

  const curlExample = `curl -X POST http://localhost:3000/api/intelligence \\
  -H "Content-Type: application/json" \\
  -d '{"homeTeam":"Spain","awayTeam":"Argentina"}'`;

  const responseExample = `{
  "specialistOutputs": [
    {
      "agentId": "tactical-analyst",
      "agentName": "Tactical Analyst",
      "confidence": 72,
      "prediction": { "winner": "Spain", "homeScore": 2, "awayScore": 1 },
      "evidence": [...]
    }
    // ... 4 more agents
  ],
  "debate": {
    "consensus": {
      "winner": "Spain",
      "confidence": 71,
      "agreement": 4,
      "totalAgents": 5
    }
  }
}`;

  const snippets = [mcpConfig, curlExample, responseExample];

  return (
    <div className="min-h-screen">
      <Header activeView="developers" onNavigate={onBack} />
      <main className="px-5 py-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="p-2 hover:bg-surface-3 rounded-lg transition-colors" aria-label="Go back">
            <ArrowRight size={16} className="text-text-muted rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Developer Platform</h1>
            <p className="text-sm text-text-tertiary">Everything you need to build on GoalConsensus</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* MCP Server */}
          <section className="bg-surface-2 border border-border-subtle rounded-xl p-6">
            <h2 className="text-base font-semibold text-text-primary mb-2 flex items-center gap-2">
              <Globe size={16} className="text-accent-blue" />
              MCP Server
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              Connect any MCP-compatible client (Claude Desktop, Cursor, custom agents) to 15 intelligence tools.
            </p>
            <div className="relative bg-surface-3 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle">
                <span className="text-2xs text-text-muted font-mono">claude_desktop_config.json</span>
                <button
                  onClick={() => copySnippet(mcpConfig, 0)}
                  className="text-2xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  {copiedIdx === 0 ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="p-4 text-xs text-text-secondary font-mono overflow-x-auto leading-relaxed">{mcpConfig}</pre>
            </div>
          </section>

          {/* REST API */}
          <section className="bg-surface-2 border border-border-subtle rounded-xl p-6">
            <h2 className="text-base font-semibold text-text-primary mb-2 flex items-center gap-2">
              <Zap size={16} className="text-accent-green" />
              REST API
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              Full intelligence analysis via a single POST request. No API key required for core tools.
            </p>
            <div className="relative bg-surface-3 rounded-lg overflow-hidden mb-3">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle">
                <span className="text-2xs text-text-muted font-mono">Request</span>
                <button
                  onClick={() => copySnippet(curlExample, 1)}
                  className="text-2xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  {copiedIdx === 1 ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="p-4 text-xs text-text-secondary font-mono overflow-x-auto leading-relaxed">{curlExample}</pre>
            </div>
            <div className="relative bg-surface-3 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle">
                <span className="text-2xs text-text-muted font-mono">Response</span>
                <button
                  onClick={() => copySnippet(responseExample, 2)}
                  className="text-2xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  {copiedIdx === 2 ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="p-4 text-xs text-text-secondary font-mono overflow-x-auto leading-relaxed">{responseExample}</pre>
            </div>
          </section>

          {/* Agent Skills */}
          <section className="bg-surface-2 border border-border-subtle rounded-xl p-6">
            <h2 className="text-base font-semibold text-text-primary mb-2 flex items-center gap-2">
              <Brain size={16} className="text-accent-purple" />
              Agent Skills
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              Five specialist agents, each with unique domain expertise, available as MCP tools.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SPECIALIST_AGENTS.map((agent) => {
                const Icon = agent.icon;
                return (
                  <div key={agent.id} className="flex items-center gap-3 bg-surface-3 rounded-lg p-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-4 flex items-center justify-center shrink-0">
                      <Icon size={14} className={agent.color} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-text-primary">{agent.name} Agent</div>
                      <div className="text-2xs text-text-muted">{agent.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* x402 */}
          <section className="bg-surface-2 border border-border-subtle rounded-xl p-6">
            <h2 className="text-base font-semibold text-text-primary mb-2 flex items-center gap-2">
              <Lock size={16} className="text-accent-yellow" />
              x402 Micropayments
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              Premium intelligence reports gated behind x402 protocol. Per-query payments from 0.002 to 0.01 USDC.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Full Tactical Breakdown", price: "0.005 USDC" },
                { label: "Historical Deep Dive", price: "0.003 USDC" },
                { label: "Player Impact Report", price: "0.002 USDC" },
                { label: "Market Intelligence", price: "0.004 USDC" },
                { label: "Risk Assessment", price: "0.01 USDC" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between bg-surface-3 rounded-lg px-3 py-2.5">
                  <span className="text-xs text-text-secondary">{item.label}</span>
                  <span className="text-2xs font-mono font-medium text-accent-yellow">{item.price}</span>
                </div>
              ))}
            </div>
          </section>

          {/* MCP Tools Catalog */}
          <section className="bg-surface-2 border border-border-subtle rounded-xl p-6">
            <h2 className="text-base font-semibold text-text-primary mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-accent-green" />
              MCP Tools Catalog
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              15 tools covering intelligence, prediction, verification, premium reports, and markets.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { name: "analyze_match", cat: "Intelligence" },
                { name: "compare_teams", cat: "Intelligence" },
                { name: "historical_analysis", cat: "Intelligence" },
                { name: "predict_match", cat: "Prediction" },
                { name: "market_analysis", cat: "Specialist" },
                { name: "player_report", cat: "Specialist" },
                { name: "injury_report", cat: "Specialist" },
                { name: "premium_report", cat: "Premium" },
                { name: "verify_result", cat: "Verification" },
                { name: "verify_settlement", cat: "Verification" },
                { name: "get_provider_consensus", cat: "Verification" },
                { name: "consensus", cat: "Legacy" },
                { name: "get_live_matches", cat: "General" },
                { name: "get_report_catalog", cat: "Premium" },
                { name: "qualification_scenarios", cat: "Intelligence" },
              ].map((tool) => (
                <div key={tool.name} className="flex items-center justify-between bg-surface-3 rounded-lg px-3 py-2">
                  <span className="text-xs font-mono text-text-secondary">{tool.name}</span>
                  <span className="text-2xs text-text-muted">{tool.cat}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function DocsPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen">
      <Header activeView="docs" onNavigate={onBack} />
      <main className="px-5 py-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="p-2 hover:bg-surface-3 rounded-lg transition-colors" aria-label="Go back">
            <ArrowRight size={16} className="text-text-muted rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Documentation</h1>
            <p className="text-sm text-text-tertiary">Architecture, APIs, and integration guides</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Architecture */}
          <section className="bg-surface-2 border border-border-subtle rounded-xl p-6">
            <h2 className="text-base font-semibold text-text-primary mb-3">Architecture</h2>
            <p className="text-sm text-text-secondary mb-4 leading-relaxed">
              GoalConsensus processes every match through a five-stage pipeline: data ingestion, canonical state resolution, specialist analysis, AI debate, and consensus delivery.
            </p>
            <div className="bg-surface-3 rounded-lg p-4 font-mono text-2xs text-text-secondary overflow-x-auto leading-relaxed">
              <pre>{`┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│  Football    │───▶│  Canonical   │───▶│  5 Specialist   │
│  Data APIs   │    │  State       │    │  AI Agents      │
└─────────────┘    └──────────────┘    └────────┬────────┘
                                                │
                    ┌───────────────────────────┘
                    ▼
            ┌──────────────┐    ┌──────────────────────┐
            │  AI Debate   │───▶│  Consensus Output    │
            │  Engine      │    │  + Premium Reports   │
            └──────────────┘    │  + Prediction Market │
                                └──────────────────────┘`}</pre>
            </div>
          </section>

          {/* API Endpoints */}
          <section className="bg-surface-2 border border-border-subtle rounded-xl p-6">
            <h2 className="text-base font-semibold text-text-primary mb-3">API Endpoints</h2>
            <div className="space-y-2">
              {[
                { method: "GET", path: "/api/matches", desc: "All matches with intelligence status" },
                { method: "POST", path: "/api/intelligence", desc: "Full 5-agent specialist analysis" },
                { method: "POST", path: "/api/consensus", desc: "BFT agent consensus (legacy)" },
                { method: "POST", path: "/api/predict", desc: "Ensemble prediction (scheduled)" },
                { method: "GET", path: "/api/reports/catalog", desc: "Available premium reports" },
                { method: "POST", path: "/api/reports/generate", desc: "Generate premium report (x402)" },
                { method: "GET", path: "/api/market", desc: "Prediction market odds" },
                { method: "POST", path: "/api/market/stake", desc: "Place a stake (CCTP)" },
                { method: "POST", path: "/api/market/resolve", desc: "Resolve a market" },
              ].map((ep) => (
                <div key={ep.path} className="flex items-center gap-3 bg-surface-3 rounded-lg px-4 py-2.5">
                  <span className={cn(
                    "text-2xs font-mono font-medium px-2 py-0.5 rounded shrink-0",
                    ep.method === "GET" ? "bg-accent-green-dim text-accent-green" : "bg-accent-blue-dim text-accent-blue"
                  )}>
                    {ep.method}
                  </span>
                  <span className="text-xs font-mono text-text-primary shrink-0">{ep.path}</span>
                  <span className="text-2xs text-text-muted ml-auto">{ep.desc}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Injective Integrations */}
          <section className="bg-surface-2 border border-border-subtle rounded-xl p-6">
            <h2 className="text-base font-semibold text-text-primary mb-3">Injective Integrations</h2>
            <div className="space-y-3">
              {[
                {
                  name: "MCP Server",
                  desc: "Model Context Protocol — the standard for AI agent tool access. 15 tools with full reasoning and evidence.",
                  tech: "@modelcontextprotocol/sdk",
                  color: "accent-blue",
                },
                {
                  name: "x402 Payments",
                  desc: "HTTP 402 micropayments. Premium intelligence reports gated at 0.002-0.01 USDC per query.",
                  tech: "HTTP 402 Payment Required",
                  color: "accent-yellow",
                },
                {
                  name: "CCTP Bridge",
                  desc: "Cross-chain USDC transfers via Axelar for prediction market deposits and settlement.",
                  tech: "Circle CCTP on Axelar",
                  color: "accent-purple",
                },
                {
                  name: "Agent Skills",
                  desc: "Five specialist agents exposed as structured MCP tools with reasoning, evidence, and provider health.",
                  tech: "Tactical, Statistical, Market, Injury, News",
                  color: "accent-green",
                },
              ].map((item) => (
                <div key={item.name} className="bg-surface-3 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn("w-1.5 h-1.5 rounded-full", `bg-${item.color}`)} />
                    <span className="text-sm font-medium text-text-primary">{item.name}</span>
                  </div>
                  <div className="text-xs text-text-secondary mt-1 leading-relaxed">{item.desc}</div>
                  <div className="text-2xs text-text-muted mt-2 font-mono">{item.tech}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
