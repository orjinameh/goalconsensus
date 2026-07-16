import Groq from "groq-sdk";

export interface MatchPrediction {
  predictedWinner: string;
  winProbability: number;
  keyFactors: string[];
  predictedScore: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

let groqClient: Groq | null = null;

function getClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
  }
  return groqClient;
}

function getModelName(): string {
  return process.env.GROQ_MODEL || "openai/gpt-oss-20b";
}

export async function predictMatch(
  homeTeam: string,
  awayTeam: string
): Promise<MatchPrediction> {
  if (!process.env.GROQ_API_KEY) {
    return {
      predictedWinner: homeTeam,
      winProbability: 55,
      keyFactors: [
        "Home advantage",
        "Historical head-to-head record",
        "Current squad form",
      ],
      predictedScore: "2-1",
      confidence: "LOW",
    };
  }

  try {
    const client = getClient();
    const model = getModelName();
    const response = await client.chat.completions.create({
      model,
      temperature: 0.3,
      max_tokens: 512,
      messages: [
        {
          role: "system",
          content:
            'You are a professional football analyst. Respond only in valid JSON with no markdown.',
        },
        {
          role: "user",
          content: `Predict the result of this football match: ${homeTeam} vs ${awayTeam}. Return JSON with: predictedWinner (string), winProbability (number 0-100), keyFactors (array of exactly 3 strings), predictedScore (string like "2-1"), confidence ("HIGH", "MEDIUM", or "LOW").`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "{}";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();

    const parsed = JSON.parse(cleaned) as MatchPrediction;
    return {
      predictedWinner: parsed.predictedWinner || homeTeam,
      winProbability: Math.min(
        100,
        Math.max(0, parsed.winProbability || 50)
      ),
      keyFactors: Array.isArray(parsed.keyFactors)
        ? parsed.keyFactors.slice(0, 3)
        : ["Data unavailable"],
      predictedScore: parsed.predictedScore || "1-1",
      confidence: ["HIGH", "MEDIUM", "LOW"].includes(parsed.confidence)
        ? parsed.confidence
        : "MEDIUM",
    };
  } catch {
    return {
      predictedWinner: homeTeam,
      winProbability: 55,
      keyFactors: [
        "Home advantage",
        "Historical head-to-head record",
        "Current squad form",
      ],
      predictedScore: "1-1",
      confidence: "LOW",
    };
  }
}
