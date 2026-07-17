export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCompletionRequest {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LLMCompletionResponse {
  content: string;
  provider: string;
  model: string;
  latencyMs: number;
}

export interface LLMProvider {
  readonly id: string;
  readonly name: string;
  complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse>;
  healthCheck(): Promise<boolean>;
}
