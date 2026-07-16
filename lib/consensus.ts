import { MatchResult, ProviderHealth, ProviderResult } from "./providers";

export type ConsensusVerdict = {
  verdict: "CONFIRMED" | "DISPUTED" | "PENDING" | "INSUFFICIENT_DATA";
  confidence: number;
  agreedResult: {
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null;
    awayScore: number | null;
  } | null;
  conflictingProviders: string[];
  passingNodes: number;
  totalNodes: number;
  explanation: string;
  providerHealth: ProviderHealth[];
};

function resultKey(m: MatchResult): string {
  return `${m.homeScore ?? "x"}-${m.awayScore ?? "x"}`;
}

export function computeConsensus(
  providerResults: ProviderResult[]
): ConsensusVerdict {
  const providerHealth = providerResults.map((pr) => pr.health);
  const responding = providerResults.filter((pr) => pr.health.available);

  if (responding.length < 2) {
    const names = responding.map((r) => r.providerId);
    const down = providerResults
      .filter((pr) => !pr.health.available)
      .map((pr) => pr.providerId);
    return {
      verdict: "INSUFFICIENT_DATA",
      confidence: 0,
      agreedResult: null,
      conflictingProviders: [],
      passingNodes: 0,
      totalNodes: responding.length,
      explanation: `Only ${responding.length} provider(s) responded (${names.join(", ") || "none"}). Need at least 2. Unavailable: ${down.join(", ") || "none"}.`,
      providerHealth,
    };
  }

  const allMatches = responding.flatMap((pr) => pr.matches);

  if (allMatches.length === 0) {
    return {
      verdict: "INSUFFICIENT_DATA",
      confidence: 0,
      agreedResult: null,
      conflictingProviders: [],
      passingNodes: 0,
      totalNodes: responding.length,
      explanation: "No match data returned by any responding provider.",
      providerHealth,
    };
  }

  const totalNodes = responding.length;
  const threshold = Math.ceil((2 * totalNodes) / 3);

  const finishedMatches = allMatches.filter((m) => m.status === "FINISHED");

  if (finishedMatches.length === 0) {
    const first = allMatches[0];
    return {
      verdict: "PENDING",
      confidence: 0,
      agreedResult: {
        homeTeam: first.homeTeam,
        awayTeam: first.awayTeam,
        homeScore: null,
        awayScore: null,
      },
      conflictingProviders: [],
      passingNodes: 0,
      totalNodes,
      explanation: "Match has not finished yet. Awaiting final score.",
      providerHealth,
    };
  }

  const firstFinished = finishedMatches[0];
  const key = resultKey(firstFinished);
  const agree = finishedMatches.filter((m) => resultKey(m) === key);
  const disagree = finishedMatches.filter((m) => resultKey(m) !== key);

  const agreeProviders = [...new Set(agree.map((m) => m.providerId))];
  const disagreeProviders = [...new Set(disagree.map((m) => m.providerId))];

  if (agreeProviders.length >= threshold) {
    const confidence = Math.round(
      (agreeProviders.length / totalNodes) * 100
    );
    return {
      verdict: "CONFIRMED",
      confidence,
      agreedResult: {
        homeTeam: firstFinished.homeTeam,
        awayTeam: firstFinished.awayTeam,
        homeScore: firstFinished.homeScore,
        awayScore: firstFinished.awayScore,
      },
      conflictingProviders: disagreeProviders,
      passingNodes: agreeProviders.length,
      totalNodes,
      explanation: `${agreeProviders.length} of ${totalNodes} providers agree on ${firstFinished.homeTeam} ${firstFinished.homeScore} - ${firstFinished.awayScore} ${firstFinished.awayTeam}. BFT threshold (${threshold}/${totalNodes}) met.`,
      providerHealth,
    };
  }

  if (agreeProviders.length < threshold && totalNodes >= threshold) {
    return {
      verdict: "DISPUTED",
      confidence: 0,
      agreedResult: {
        homeTeam: firstFinished.homeTeam,
        awayTeam: firstFinished.awayTeam,
        homeScore: firstFinished.homeScore,
        awayScore: firstFinished.awayScore,
      },
      conflictingProviders: disagreeProviders,
      passingNodes: agreeProviders.length,
      totalNodes,
      explanation: `Only ${agreeProviders.length} of ${totalNodes} providers agree. BFT threshold (${threshold}/${totalNodes}) not met. Results are disputed.`,
      providerHealth,
    };
  }

  const confidence = Math.round(
    (agreeProviders.length / totalNodes) * 100
  );
  return {
    verdict: "PENDING",
    confidence,
    agreedResult: {
      homeTeam: firstFinished.homeTeam,
      awayTeam: firstFinished.awayTeam,
      homeScore: firstFinished.homeScore,
      awayScore: firstFinished.awayScore,
    },
    conflictingProviders: disagreeProviders,
    passingNodes: agreeProviders.length,
    totalNodes,
    explanation: `Insufficient provider agreement. ${agreeProviders.length} of ${totalNodes} agree, need >=${threshold}.`,
    providerHealth,
  };
}
