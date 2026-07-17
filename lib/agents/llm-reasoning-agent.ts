import {
  VerificationAgent,
  CanonicalMatchState,
  AgentOutput,
  AgentEvidence,
} from "./types";
import { getLLMChain } from "../llm/chain";

const llmCache = new Map<string, { result: AgentOutput; ts: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function cacheKey(state: CanonicalMatchState): string {
  return `${state.homeTeam}-${state.awayTeam}-${state.status}-${state.homeScore ?? "x"}-${state.awayScore ?? "x"}`;
}

interface LLMResponse {
  winner: string;
  homeScore: number;
  awayScore: number;
  confidence: number;
  reasoning: string;
  keyFactors: string[];
}

function fallbackOutput(
  state: CanonicalMatchState,
  start: number
): AgentOutput {
  return {
    agentId: "llm-reasoning",
    agentName: "LLM Reasoning Agent",
    prediction: {
      winner: state.homeTeam,
      homeScore: null,
      awayScore: null,
    },
    confidence: 0,
    explanation:
      "AI reasoning is temporarily unavailable. Consensus generated using available agents.",
    evidence: [
      {
        source: "llm-reasoning",
        detail:
          "AI reasoning unavailable — agent skipped, consensus uses remaining agents",
        weight: 0,
      },
    ],
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - start,
  };
}

export const llmReasoningAgent: VerificationAgent = {
  id: "llm-reasoning",
  name: "LLM Reasoning Agent",

  async verify(state: CanonicalMatchState): Promise<AgentOutput> {
    const start = Date.now();

    if (state.sport !== "FOOTBALL") {
      return {
        agentId: "llm-reasoning",
        agentName: "LLM Reasoning Agent",
        prediction: { winner: "Unknown", homeScore: null, awayScore: null },
        confidence: 0,
        explanation: `UNSUPPORTED_SPORT: LLM Reasoning Agent only supports football. Received sport: ${state.sport}.`,
        evidence: [
          {
            source: "llm-reasoning",
            detail: `UNSUPPORTED_SPORT: ${state.sport}`,
            weight: 1.0,
          },
        ],
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - start,
      };
    }

    const key = cacheKey(state);
    const cached = llmCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return { ...cached.result, latencyMs: Date.now() - start };
    }

    try {
      const chain = getLLMChain();

      const userContent = [
        `Predict: ${state.homeTeam} vs ${state.awayTeam} (${state.status}).`,
        state.homeScore !== null
          ? `Score: ${state.homeTeam} ${state.homeScore}-${state.awayScore} ${state.awayTeam}.`
          : "",
        `Return ONLY valid JSON: {"winner":"team name","homeScore":0,"awayScore":0,"confidence":0,"reasoning":"brief analysis","keyFactors":["factor1","factor2","factor3"]}`,
      ]
        .filter(Boolean)
        .join(" ");

      const chainResult = await chain.complete({
        messages: [
          {
            role: "system",
            content:
              "You are a football match analyst. Respond only in valid JSON, no markdown, no code fences.",
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        temperature: 0.2,
        maxTokens: 256,
      });

      const content = chainResult.result.content || "{}";
      const cleaned = content
        .replace(/```json\n?|\n?```/g, "")
        .replace(/^```[\s\S]*?```$/gm, "")
        .trim();

      let parsed: LLMResponse;
      try {
        parsed = JSON.parse(cleaned) as LLMResponse;
      } catch {
        return fallbackOutput(state, start);
      }

      const winner = parsed.winner || state.homeTeam;
      const confidence = Math.min(
        100,
        Math.max(0, parsed.confidence || 50)
      );

      const result: AgentOutput = {
        agentId: "llm-reasoning",
        agentName: "LLM Reasoning Agent",
        prediction: {
          winner,
          homeScore: parsed.homeScore,
          awayScore: parsed.awayScore,
        },
        confidence,
        explanation:
          `${parsed.reasoning || "AI analysis based on form and context."} ` +
          `Key factors: ${(parsed.keyFactors || []).join("; ")}.`,
        evidence: [
          {
            source: "llm-reasoning",
            detail: `Provider: ${chainResult.providerUsed} | Model: ${chainResult.result.model}`,
            weight: 0.1,
          },
          {
            source: "llm-reasoning",
            detail: `Winner: ${winner}`,
            weight: 0.4,
          },
          {
            source: "llm-reasoning",
            detail: `Confidence: ${confidence}%`,
            weight: 0.25,
          },
          {
            source: "llm-reasoning",
            detail: `Score: ${parsed.homeScore}-${parsed.awayScore}`,
            weight: 0.25,
          },
        ],
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - start,
      };

      llmCache.set(key, { result, ts: Date.now() });
      return result;
    } catch {
      return fallbackOutput(state, start);
    }
  },
};
