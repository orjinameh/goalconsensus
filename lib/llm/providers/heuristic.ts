import type { LLMProvider, LLMCompletionRequest, LLMCompletionResponse } from "../types";

export class HeuristicProvider implements LLMProvider {
  readonly id = "heuristic";
  readonly name = "Heuristic Reasoner";

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const start = Date.now();

    const lastUser = [...request.messages]
      .reverse()
      .find((m) => m.role === "user");
    const prompt = lastUser?.content || "";

    const homeMatch = prompt.match(/(\w+(?:\s\w+)*)\s+vs\s+(\w+(?:\s\w+)*)/i);
    let homeTeam = "Home";
    let awayTeam = "Away";
    if (homeMatch) {
      homeTeam = homeMatch[1].trim();
      awayTeam = homeMatch[2].trim();
    }

    const scoreMatch = prompt.match(/Score:\s*\w+\s+(\d+)-(\d+)\s+\w+/i);
    if (scoreMatch) {
      const h = parseInt(scoreMatch[1], 10);
      const a = parseInt(scoreMatch[2], 10);
      let winner = "Draw";
      if (h > a) winner = homeTeam;
      else if (a > h) winner = awayTeam;
      const content = JSON.stringify({
        winner,
        homeScore: h,
        awayScore: a,
        confidence: 45,
        reasoning: `Heuristic analysis based on available match data. Score provided: ${h}-${a}.`,
        keyFactors: [
          "Score-based analysis",
          "Historical baseline",
          "Available match data",
        ],
      });
      return {
        content,
        provider: this.id,
        model: "heuristic-v1",
        latencyMs: Date.now() - start,
      };
    }

    const content = JSON.stringify({
      winner: homeTeam,
      homeScore: 1,
      awayScore: 0,
      confidence: 30,
      reasoning: `Heuristic fallback: Defaulting to home advantage prediction for ${homeTeam} vs ${awayTeam}. No model providers available.`,
      keyFactors: [
        "Home advantage baseline",
        "No LLM providers available",
        "Default prediction",
      ],
    });

    return {
      content,
      provider: this.id,
      model: "heuristic-v1",
      latencyMs: Date.now() - start,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
