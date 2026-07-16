"use client";

import { useState } from "react";
import { MatchResult } from "@/lib/providers";
import { ConsensusVerdict } from "@/lib/consensus";
import { X402Receipt } from "@/lib/x402";
import { ConsensusIndicator } from "./ConsensusIndicator";
import { Zap, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  match: MatchResult & { consensus: ConsensusVerdict };
}

const verdictColors: Record<string, string> = {
  CONFIRMED: "bg-green-500/20 text-green-400 border-green-500/30",
  DISPUTED: "bg-red-500/20 text-red-400 border-red-500/30",
  PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  INSUFFICIENT_DATA: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export function MatchCard({ match }: Props) {
  const [prediction, setPrediction] = useState<{
    predictedWinner: string;
    winProbability: number;
    keyFactors: string[];
    predictedScore: string;
    confidence: string;
  } | null>(null);
  const [payment, setPayment] = useState<X402Receipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
        }),
      });
      const data = await res.json();
      setPrediction(data.prediction);
      setPayment(data.payment);
      const current = parseInt(
        localStorage.getItem("x402-payment-count") || "0",
        10
      );
      localStorage.setItem("x402-payment-count", String(current + 1));
    } catch {
      setPrediction(null);
    }
    setLoading(false);
  };

  const v = match.consensus;

  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded border ${verdictColors[v.verdict] || verdictColors.PENDING}`}
        >
          {v.verdict}
        </span>
        {match.status === "LIVE" && (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            LIVE
          </span>
        )}
        {match.status === "FINISHED" && (
          <span className="text-xs text-gray-500">FT</span>
        )}
        {match.status === "SCHEDULED" && (
          <span className="text-xs text-gray-500">
            {new Date(match.matchDate).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 text-right">
          <span className="text-white font-medium">{match.homeTeam}</span>
        </div>
        <div className="mx-4 font-mono text-xl text-white min-w-[80px] text-center">
          {match.homeScore !== null && match.awayScore !== null
            ? `${match.homeScore} - ${match.awayScore}`
            : "vs"}
        </div>
        <div className="flex-1 text-left">
          <span className="text-white font-medium">{match.awayTeam}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Confidence</span>
            <span>{v.confidence}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                v.confidence >= 66
                  ? "bg-green-500"
                  : v.confidence >= 33
                    ? "bg-yellow-500"
                    : "bg-gray-500"
              }`}
              style={{ width: `${v.confidence}%` }}
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors mb-2"
      >
        <span>Provider details</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="mb-3">
          <ConsensusIndicator verdict={v} />
          <p className="text-xs text-gray-400 mt-2">{v.explanation}</p>
        </div>
      )}

      <button
        onClick={handlePredict}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm py-2 rounded transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Zap size={14} />
        )}
        {loading ? "Predicting..." : "AI Predict"}
      </button>

      {prediction && (
        <div className="mt-3 p-3 bg-white/5 rounded border border-white/5">
          <div className="text-xs text-gray-400 mb-1">Groq AI Prediction</div>
          <div className="text-sm text-white">
            <span className="font-medium">{prediction.predictedWinner}</span>{" "}
            wins ({prediction.winProbability}%)
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Score: {prediction.predictedScore} | Confidence:{" "}
            {prediction.confidence}
          </div>
          <div className="mt-2 space-y-0.5">
            {prediction.keyFactors.map((f, i) => (
              <div key={i} className="text-xs text-gray-500">
                - {f}
              </div>
            ))}
          </div>
          {payment && (
            <div className="mt-2 text-xs text-gray-600 font-mono">
              x402: {payment.amount} | {payment.txHash.slice(0, 10)}...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
