import Groq from "groq-sdk";
import { VerificationAgent, CanonicalMatchState, AgentOutput, AgentEvidence } from "./types";

let groqClient: Groq | null = null;

function getClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
  }
  return groqClient;
}

interface LLMResponse {
  winner: string;
  homeScore: number;
  awayScore: number;
  confidence: number;
  reasoning: string;
  keyFactors: string[];
}

function fallbackOutput(state: CanonicalMatchState, start: number, error?: string): AgentOutput {
  const explanation = error
    ? `LLM unavailable (${error}). Falling back to home advantage heuristic.`
    : "No API key configured. Falling back to home advantage heuristic.";

  return {
    agentId: "llm-reasoning",
    agentName: "LLM Reasoning Agent",
    prediction: {
      winner: state.homeTeam,
      homeScore: null,
      awayScore: null,
    },
    confidence: 25,
    explanation,
    evidence: [
      { source: "llm-reasoning", detail: explanation, weight: 1.0 },
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

    if (!process.env.GROQ_API_KEY) {
      return fallbackOutput(state, start);
    }

    try {
      const client = getClient();
      const response = await client.chat.completions.create({
        model: "llama3-8b-8192",
        temperature: 0.2,
        max_tokens: 512,
        messages: [
          {
            role: "system",
            content: "You are a World Cup 2026 football analyst. Analyze match context and predict outcomes. Respond only in valid JSON with no markdown.",
          },
          {
            role: "user",
            content: `Analyze this World Cup 2026 match: ${state.homeTeam} vs ${state.awayTeam}.
Status: ${state.status}
${state.homeScore !== null ? `Current score: ${state.homeTeam} ${state.homeScore} - ${state.awayScore} ${state.awayTeam}` : "Score not yet available."}

Consider: team form, venue advantage, historical matchups, squad depth, tournament momentum, injury context.
Return JSON: { "winner": string, "homeScore": number, "awayScore": number, "confidence": number 0-100, "reasoning": string, "keyFactors": [3 strings] }`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content || "{}";
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned) as LLMResponse;

      const winner = parsed.winner || state.homeTeam;
      const confidence = Math.min(100, Math.max(0, parsed.confidence || 50));

      const evidence: AgentEvidence[] = [
        { source: "llm-reasoning", detail: `Predicted winner: ${winner}`, weight: 0.4 },
        { source: "llm-reasoning", detail: `Confidence: ${confidence}%`, weight: 0.3 },
        { source: "llm-reasoning", detail: `Score: ${parsed.homeScore}-${parsed.awayScore}`, weight: 0.3 },
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
        explanation: `Groq LLM analysis: ${parsed.reasoning || "No detailed reasoning provided."} ` +
          `Key factors: ${(parsed.keyFactors || []).join("; ")}.`,
        evidence,
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return fallbackOutput(state, start, err instanceof Error ? err.message : "unknown");
    }
  },
};
