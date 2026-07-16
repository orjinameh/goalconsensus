"use client";

import { useEffect, useState } from "react";
import { MatchResult } from "@/lib/sources";
import { ConsensusVerdict } from "@/lib/consensus";
import { MatchCard } from "./MatchCard";

type EnrichedMatch = MatchResult & { consensus: ConsensusVerdict };

export function LiveDashboard() {
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    try {
      const res = await fetch("/api/matches");
      const data = await res.json();
      setMatches(data.matches || []);
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
  );
}
