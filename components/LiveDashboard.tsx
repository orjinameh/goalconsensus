"use client";

import { useEffect, useRef, useState } from "react";
import { ProviderHealth } from "@/lib/providers";
import { MatchCard } from "./MatchCard";
import { MatchCardSkeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { cn } from "@/lib/utils";

interface EnrichedMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "SCHEDULED" | "LIVE" | "FINISHED";
  matchDate: string;
  sport: "FOOTBALL";
  providerId: string;
  consensus: {
    finalPrediction: { winner: string; homeScore: number | null; awayScore: number | null };
    agreement: number;
    totalAgents: number;
    confidence: number;
    settlementDecision: string;
  };
  llmPending: boolean;
}

interface LiveDashboardProps {
  onSelectMatch?: (homeTeam: string, awayTeam: string, status?: string) => void;
}

export function LiveDashboard({ onSelectMatch }: LiveDashboardProps) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <MatchCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Could not load matches"
        description={error}
        icon="search"
        action={{
          label: "Retry",
          onClick: () => {
            setLoading(true);
            fetchMatches();
          },
        }}
      />
    );
  }

  if (matches.length === 0) {
    return (
      <EmptyState
        title="No matches available"
        description="Matches will appear here when data sources have active fixtures."
        icon="shield"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {matches.map((m) => (
        <MatchCard
          key={m.id}
          match={m as never}
            onClick={() => onSelectMatch?.(m.homeTeam, m.awayTeam, m.status)}
        />
      ))}
    </div>
  );
}
