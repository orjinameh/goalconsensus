"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Brain,
  ArrowLeft,
  Target,
  BarChart3,
  TrendingUp,
  HeartPulse,
  Newspaper,
  Shield,
  Lock,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SpecialistCard } from "./SpecialistCard";
import DebateFeed from "./DebateFeed";
import { PremiumReportCard } from "./PremiumReportCard";
import { PredictionMarketPanel } from "./PredictionMarketPanel";
import { ConfidenceGauge } from "./ConfidenceGauge";

interface IntelligencePanelProps {
  homeTeam: string;
  awayTeam: string;
  onBack: () => void;
}

interface SpecialistOutput {
  agentId: string;
  agentName: string;
  confidence: number;
  prediction: { winner: string; homeScore: number | null; awayScore: number | null };
  latencyMs: number;
  explanation: string;
  evidence: { source: string; detail: string; weight: number }[];
}

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

interface AIConsensus {
  winner: string;
  confidence: number;
  agreement: number;
  totalAgents: number;
  messages: DebateMessage[];
  minorityOpinion: { agent: string; position: string } | null;
}

interface ReportMeta {
  type: string;
  title: string;
  description: string;
  price: string;
  priceUSDC: number;
  icon: string;
}

export function IntelligencePanel({ homeTeam, awayTeam, onBack }: IntelligencePanelProps) {
  const [phase, setPhase] = useState<"loading" | "agents" | "debate" | "consensus" | "ready">("loading");
  const [visibleAgents, setVisibleAgents] = useState(0);
  const [specialists, setSpecialists] = useState<SpecialistOutput[]>([]);
  const [debate, setDebate] = useState<AIConsensus | null>(null);
  const [reportCatalog, setReportCatalog] = useState<ReportMeta[]>([]);
  const [purchasedReports, setPurchasedReports] = useState<Set<string>>(new Set());
  const [reportContents, setReportContents] = useState<Record<string, string>>({});
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [showMarket, setShowMarket] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIntelligence = useCallback(async () => {
    try {
      setPhase("loading");
      const res = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeTeam, awayTeam }),
      });

      if (!res.ok) throw new Error("Failed to load intelligence");
      const data = await res.json();

      setSpecialists(data.specialistOutputs || []);
      setDebate(data.debate?.consensus || null);

      setPhase("agents");
      for (let i = 0; i < (data.specialistOutputs || []).length; i++) {
        await new Promise((r) => setTimeout(r, 400));
        setVisibleAgents(i + 1);
      }

      setPhase("debate");
      await new Promise((r) => setTimeout(r, 800));
      setPhase("consensus");
      await new Promise((r) => setTimeout(r, 500));
      setPhase("ready");
    } catch {
      setError("Failed to load intelligence. Please try again.");
    }
  }, [homeTeam, awayTeam]);

  const loadReportCatalog = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/catalog");
      if (res.ok) {
        const data = await res.json();
        setReportCatalog(data.reports || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadIntelligence();
    loadReportCatalog();
  }, [loadIntelligence, loadReportCatalog]);

  const handlePurchaseReport = async (type: string) => {
    setLoadingReport(type);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeTeam, awayTeam, reportType: type }),
      });
      if (res.ok) {
        const data = await res.json();
        setReportContents((prev) => ({ ...prev, [type]: data.content }));
        setPurchasedReports((prev) => new Set([...prev, type]));
      }
    } catch {}
    setLoadingReport(null);
  };

  const consensusWinner = debate?.winner || specialists[0]?.prediction.winner || homeTeam;
  const consensusConfidence = debate?.confidence || 0;
  const consensusAgreement = debate?.agreement || 0;
  const consensusTotal = debate?.totalAgents || specialists.length;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border-subtle px-5 py-3 sticky top-0 z-50 bg-surface-1/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-surface-3 rounded-lg transition-colors">
              <ArrowLeft size={16} className="text-text-muted" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-text-primary">
                {homeTeam} vs {awayTeam}
              </h1>
              <p className="text-2xs text-text-muted">
                {phase === "loading" && "Initializing AI agents..."}
                {phase === "agents" && `Running specialist agents (${visibleAgents}/${specialists.length})...`}
                {phase === "debate" && "AI agents debating..."}
                {phase === "consensus" && "Building consensus..."}
                {phase === "ready" && "Intelligence ready"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {phase === "ready" && (
              <span className="flex items-center gap-1.5 text-2xs text-accent-green">
                <span className="status-dot status-dot-green" />
                Complete
              </span>
            )}
            {(phase === "loading" || phase === "agents" || phase === "debate" || phase === "consensus") && (
              <Loader2 size={14} className="text-accent-blue animate-spin" />
            )}
          </div>
        </div>
      </header>

      <main className="px-5 py-6 max-w-6xl mx-auto">
        {error && (
          <div className="bg-accent-red-dim border border-accent-red/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-accent-red">{error}</p>
            <button onClick={loadIntelligence} className="btn-secondary text-xs mt-2">
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {phase !== "loading" && specialists.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Brain size={16} className="text-accent-blue" />
                  <h2 className="text-sm font-semibold text-text-primary">Specialist Agents</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {specialists.slice(0, visibleAgents).map((agent, i) => (
                    <SpecialistCard
                      key={agent.agentId}
                      agent={agent}
                      index={i}
                      isAnimating={phase === "agents" && i === visibleAgents - 1}
                    />
                  ))}
                </div>
              </div>
            )}

            {phase === "loading" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-surface-2 border border-border-subtle rounded-xl p-4 h-40 shimmer-bg" />
                ))}
              </div>
            )}

            {(phase === "debate" || phase === "consensus" || phase === "ready") && debate && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Brain size={16} className="text-accent-purple" />
                  <h2 className="text-sm font-semibold text-text-primary">Live AI Debate</h2>
                </div>
                <DebateFeed
                  messages={debate.messages}
                  isVisible={phase === "debate" || phase === "consensus" || phase === "ready"}
                />
              </div>
            )}
          </div>

          <div className="space-y-6">
            {phase === "ready" && (
              <>
                <div className="bg-surface-2 border border-border-subtle rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield size={14} className="text-accent-green" />
                    <span className="text-sm font-semibold text-text-primary">AI Consensus</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <ConfidenceGauge value={consensusConfidence} size={120} />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">Predicted Winner</span>
                      <span className="text-text-primary font-medium">{consensusWinner}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">Agreement</span>
                      <span className="text-text-primary font-medium">{consensusAgreement}/{consensusTotal}</span>
                    </div>
                    {debate?.minorityOpinion && (
                      <div className="mt-3 bg-accent-yellow-dim border border-accent-yellow/20 rounded-lg p-3">
                        <span className="text-2xs font-medium text-accent-yellow">Minority Opinion</span>
                        <p className="text-2xs text-text-secondary mt-1">{debate.minorityOpinion.agent}</p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setShowMarket(!showMarket)}
                  className="w-full flex items-center justify-between bg-surface-2 border border-border-subtle rounded-xl p-4 hover:border-border transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-accent-blue" />
                    <span className="text-sm font-medium text-text-primary">Prediction Market</span>
                  </div>
                  {showMarket ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
                </button>

                {showMarket && (
                  <PredictionMarketPanel
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                    odds={{ home: 2.1, draw: 3.4, away: 3.8 }}
                    totalStaked={1250}
                    onStake={(side, amount) => {
                      console.log(`Staking ${amount} on ${side}`);
                    }}
                  />
                )}
              </>
            )}

            {phase === "ready" && reportCatalog.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lock size={14} className="text-accent-yellow" />
                  <span className="text-sm font-semibold text-text-primary">Premium Reports</span>
                </div>
                <div className="space-y-3">
                  {reportCatalog.map((report) => (
                    <PremiumReportCard
                      key={report.type}
                      type={report.type}
                      title={report.title}
                      description={report.description}
                      price={report.price}
                      priceUSDC={report.priceUSDC}
                      icon={report.icon}
                      onPurchase={handlePurchaseReport}
                      isPurchased={purchasedReports.has(report.type)}
                      isLoading={loadingReport === report.type}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {phase === "ready" && Object.keys(reportContents).length > 0 && (
          <div className="mt-8 space-y-6">
            <h2 className="text-base font-semibold text-text-primary">Unlocked Reports</h2>
            {Object.entries(reportContents).map(([type, content]) => (
              <div key={type} className="bg-surface-2 border border-border-subtle rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target size={14} className="text-accent-green" />
                  <span className="text-sm font-semibold text-text-primary capitalize">
                    {type.replace(/-/g, " ")}
                  </span>
                </div>
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="text-xs text-text-secondary whitespace-pre-wrap font-sans leading-relaxed">
                    {content}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
