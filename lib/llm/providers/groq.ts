import axios from "axios";
import type { LLMProvider, LLMCompletionRequest, LLMCompletionResponse } from "../types";

export class GroqProvider implements LLMProvider {
  readonly id = "groq";
  readonly name = "Groq";

  private baseUrl = "https://api.groq.com/openai/v1";
  private modelCache: string | null = null;

  private getApiKey(): string {
    return process.env.GROQ_API_KEY || "";
  }

  private getModel(): string {
    if (this.modelCache) return this.modelCache;
    this.modelCache = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    return this.modelCache;
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const start = Date.now();
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error("GROQ_API_KEY not configured");

    const model = this.getModel();

    const res = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model,
        temperature: request.temperature ?? 0.2,
        max_tokens: request.maxTokens ?? 1024,
        messages: request.messages,
      },
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 15_000,
      }
    );

    const content = res.data?.choices?.[0]?.message?.content || "";

    return { content, provider: this.id, model, latencyMs: Date.now() - start };
  }

  async healthCheck(): Promise<boolean> {
    if (!this.getApiKey()) return false;
    try {
      await this.complete({
        messages: [{ role: "user", content: "ping" }],
        maxTokens: 5,
      });
      return true;
    } catch {
      return false;
    }
  }
}
