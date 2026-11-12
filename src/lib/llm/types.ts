export type LLMTier = "micro" | "planner";

export type LLMMessage = {
  role: "user" | "assistant";
  content: string;
};

export type TokenUsage = {
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
};

export type LLMCompletionRequest = {
  tier: LLMTier;
  system: string;
  messages: LLMMessage[];
  maxTokens: number;
  json?: boolean;
};

export type LLMCompletion = {
  text: string;
  model: string;
  provider: string;
  usage: TokenUsage;
};

export interface LLMProvider {
  complete(req: LLMCompletionRequest): Promise<LLMCompletion>;
}
