"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Brain,
  ArrowLeft,
  Shield,
  Lock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  AlertCircle,
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

const LOADING_MESSAGES = [
  "Connecting to football data sources...",
  "Building canonical match state...",
  "Activating tactical analyst...",
  "Running statistical models...",
  "Scanning market signals...",
  "Evaluating squad fitness...",
  "Analyzing recent developments...",
  "Agents are now debating...",
  "Building consensus across all agents...",
  "Finalizing intelligence report...",
];

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
  const [cctpTransfers, setCctpTransfers] = useState<{
    id: string;
    fromChain: string;
    toChain: string;
    amount: string;
    status: "pending" | "confirmed" | "failed";
    txHash: string;
    timestamp: string;
  }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadIntelligence = useCallback(async () => {
    try {
      setPhase("loading");
      setError(null);
      setLoadingStep(0);
      setLoadingMessage(LOADING_MESSAGES[0]);

      // Simulate progressive loading messages while fetch is in-flight
      const messageTimer = setInterval(() => {
        setLoadingStep((prev) => {
          const next = Math.min(prev + 1, LOADING_MESSAGES.length - 1);
          setLoadingMessage(LOADING_MESSAGES[next]);
          return next;
        });
      }, 1200);

      const res = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeTeam, awayTeam }),
      });

      clearInterval(messageTimer);

      if (!res.ok) throw new Error("Intelligence generation failed");
      const data = await res.json();

      setSpecialists(data.specialistOutputs || []);
      setDebate(data.debate?.consensus || null);

      // Progressive agent reveal
      setPhase("agents");
      const agentCount = (data.specialistOutputs || []).length;
      for (let i = 0; i < agentCount; i++) {
        await new Promise((r) => setTimeout(r, 350));
        setVisibleAgents(i + 1);
      }

      setPhase("debate");
      await new Promise((r) => setTimeout(r, 600));
      setPhase("consensus");
      await new Promise((r) => setTimeout(r, 400));
      setPhase("ready");
    } catch {
      setError("Intelligence generation failed. The data sources may be temporarily unavailable.");
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
      {/* Header */}
      <header className="border-b border-border-subtle px-5 py-3 sticky top-0 z-50 bg-surface-1/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-surface-3 rounded-lg transition-colors"
              aria-label="Back to terminal"
            >
              <ArrowLeft size={16} className="text-text-muted" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-text-primary">
                {homeTeam} vs {awayTeam}
              </h1>
              <p className="text-2xs text-text-muted">
                {phase === "loading" && loadingMessage}
                {phase === "agents" && `Analyzing ${visibleAgents} of ${specialists.length} agents...`}
                {phase === "debate" && "Agents are debating their positions..."}
                {phase === "consensus" && "Building final consensus..."}
                {phase === "ready" && "Intelligence complete"}
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
            {phase !== "ready" && (
              <div className="flex items-center gap-1.5 text-2xs text-text-muted">
                <Loader2 size={12} className="text-accent-blue animate-spin" />
                <span className="hidden sm:inline">{loadingMessage.split("...")[0]}...</span>
              </div>
            )}
          </div>
        </div>
        {/* Progress bar */}
        {phase === "loading" && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-surface-3">
            <div
              className="h-full bg-accent-blue/60 transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(95, (loadingStep / LOADING_MESSAGES.length) * 100)}%` }}
            />
          </div>
        )}
      </header>

      <main className="px-5 py-6 max-w-6xl mx-auto">
        {/* Error state */}
        {error && (
          <div className="bg-accent-red-dim border border-accent-red/20 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle size={16} className="text-accent-red mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-text-primary font-medium">Something went wrong</p>
                <p className="text-xs text-text-tertiary mt-1">{error}</p>
                <button
                  onClick={loadIntelligence}
                  className="btn-secondary text-xs mt-3 inline-flex items-center gap-1.5"
                >
                  <RefreshCw size={12} />
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — agents + debate */}
          <div className="lg:col-span-2 space-y-6">
            {/* Loading skeletons */}
            {phase === "loading" && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Brain size={16} className="text-accent-blue animate-pulse" />
                  <h2 className="text-sm font-semibold text-text-primary">Specialist Agents</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-surface-2 border border-border-subtle rounded-xl p-4 h-48 shimmer-bg"
                      style={{ animationDelay: `${i * 100}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Specialist agents */}
            {phase !== "loading" && specialists.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Brain size={16} className="text-accent-blue" />
                  <h2 className="text-sm font-semibold text-text-primary">Specialist Agents</h2>
                  {phase === "agents" && (
                    <span className="text-2xs text-accent-blue font-mono">
                      {visibleAgents}/{specialists.length}
                    </span>
                  )}
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

            {/* Debate feed */}
            {(phase === "debate" || phase === "consensus" || phase === "ready") && debate && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Brain size={16} className="text-accent-purple" />
                  <h2 className="text-sm font-semibold text-text-primary">Live AI Debate</h2>
                  {phase !== "ready" && (
                    <span className="flex items-center gap-1 text-2xs text-accent-purple">
                      <Loader2 size={10} className="animate-spin" />
                      In progress
                    </span>
                  )}
                </div>
                <DebateFeed
                  messages={debate.messages}
                  isVisible={phase === "debate" || phase === "consensus" || phase === "ready"}
                />
              </div>
            )}
          </div>

          {/* Right column — consensus, market, reports */}
          <div className="space-y-5">
            {/* AI Consensus */}
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
                  <div className="mt-4 space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">Predicted winner</span>
                      <span className="text-text-primary font-medium">{consensusWinner}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">Agent agreement</span>
                      <span className="text-text-primary font-medium">
                        {consensusAgreement} of {consensusTotal}
                      </span>
                    </div>
                  </div>

                  {/* Agent breakdown — who agrees, who dissents */}
                  {specialists.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border-subtle">
                      <div className="text-2xs text-text-muted uppercase tracking-wider font-medium mb-2.5">
                        Agent Positions
                      </div>
                      <div className="space-y-2">
                        {specialists.map((s) => {
                          const agreesWithConsensus = s.prediction.winner === consensusWinner;
                          return (
                            <div key={s.agentId} className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full shrink-0",
                                  agreesWithConsensus ? "bg-accent-green" : "bg-accent-red"
                                )}
                              />
                              <span className="text-2xs text-text-secondary flex-1 truncate">
                                {s.agentName}
                              </span>
                              <span className={cn(
                                "text-2xs font-medium shrink-0",
                                agreesWithConsensus ? "text-accent-green" : "text-accent-red"
                              )}>
                                {s.prediction.winner}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Minority opinion */}
                  {debate?.minorityOpinion && (
                    <div className="mt-4 bg-accent-yellow-dim border border-accent-yellow/20 rounded-lg p-3">
                      <span className="text-2xs font-medium text-accent-yellow">Dissenting view</span>
                      <p className="text-2xs text-text-secondary mt-1 leading-relaxed">
                        {debate.minorityOpinion.agent}: {debate.minorityOpinion.position}
                      </p>
                    </div>
                  )}
                </div>

                {/* Prediction Market */}
                <button
                  onClick={() => setShowMarket(!showMarket)}
                  className="w-full flex items-center justify-between bg-surface-2 border border-border-subtle rounded-xl p-4 hover:border-border transition-colors"
                  aria-expanded={showMarket}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-accent-blue" />
                    <span className="text-sm font-medium text-text-primary">Prediction Market</span>
                  </div>
                  {showMarket ? (
                    <ChevronUp size={14} className="text-text-muted" />
                  ) : (
                    <ChevronDown size={14} className="text-text-muted" />
                  )}
                </button>

                {showMarket && (
                  <PredictionMarketPanel
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                    odds={{ home: 2.1, draw: 3.4, away: 3.8 }}
                    totalStaked={1250}
                    onStake={async (side, amount) => {
                      try {
                        const res = await fetch("/api/market/stake", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ homeTeam, awayTeam, side, amount }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          if (data.cctpTransfer) {
                            setCctpTransfers((prev) => [...prev, data.cctpTransfer]);
                          }
                        }
                      } catch {}
                    }}
                    cctpTransfers={cctpTransfers}
                  />
                )}

                {/* Premium Reports */}
                {reportCatalog.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Lock size={14} className="text-accent-yellow" />
                      <span className="text-sm font-semibold text-text-primary">Premium Intelligence</span>
                    </div>
                    <p className="text-2xs text-text-muted mb-3">
                      Deep-dive reports powered by x402 micropayments
                    </p>
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
              </>
            )}
          </div>
        </div>

        {/* Unlocked reports */}
        {phase === "ready" && Object.keys(reportContents).length > 0 && (
          <div className="mt-10 space-y-6">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-accent-green" />
              <h2 className="text-base font-semibold text-text-primary">Unlocked Reports</h2>
            </div>
            {Object.entries(reportContents).map(([type, content]) => (
              <div key={type} className="bg-surface-2 border border-accent-green/20 rounded-xl p-6">
                <div className="text-sm font-semibold text-text-primary mb-1 capitalize">
                  {type.replace(/-/g, " ")}
                </div>
                <div className="text-xs text-text-secondary whitespace-pre-wrap font-sans leading-relaxed">
                  {content}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
