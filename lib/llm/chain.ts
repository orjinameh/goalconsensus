import type { LLMProvider, LLMCompletionRequest, LLMCompletionResponse } from "./types";
import { GeminiProvider } from "./providers/gemini";
import { GroqProvider } from "./providers/groq";
import { OpenRouterProvider } from "./providers/openrouter";
import { HeuristicProvider } from "./providers/heuristic";
import { CircuitBreaker } from "./circuit-breaker";
import { SingleFlight } from "./single-flight";

export interface LLMChainResult {
  result: LLMCompletionResponse;
  providerUsed: string;
  fallbacksAttempted: string[];
}

export class LLMChain {
  private providers: LLMProvider[] = [];
  private circuitBreaker: CircuitBreaker;
  private singleFlight: SingleFlight;
  private responseCache = new Map<string, { result: LLMCompletionResponse; ts: number }>();
  private cacheTtlMs: number;

  constructor(
    circuitBreaker?: CircuitBreaker,
    singleFlight?: SingleFlight,
    cacheTtlMs = 5 * 60_000
  ) {
    this.circuitBreaker = circuitBreaker || new CircuitBreaker(3, 60_000);
    this.singleFlight = singleFlight || new SingleFlight();
    this.cacheTtlMs = cacheTtlMs;

    const gemini = new GeminiProvider();
    const groq = new GroqProvider();
    const openrouter = new OpenRouterProvider();
    const heuristic = new HeuristicProvider();

    if (process.env.GEMINI_API_KEY) this.providers.push(gemini);
    if (process.env.GROQ_API_KEY) this.providers.push(groq);
    if (process.env.OPENROUTER_API_KEY) this.providers.push(openrouter);
    this.providers.push(heuristic);

    if (this.providers.length === 1) {
      this.providers.unshift(groq, openrouter);
      if (!this.providers.includes(heuristic)) {
        this.providers.push(heuristic);
      }
    }
  }

  private getCacheKey(request: LLMCompletionRequest): string {
    const msgHash = request.messages
      .map((m) => `${m.role}:${m.content}`)
      .join("|");
    let hash = 0;
    for (let i = 0; i < msgHash.length; i++) {
      hash = (hash * 31 + msgHash.charCodeAt(i)) | 0;
    }
    return `llm:${hash}`;
  }

  async complete(request: LLMCompletionRequest): Promise<LLMChainResult> {
    const cacheKey = this.getCacheKey(request);
    const cached = this.responseCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.cacheTtlMs) {
      return { result: cached.result, providerUsed: "cache", fallbacksAttempted: [] };
    }

    return this.singleFlight.dedupe(cacheKey, () => this.executeWithFallback(request, cacheKey));
  }

  private async executeWithFallback(
    request: LLMCompletionRequest,
    cacheKey: string
  ): Promise<LLMChainResult> {
    const fallbacksAttempted: string[] = [];

    for (const provider of this.providers) {
      if (!this.circuitBreaker.canExecute(provider.id)) {
        fallbacksAttempted.push(`${provider.id}(circuit-open)`);
        continue;
      }

      try {
        const result = await provider.complete(request);
        this.circuitBreaker.recordSuccess(provider.id);

        if (result.content) {
          this.responseCache.set(cacheKey, { result, ts: Date.now() });
        }

        return { result, providerUsed: provider.id, fallbacksAttempted };
      } catch (err) {
        this.circuitBreaker.recordFailure(provider.id);
        const msg = err instanceof Error ? err.message : "unknown";
        fallbacksAttempted.push(`${provider.id}(${msg})`);
      }
    }

    const fallbackProvider = new HeuristicProvider();
    const result = await fallbackProvider.complete(request);
    return {
      result,
      providerUsed: "heuristic",
      fallbacksAttempted,
    };
  }

  getProviderStatus(): Array<{ id: string; name: string; available: boolean; circuitState: string }> {
    return this.providers.map((p) => ({
      id: p.id,
      name: p.name,
      available: this.circuitBreaker.canExecute(p.id),
      circuitState: this.circuitBreaker.getStateSnapshot(p.id).state,
    }));
  }
}

let defaultChain: LLMChain | null = null;

export function getLLMChain(): LLMChain {
  if (!defaultChain) {
    defaultChain = new LLMChain();
  }
  return defaultChain;
}
