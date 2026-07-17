import axios from "axios";
import type { LLMProvider, LLMCompletionRequest, LLMCompletionResponse } from "../types";

export class GeminiProvider implements LLMProvider {
  readonly id = "gemini";
  readonly name = "Google Gemini";

  private baseUrl = "https://generativelanguage.googleapis.com/v1beta";
  private modelCache: string | null = null;

  private getApiKey(): string {
    return process.env.GEMINI_API_KEY || "";
  }

  private getModel(): string {
    if (this.modelCache) return this.modelCache;
    this.modelCache = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    return this.modelCache;
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const start = Date.now();
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const model = this.getModel();
    const contents = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const systemInstruction = request.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");

    const payload: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxTokens ?? 1024,
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const res = await axios.post(
      `${this.baseUrl}/models/${model}:generateContent?key=${apiKey}`,
      payload,
      { timeout: 15_000 }
    );

    const text =
      res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return {
      content: text,
      provider: this.id,
      model,
      latencyMs: Date.now() - start,
    };
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
