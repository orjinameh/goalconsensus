export type ConsensusVerdict = {
  verdict: "CONFIRMED" | "DISPUTED" | "PENDING" | "INSUFFICIENT_DATA";
  confidence: number;
  agreedResult: {
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null;
    awayScore: number | null;
  } | null;
  conflictingSources: string[];
  passingNodes: number;
  totalNodes: number;
  explanation: string;
};

import { MatchResult } from "./sources";

function resultKey(m: MatchResult): string {
  return `${m.homeScore ?? "x"}-${m.awayScore ?? "x"}`;
}

function hasSimulatedSource(results: MatchResult[]): boolean {
  return results.some((r) => r.source === "simulated");
}

export function computeConsensus(results: MatchResult[]): ConsensusVerdict {
  const totalNodes = 3;
  const threshold = Math.ceil((2 * totalNodes) / 3);

  if (results.length === 0) {
    return {
      verdict: "INSUFFICIENT_DATA",
      confidence: 0,
      agreedResult: null,
      conflictingSources: [],
      passingNodes: 0,
      totalNodes,
      explanation: "No data sources returned results.",
    };
  }

  const nonSimulated = results.filter((r) => r.source !== "simulated");

  if (nonSimulated.length === 0) {
    return {
      verdict: "INSUFFICIENT_DATA",
      confidence: 0,
      agreedResult: null,
      conflictingSources: results.map((r) => r.source),
      passingNodes: 0,
      totalNodes,
      explanation:
        "All sources are simulated/unverified. Cannot confirm consensus from unverified data.",
    };
  }

  const firstFinished = nonSimulated.find((r) => r.status === "FINISHED");
  if (!firstFinished) {
    return {
      verdict: "PENDING",
      confidence: 25,
      agreedResult: {
        homeTeam: nonSimulated[0].homeTeam,
        awayTeam: nonSimulated[0].awayTeam,
        homeScore: null,
        awayScore: null,
      },
      conflictingSources: [],
      passingNodes: 0,
      totalNodes,
      explanation: "Match has not finished yet. Awaiting final score.",
    };
  }

  const key = resultKey(firstFinished);
  const agree = nonSimulated.filter((r) => resultKey(r) === key);
  const disagree = nonSimulated.filter((r) => resultKey(r) !== key);
  const simulateDisclaimer = results.some((r) => r.source === "simulated")
    ? " Note: simulated source excluded from consensus."
    : "";

  if (agree.length >= threshold) {
    const confidence = Math.round((agree.length / totalNodes) * 100);
    return {
      verdict: "CONFIRMED",
      confidence,
      agreedResult: {
        homeTeam: firstFinished.homeTeam,
        awayTeam: firstFinished.awayTeam,
        homeScore: firstFinished.homeScore,
        awayScore: firstFinished.awayScore,
      },
      conflictingSources: disagree.map((r) => r.source),
      passingNodes: agree.length,
      totalNodes,
      explanation: `${agree.length} of ${totalNodes} verified sources agree on ${firstFinished.homeTeam} ${firstFinished.homeScore} - ${firstFinished.awayScore} ${firstFinished.awayTeam}. BFT threshold (≥${threshold}) met.${simulateDisclaimer}`,
    };
  }

  if (agree.length < threshold && nonSimulated.length >= threshold) {
    return {
      verdict: "DISPUTED",
      confidence: 0,
      agreedResult: {
        homeTeam: firstFinished.homeTeam,
        awayTeam: firstFinished.awayTeam,
        homeScore: firstFinished.homeScore,
        awayScore: firstFinished.awayScore,
      },
      conflictingSources: disagree.map((r) => r.source),
      passingNodes: agree.length,
      totalNodes,
      explanation: `Only ${agree.length} of ${totalNodes} verified sources agree. BFT threshold (≥${threshold}) not met. Results are disputed.${simulateDisclaimer}`,
    };
  }

  return {
    verdict: "PENDING",
    confidence: Math.round((agree.length / totalNodes) * 50),
    agreedResult: {
      homeTeam: firstFinished.homeTeam,
      awayTeam: firstFinished.awayTeam,
      homeScore: firstFinished.homeScore,
      awayScore: firstFinished.awayScore,
    },
    conflictingSources: disagree.map((r) => r.source),
    passingNodes: agree.length,
    totalNodes,
    explanation: `Insufficient verified sources for consensus. ${agree.length} agree, need ≥${threshold}.${simulateDisclaimer}`,
  };
}
