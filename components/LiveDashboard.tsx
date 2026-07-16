"use client";

import { useEffect, useState } from "react";
import { MatchResult, ProviderHealth } from "@/lib/providers";
import { ConsensusVerdict } from "@/lib/consensus";
import { MatchCard } from "./MatchCard";

type EnrichedMatch = MatchResult & { consensus: ConsensusVerdict };

export function LiveDashboard() {
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    try {
      const res = await fetch("/api/matches");
      const data = await res.json();
      setMatches(data.matches || []);
      setProviderHealth(data.providerHealth || []);
      setError(null);
    } catch {
      setError("Failed to fetch matches");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500 text-sm">Loading matches...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div>
      {providerHealth.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {providerHealth.map((h) => (
            <div
              key={h.providerId}
              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded border ${
                h.available
                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${h.available ? "bg-green-500" : "bg-red-500"}`}
              />
              <span className="font-mono">{h.providerId}</span>
              <span className="text-gray-500">
                {h.available ? `${h.latencyMs}ms` : "unavailable"}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matches.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
        {matches.length === 0 && (
          <div className="col-span-full text-center py-20 text-gray-500 text-sm">
            No matches found
          </div>
        )}
      </div>
    </div>
  );
}
