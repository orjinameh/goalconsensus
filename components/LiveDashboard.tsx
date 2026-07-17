"use client";

import { useEffect, useRef, useState } from "react";
import { MatchResult, ProviderHealth } from "@/lib/providers";
import { ConsensusResult } from "@/lib/consensus";
import { MatchCard } from "./MatchCard";
import { Loader2, Wifi, WifiOff } from "lucide-react";

interface EnrichedMatch extends MatchResult {
  consensus: ConsensusResult;
  llmPending: boolean;
}

export function LiveDashboard() {
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMatches = async () => {
    try {
      const res = await fetch("/api/matches");
      const data = await res.json();
      setMatches(data.matches || []);
      setProviderHealth(data.providerHealth || []);
      setError(null);

      const anyPending = (data.matches || []).some(
        (m: EnrichedMatch) => m.llmPending
      );
      scheduleNext(anyPending ? 3000 : 30000);
    } catch {
      setError("Could not load matches. Retrying...");
      scheduleNext(10000);
    }
    setLoading(false);
  };

  function scheduleNext(ms: number) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fetchMatches, ms);
  }

  useEffect(() => {
    fetchMatches();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 size={20} className="text-green-500 animate-spin" />
        <div className="text-gray-500 text-sm">
          Loading World Cup 2026 matches...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <WifiOff size={20} className="text-red-400" />
        <div className="text-red-400 text-sm">{error}</div>
        <button
          onClick={() => {
            setLoading(true);
            fetchMatches();
          }}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  const onlineCount = providerHealth.filter((h) => h.available).length;
  const anyLlmPending = matches.some((m) => m.llmPending);

  return (
    <div>
      {/* Data Sources */}
      <div className="mb-5 flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Wifi size={12} className="text-green-400" />
          <span>
            {onlineCount} of {providerHealth.length} data sources online
          </span>
        </div>
        {anyLlmPending && (
          <div className="flex items-center gap-1.5 text-[10px] text-purple-400">
            <Loader2 size={10} className="animate-spin" />
            <span>AI analysis in progress</span>
          </div>
        )}
      </div>

      {/* Match Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matches.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>

      {matches.length === 0 && (
        <div className="text-center py-24">
          <div className="text-gray-500 text-sm mb-2">
            No World Cup 2026 matches found
          </div>
          <div className="text-gray-600 text-xs">
            Matches will appear here when data sources have results.
          </div>
        </div>
      )}
    </div>
  );
}
