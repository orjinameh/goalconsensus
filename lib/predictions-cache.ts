import { connectToDatabase } from "./mongodb";
import type { AgentOutput, AIConsensus, DebateMessage } from "./agents/types";
import type { PredictionResult } from "./prediction-engine";

export interface CachedPrediction {
  matchKey: string;
  homeTeam: string;
  awayTeam: string;
  specialistOutputs: AgentOutput[];
  debate: { messages: DebateMessage[]; consensus: AIConsensus };
  prediction?: PredictionResult;
  cachedAt: string;
  matchStatusAtCache: string;
}

function predictionKey(homeTeam: string, awayTeam: string): string {
  return `${homeTeam.toLowerCase()}|${awayTeam.toLowerCase()}`;
}

export async function cachePrediction(
  homeTeam: string,
  awayTeam: string,
  specialistOutputs: AgentOutput[],
  debate: { messages: DebateMessage[]; consensus: AIConsensus },
  prediction?: PredictionResult
): Promise<void> {
  try {
    const db = await connectToDatabase();
    const key = predictionKey(homeTeam, awayTeam);
    const doc: CachedPrediction = {
      matchKey: key,
      homeTeam,
      awayTeam,
      specialistOutputs,
      debate,
      prediction,
      cachedAt: new Date().toISOString(),
      matchStatusAtCache: "SCHEDULED",
    };
    await db.collection("predictions").updateOne(
      { matchKey: key },
      { $set: doc },
      { upsert: true }
    );
  } catch {
    // Best effort — don't break the pipeline if caching fails
  }
}

export async function getCachedPrediction(
  homeTeam: string,
  awayTeam: string
): Promise<CachedPrediction | null> {
  try {
    const db = await connectToDatabase();
    const key = predictionKey(homeTeam, awayTeam);
    const doc = await db.collection("predictions").findOne({ matchKey: key });
    return (doc as unknown as CachedPrediction) || null;
  } catch {
    return null;
  }
}
