import Groq from "groq-sdk";
import {
  VerificationAgent,
  CanonicalMatchState,
  AgentOutput,
  AgentEvidence,
} from "./types";

let groqClient: Groq | null = null;

function getClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
  }
  return groqClient;
}

function getModelName(): string {
  return process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
}

const COOLDOWN_MS = 3000;
let lastCallTime = 0;

const llmCache = new Map<string, { result: AgentOutput; ts: number }>();
const CACHE_TTL_MS = 60_000;

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
      "LLM temporarily unavailable. Consensus continued using the remaining verification agents.",
    evidence: [
      {
        source: "llm-reasoning",
        detail:
          "LLM unavailable — agent skipped, consensus uses remaining agents",
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

    if (!process.env.GROQ_API_KEY) {
      return fallbackOutput(state, start);
    }

    const key = cacheKey(state);
    const cached = llmCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return { ...cached.result, latencyMs: Date.now() - start };
    }

    const elapsed = Date.now() - lastCallTime;
    if (elapsed < COOLDOWN_MS) {
      await new Promise((r) =>
        setTimeout(r, COOLDOWN_MS - elapsed)
      );
    }

    try {
      const client = getClient();
      const model = getModelName();
      lastCallTime = Date.now();

      const response = await client.chat.completions.create({
        model,
        temperature: 0.2,
        max_tokens: 256,
        messages: [
          {
            role: "system",
            content:
              "You are a football match analyst. Respond only in valid JSON, no markdown.",
          },
          {
            role: "user",
            content: `Predict: ${state.homeTeam} vs ${state.awayTeam} (${state.status}).
${state.homeScore !== null ? `Score: ${state.homeTeam} ${state.homeScore}-${state.awayScore} ${state.awayTeam}.` : ""}
Return: {"winner":"team","homeScore":0,"awayScore":0,"confidence":0,"reasoning":"...","keyFactors":["...","...","..."]}`,
          },
        ],
      });

      const content =
        response.choices[0]?.message?.content || "{}";
      const cleaned = content
        .replace(/```json\n?|\n?```/g, "")
        .trim();
      const parsed = JSON.parse(cleaned) as LLMResponse;

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
            detail: `Winner: ${winner}`,
            weight: 0.4,
          },
          {
            source: "llm-reasoning",
            detail: `Confidence: ${confidence}%`,
            weight: 0.3,
          },
          {
            source: "llm-reasoning",
            detail: `Score: ${parsed.homeScore}-${parsed.awayScore}`,
            weight: 0.3,
          },
        ],
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - start,
      };

      llmCache.set(key, { result, ts: Date.now() });
      return result;
    } catch (err) {
      console.error(
        `[llm-reasoning] ${err instanceof Error ? err.message : "unknown"}`
      );
      return fallbackOutput(state, start);
    }
  },
};
