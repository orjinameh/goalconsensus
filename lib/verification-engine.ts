import type { CanonicalMatchState } from "./agents/types";
import type { ProviderHealth } from "./providers";

export interface ProviderScore {
  providerId: string;
  providerName: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  fetchedAt: string;
  latencyMs: number;
  error?: string;
}

export interface VerificationResult {
  verified: boolean;
  agreement: number;
  totalProviders: number;
  canonicalState: CanonicalMatchState;
  providerScores: ProviderScore[];
  disputedBy: string[];
  reasoning: string;
  verificationDecision: "VERIFIED" | "DISPUTED" | "INSUFFICIENT_DATA";
}

function scoreMatches(a: ProviderScore, b: ProviderScore): boolean {
  return a.homeScore === b.homeScore && a.awayScore === b.awayScore;
}

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/fc$|sc$|cf$|afc$|ssc$/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function teamsMatch(a: string, b: string): boolean {
  return normalizeTeamName(a) === normalizeTeamName(b);
}

export function verifyProviderScores(
  providerScores: ProviderScore[],
  canonicalState: CanonicalMatchState | null,
): VerificationResult {
  const validScores = providerScores.filter(
    (s) => s.homeScore !== null && s.awayScore !== null && !s.error,
  );

  if (!canonicalState) {
    return {
      verified: false,
      agreement: 0,
      totalProviders: validScores.length,
      canonicalState: {
        homeTeam: "Unknown", awayTeam: "Unknown", homeScore: null,
        awayScore: null, status: "FINISHED", matchDate: new Date().toISOString(),
        sport: "FOOTBALL", providerAgreement: false, providerCount: 0,
        providerHealth: [], rawResults: [],
      },
      providerScores,
      disputedBy: [],
      reasoning: "No canonical match state available for verification.",
      verificationDecision: "INSUFFICIENT_DATA",
    };
  }

  if (validScores.length === 0) {
    return {
      verified: false,
      agreement: 0,
      totalProviders: 0,
      canonicalState,
      providerScores,
      disputedBy: providerScores.map((s) => s.providerName),
      reasoning: `All ${providerScores.length} providers failed or returned no score data.`,
      verificationDecision: "INSUFFICIENT_DATA",
    };
  }

  if (canonicalState.sport !== "FOOTBALL") {
    return {
      verified: false,
      agreement: 0,
      totalProviders: validScores.length,
      canonicalState,
      providerScores,
      disputedBy: [],
      reasoning: `UNSUPPORTED_SPORT: ${canonicalState.sport}.`,
      verificationDecision: "INSUFFICIENT_DATA",
    };
  }

  const majorityScores = new Map<string, { score: ProviderScore; count: number }>();
  for (const s of validScores) {
    const key = `${s.homeScore}-${s.awayScore}`;
    const existing = majorityScores.get(key);
    if (existing) {
      existing.count++;
    } else {
      majorityScores.set(key, { score: s, count: 1 });
    }
  }

  let majorityEntry: { score: ProviderScore; count: number } | null = null;
  for (const entry of majorityScores.values()) {
    if (!majorityEntry || entry.count > majorityEntry.count) {
      majorityEntry = entry;
    }
  }

  if (!majorityEntry) {
    return {
      verified: false,
      agreement: 0,
      totalProviders: validScores.length,
      canonicalState,
      providerScores,
      disputedBy: [],
      reasoning: "No valid provider scores to compare.",
      verificationDecision: "INSUFFICIENT_DATA",
    };
  }

  const agreement = majorityEntry.count;
  const totalProviders = validScores.length;
  const agreementRatio = totalProviders > 0 ? agreement / totalProviders : 0;

  const disputedScores = validScores.filter(
    (s) => !scoreMatches(s, majorityEntry!.score),
  );

  const canonicalMatchesMajority =
    canonicalState.homeScore === majorityEntry.score.homeScore &&
    canonicalState.awayScore === majorityEntry.score.awayScore;

  const verified =
    canonicalMatchesMajority && agreementRatio >= 0.67;

  let verificationDecision: VerificationResult["verificationDecision"];
  if (verified) {
    verificationDecision = "VERIFIED";
  } else if (disputedScores.length > 0) {
    verificationDecision = "DISPUTED";
  } else {
    verificationDecision = "INSUFFICIENT_DATA";
  }

  const providerNames = validScores
    .map((s) => `${s.providerName}: ${s.homeScore}-${s.awayScore}`)
    .join(", ");

  const reasoning = verified
    ? `VERIFIED: ${agreement}/${totalProviders} providers agree on ${canonicalState.homeTeam} ${majorityEntry.score.homeScore}-${majorityEntry.score.awayScore} ${canonicalState.awayTeam}. Provider scores: ${providerNames}. Canonical state confirmed.`
    : `DISPUTED: Only ${agreement}/${totalProviders} providers agree on score. Canonical: ${canonicalState.homeScore}-${canonicalState.awayScore}. Provider scores: ${providerNames}.`;

  return {
    verified,
    agreement,
    totalProviders,
    canonicalState,
    providerScores,
    disputedBy: disputedScores.map((s) => s.providerName),
    reasoning,
    verificationDecision,
  };
}
