"use client";

import { useState, useEffect } from "react";
import { LiveDashboard } from "@/components/LiveDashboard";
import { Shield, Cpu, CreditCard, ExternalLink, Brain, BarChart3, Scale } from "lucide-react";

export default function Home() {
  const [paymentCount, setPaymentCount] = useState(0);

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
      <header className="border-b border-white/10 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-green-500" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                GoalConsensus
              </h1>
              <p className="text-xs text-gray-500">
                Multi-Agent Settlement Verification
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Auto-refresh 30s
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-6 py-6 gap-6">
        <main className="flex-1">
          <p className="text-sm text-gray-400 mb-6">
            Canonical match state from 2 independent providers, verified by 3 analysis agents
            with Byzantine-inspired consensus. No simulated data.
          </p>
          <LiveDashboard />
        </main>

        <aside className="w-72 shrink-0">
          <div className="bg-[#111] border border-white/10 rounded-lg p-4 space-y-4">
            <h2 className="text-sm font-medium text-white">System Architecture</h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Cpu size={14} className="text-green-500" />
                <div>
                  <div className="text-xs text-gray-400">MCP Server</div>
                  <div className="text-xs text-white font-mono">
                    goalconsensus-mcp v2.0.0
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CreditCard size={14} className="text-green-500" />
                <div>
                  <div className="text-xs text-gray-400">
                    x402 Payments (this session)
                  </div>
                  <div className="text-xs text-white font-mono">
                    {paymentCount} queries x 0.001 USDC
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3">
                <div className="text-xs text-gray-400 mb-2">Data Providers</div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <div>1. football-data.org</div>
                  <div>2. thesportsdb.com</div>
                </div>
                <p className="text-[10px] text-gray-600 mt-1">
                  Establish canonical match state. 2+ providers required.
                </p>
              </div>

              <div className="border-t border-white/5 pt-3">
                <div className="text-xs text-gray-400 mb-2">
                  Verification Agents
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={10} className="text-blue-400" />
                    <span>Statistical (Poisson model)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Brain size={10} className="text-purple-400" />
                    <span>LLM Reasoning (Groq)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Scale size={10} className="text-orange-400" />
                    <span>Deterministic Rules</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3">
                <div className="text-xs text-gray-400 mb-2">
                  BFT Consensus
                </div>
                <div className="text-xs font-mono text-gray-500 space-y-0.5">
                  <div>n = 3 (verification agents)</div>
                  <div>threshold = ceil(2n/3) = 2</div>
                  <div>majority vote determines settlement</div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3">
                <a
                  href="https://zenodo.org/records/20577665"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink size={10} />
                  Research paper
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
