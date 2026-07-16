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
  const explanation =
    "LLM temporarily unavailable. Consensus continued using the remaining verification agents.";

  return {
    agentId: "llm-reasoning",
    agentName: "LLM Reasoning Agent",
    prediction: {
      winner: state.homeTeam,
      homeScore: null,
      awayScore: null,
    },
    confidence: 0,
    explanation,
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

    try {
      const client = getClient();
      const model = getModelName();
      const maxRetries = 3;
      let lastError: unknown;

      let response;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          response = await client.chat.completions.create({
            model,
            temperature: 0.2,
            max_tokens: 512,
            messages: [
              {
                role: "system",
                content:
                  "You are a professional football analyst specializing in match prediction. Analyze match context and predict outcomes. Respond only in valid JSON with no markdown formatting.",
              },
              {
                role: "user",
                content: `Analyze this football match: ${state.homeTeam} vs ${state.awayTeam}.
Status: ${state.status}
${state.homeScore !== null ? `Current score: ${state.homeTeam} ${state.homeScore} - ${state.awayScore} ${state.awayTeam}` : "Score not yet available."}

Consider: recent form, venue advantage, head-to-head record, squad depth, tactical matchup, home advantage.
Return JSON: { "winner": string, "homeScore": number, "awayScore": number, "confidence": number 0-100, "reasoning": string, "keyFactors": [3 strings] }`,
              },
            ],
          });
          break;
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.code;
          if (status === 429 && attempt < maxRetries) {
            const retryAfter = parseFloat(
              err?.headers?.["retry-after"] || "0"
            ) || Math.pow(2, attempt + 1);
            console.warn(
              `[llm-reasoning] Rate limited, retrying in ${retryAfter.toFixed(1)}s (attempt ${attempt + 1}/${maxRetries})`
            );
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            continue;
          }
          throw err;
        }
      }

      const content = response!.choices[0]?.message?.content || "{}";
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned) as LLMResponse;

      const winner = parsed.winner || state.homeTeam;
      const confidence = Math.min(100, Math.max(0, parsed.confidence || 50));

      const evidence: AgentEvidence[] = [
        {
          source: "llm-reasoning",
          detail: `Predicted winner: ${winner}`,
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
      ];

      return {
        agentId: "llm-reasoning",
        agentName: "LLM Reasoning Agent",
        prediction: {
          winner,
          homeScore: parsed.homeScore,
          awayScore: parsed.awayScore,
        },
        confidence,
        explanation:
          `LLM analysis: ${parsed.reasoning || "No detailed reasoning provided."} ` +
          `Key factors: ${(parsed.keyFactors || []).join("; ")}.`,
        evidence,
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      console.error(
        `[llm-reasoning] API error: ${err instanceof Error ? err.message : "unknown"}`
      );
      return fallbackOutput(state, start);
    }
  },
};
