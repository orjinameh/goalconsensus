"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Shield,
  Brain,
  Globe,
  Zap,
  GitBranch,
  Lock,
  Search,
  ArrowRight,
  Target,
  BarChart3,
  TrendingUp,
  HeartPulse,
  Newspaper,
  Code2,
  ChevronRight,
} from "lucide-react";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { MatchCard } from "@/components/MatchCard";
import { MatchCardSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { IntelligencePanel } from "@/components/IntelligencePanel";
import { ProviderStatus } from "@/components/ProviderStatus";
import { cn } from "@/lib/utils";
import type { MatchWithConsensus } from "@/lib/api";

const SPECIALIST_AGENTS = [
  { id: "tactical", name: "Tactical Analyst", icon: Target, color: "text-accent-blue" },
  { id: "statistical", name: "Statistical Analyst", icon: BarChart3, color: "text-accent-green" },
  { id: "market", name: "Market Analyst", icon: TrendingUp, color: "text-accent-yellow" },
  { id: "injury", name: "Injury Analyst", icon: HeartPulse, color: "text-accent-red" },
  { id: "news", name: "News Analyst", icon: Newspaper, color: "text-accent-purple" },
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
      const controller = new AbortController();
      timerRef.current = setTimeout(() => controller.abort(), 30000);
      const res = await fetch("/api/matches", { signal: controller.signal });
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setMatches(data.matches || []);
      setProviderHealth(data.providerHealth || []);
      setError(null);
    } catch (e) {
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
            The World Cup Intelligence Terminal
          </p>
          <p className="text-sm text-text-tertiary max-w-xl mx-auto leading-relaxed mb-10">
            AI-powered intelligence for fans, developers and autonomous agents.
            Five specialist AI agents analyze every match in real-time.
          </p>

          <div className="max-w-xl mx-auto">
            <SearchBar
              matches={matches}
              onSelect={handleSelectMatch}
              placeholder="Search teams or fixtures — Spain vs Argentina..."
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
                onClick={() => handleSelectMatch(ex.home, ex.away)}
                className="text-2xs text-text-tertiary hover:text-text-secondary px-2.5 py-1 bg-surface-3 border border-border-subtle rounded-md hover:border-border transition-colors"
              >
                {ex.home} vs {ex.away}
              </button>
            ))}
          </div>
        </section>

        <section className="max-w-3xl mx-auto pb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-4 text-2xs text-text-muted overflow-x-auto no-scrollbar py-2">
            {[
              { icon: <Globe size={10} />, label: "All Competitions" },
              { icon: <Zap size={10} />, label: "Multi-Provider" },
              { icon: <GitBranch size={10} />, label: "Canonical State" },
              { icon: <Brain size={10} />, label: "5 AI Specialists" },
              { icon: <Lock size={10} />, label: "Ensemble Consensus" },
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

        <section className="max-w-4xl mx-auto pb-8">
          <div className="text-center mb-6">
            <h2 className="text-sm font-semibold text-text-primary mb-1">How It Works</h2>
            <p className="text-2xs text-text-muted">Five specialist agents analyze every match simultaneously</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {SPECIALIST_AGENTS.map((agent) => {
              const Icon = agent.icon;
              return (
                <div key={agent.id} className="bg-surface-2 border border-border-subtle rounded-xl p-4 text-center">
                  <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center mx-auto mb-2">
                    <Icon size={18} className={agent.color} />
                  </div>
                  <div className="text-2xs font-medium text-text-primary">{agent.name}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="max-w-4xl mx-auto pb-16">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                Live Matches
              </h2>
              <p className="text-2xs text-text-muted mt-0.5">
                Football matches across all competitions with AI intelligence
              </p>
            </div>
            {providerHealth.length > 0 && (
              <div className="flex items-center gap-1.5 text-2xs text-text-muted">
                <span className="status-dot status-dot-green" />
                <span>
                  {providerHealth.filter((p) => p.available).length}/
                  {providerHealth.length} providers online
                </span>
              </div>
            )}
          </div>

          {loading && (
            <div>
              {loadingSlow && (
                <div className="text-center mb-4">
                  <p className="text-xs text-text-muted">
                    Server may be waking up — this can take up to 30 seconds on first load.
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

          {!loading && !error && matches.length === 0 && (
            <EmptyState
              title="No matches available"
              description="Matches will appear here when data sources have active fixtures."
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
        </section>

        <section className="max-w-3xl mx-auto pb-16">
          <div className="bg-surface-2 border border-border-subtle rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent-blue-dim flex items-center justify-center">
                <Code2 size={18} className="text-accent-blue" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">For Developers</h3>
                <p className="text-2xs text-text-muted">Build on GoalConsensus with MCP, x402, and Agent Skills</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "MCP Server", desc: "15 tools for autonomous agents", icon: Globe },
                { label: "x402 Payments", desc: "Per-query micropayments", icon: Lock },
                { label: "Agent Skills", desc: "5 specialist AI agents", icon: Brain },
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
              className="btn-secondary text-xs mt-4 flex items-center gap-1.5"
            >
              Explore Developer Tools <ChevronRight size={12} />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-subtle px-5 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-2xs text-text-muted">
          <span>GoalConsensus v4.0 — World Cup Intelligence Terminal</span>
          <span>Built for Injective Global Cup</span>
        </div>
      </footer>
    </div>
  );
}

function DevelopersPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen">
      <Header activeView="developers" onNavigate={onBack} />
      <main className="px-5 py-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-2 hover:bg-surface-3 rounded-lg transition-colors">
            <ArrowRight size={16} className="text-text-muted rotate-180" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Developer Platform</h1>
            <p className="text-xs text-text-muted">Build on GoalConsensus</p>
          </div>
        </div>

        <div className="space-y-6">
          <section className="bg-surface-2 border border-border-subtle rounded-xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Globe size={14} className="text-accent-blue" />
              MCP Server
            </h2>
            <p className="text-xs text-text-secondary mb-4">
              GoalConsensus exposes 15 MCP tools for autonomous agents to consume football intelligence.
            </p>
            <div className="bg-surface-3 rounded-lg p-4 font-mono text-2xs text-text-secondary overflow-x-auto">
              <pre>{`{
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
}`}</pre>
            </div>
          </section>

          <section className="bg-surface-2 border border-border-subtle rounded-xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Brain size={14} className="text-accent-purple" />
              Agent Skills
            </h2>
            <p className="text-xs text-text-secondary mb-4">
              Five specialist AI agents available as MCP tools.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SPECIALIST_AGENTS.map((agent) => {
                const Icon = agent.icon;
                return (
                  <div key={agent.id} className="flex items-center gap-3 bg-surface-3 rounded-lg p-3">
                    <Icon size={14} className={agent.color} />
                    <div>
                      <div className="text-xs font-medium text-text-primary">{agent.name}</div>
                      <div className="text-2xs text-text-muted">{agent.id}_analysis</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-surface-2 border border-border-subtle rounded-xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Lock size={14} className="text-accent-yellow" />
              x402 Micropayments
            </h2>
            <p className="text-xs text-text-secondary mb-4">
              Per-query payments via x402 protocol on Injective.
            </p>
            <div className="bg-surface-3 rounded-lg p-4 font-mono text-2xs text-text-secondary overflow-x-auto">
              <pre>{`curl -H "X-PAYMENT: x402/..." \\
  http://localhost:3000/api/intelligence \\
  -d '{"homeTeam":"Spain","awayTeam":"Argentina"}'`}</pre>
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
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-2 hover:bg-surface-3 rounded-lg transition-colors">
            <ArrowRight size={16} className="text-text-muted rotate-180" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Documentation</h1>
            <p className="text-xs text-text-muted">Architecture, APIs, and integration guides</p>
          </div>
        </div>

        <div className="space-y-6">
          <section className="bg-surface-2 border border-border-subtle rounded-xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Architecture</h2>
            <div className="bg-surface-3 rounded-lg p-4 font-mono text-2xs text-text-secondary overflow-x-auto">
              <pre>{`Match Data → Canonical State → 5 Specialist Agents → AI Debate → Consensus
                                                        ↓
                                          Premium Reports (x402)
                                          Prediction Market (CCTP)
                                          MCP Tools (15 endpoints)`}</pre>
            </div>
          </section>

          <section className="bg-surface-2 border border-border-subtle rounded-xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-3">API Endpoints</h2>
            <div className="space-y-2">
              {[
                { method: "GET", path: "/api/matches", desc: "All matches with intelligence" },
                { method: "POST", path: "/api/intelligence", desc: "Full specialist analysis" },
                { method: "POST", path: "/api/consensus", desc: "AI ensemble consensus" },
                { method: "POST", path: "/api/predict", desc: "Match prediction" },
                { method: "GET", path: "/api/reports/catalog", desc: "Premium report catalog" },
                { method: "POST", path: "/api/reports/generate", desc: "Generate premium report" },
                { method: "GET", path: "/api/market", desc: "Prediction market odds" },
                { method: "POST", path: "/api/market/stake", desc: "Place a stake" },
                { method: "POST", path: "/api/market/resolve", desc: "Resolve market" },
              ].map((ep) => (
                <div key={ep.path} className="flex items-center gap-3 bg-surface-3 rounded-lg px-4 py-2">
                  <span className={cn(
                    "text-2xs font-mono font-medium px-2 py-0.5 rounded",
                    ep.method === "GET" ? "bg-accent-green-dim text-accent-green" : "bg-accent-blue-dim text-accent-blue"
                  )}>
                    {ep.method}
                  </span>
                  <span className="text-xs font-mono text-text-primary">{ep.path}</span>
                  <span className="text-2xs text-text-muted ml-auto">{ep.desc}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-surface-2 border border-border-subtle rounded-xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-3">MCP Tools (15)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                "analyze_match", "compare_teams", "historical_analysis",
                "market_analysis", "consensus", "player_report",
                "injury_report", "premium_report", "predict_match",
                "verify_result", "verify_settlement", "get_provider_consensus",
                "get_live_matches", "get_report_catalog", "qualification_scenarios",
              ].map((tool) => (
                <div key={tool} className="text-xs font-mono text-text-secondary bg-surface-3 rounded-lg px-3 py-2">
                  {tool}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-surface-2 border border-border-subtle rounded-xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Injective Integrations</h2>
            <div className="space-y-3">
              {[
                { name: "MCP Server", desc: "Model Context Protocol for autonomous agent access", tech: "@modelcontextprotocol/sdk" },
                { name: "x402", desc: "Per-query micropayments (0.001-0.01 USDC)", tech: "HTTP 402 Payment Required" },
                { name: "CCTP", desc: "Cross-chain USDC transfers for prediction market deposits", tech: "Circle CCTP" },
                { name: "Agent Skills", desc: "5 specialist AI agents exposed via MCP", tech: "Tactical, Statistical, Market, Injury, News" },
              ].map((item) => (
                <div key={item.name} className="bg-surface-3 rounded-lg p-3">
                  <div className="text-xs font-medium text-text-primary">{item.name}</div>
                  <div className="text-2xs text-text-secondary mt-0.5">{item.desc}</div>
                  <div className="text-2xs text-text-muted mt-1 font-mono">{item.tech}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
