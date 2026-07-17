"use client";

import { useState, useEffect } from "react";
import { LiveDashboard } from "@/components/LiveDashboard";
import {
  Shield,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function Home() {
  const [paymentCount, setPaymentCount] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("x402-payment-count");
    if (stored) setPaymentCount(parseInt(stored, 10));

    const interval = setInterval(() => {
      const c = localStorage.getItem("x402-payment-count");
      if (c) setPaymentCount(parseInt(c, 10));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Shield size={18} className="text-green-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                GoalConsensus
              </h1>
              <p className="text-[11px] text-gray-500">
                World Cup 2026 Settlement Verification
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <CreditCard size={11} />
              <span>{paymentCount} queries</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-6">
        {/* Hero */}
        <div className="mb-6">
          <p className="text-sm text-gray-300 leading-relaxed max-w-2xl">
            Every World Cup match result is verified by{" "}
            <span className="text-white font-medium">
              two independent data sources
            </span>{" "}
            and{" "}
            <span className="text-white font-medium">
              three analysis agents
            </span>{" "}
            before being approved for settlement. No single source can
            fake a result.
          </p>
        </div>

        <LiveDashboard />

        {/* How It Works */}
        <div className="mt-8 border-t border-white/5 pt-6">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            <HelpCircle size={12} />
            How does settlement verification work?
            {showHelp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showHelp && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#111] border border-white/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-500/20 rounded flex items-center justify-center">
                    <span className="text-[10px] text-blue-400 font-bold">1</span>
                  </div>
                  <span className="text-xs text-white font-medium">
                    Two Data Sources
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  We pull match data from football-data.org and
                  thesportsdb.com independently. Both must agree
                  on the score before we proceed.
                </p>
              </div>

              <div className="bg-[#111] border border-white/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-purple-500/20 rounded flex items-center justify-center">
                    <span className="text-[10px] text-purple-400 font-bold">2</span>
                  </div>
                  <span className="text-xs text-white font-medium">
                    Three Analysts
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  A stats model, an AI reasoner, and a rule checker
                  each independently verify the result. They
                  don&apos;t talk to each other.
                </p>
              </div>

              <div className="bg-[#111] border border-white/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-green-500/20 rounded flex items-center justify-center">
                    <CheckCircle2 size={12} className="text-green-400" />
                  </div>
                  <span className="text-xs text-white font-medium">
                    Safe Settlement
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  If at least 2 of 3 analysts agree, the result
                  is approved for on-chain settlement via
                  Injective&apos;s x402 micropayments.
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-4 text-[10px] text-gray-600">
            <a
              href="https://zenodo.org/records/20577665"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-400 transition-colors flex items-center gap-1"
            >
              <ExternalLink size={9} />
              Research paper
            </a>
            <span>MCP Server v2.0</span>
            <span>Injective Testnet</span>
          </div>
        </div>
      </div>
    </div>
  );
}
