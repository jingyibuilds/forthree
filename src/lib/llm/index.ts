import { openRouterProvider } from "./openrouter";
import type { LLMProvider } from "./types";

export function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || "openrouter";
  if (provider !== "openrouter") {
    throw new Error(`Unsupported LLM_PROVIDER "${provider}"`);
  }
  return openRouterProvider;
}

export type {
  LLMCompletion,
  LLMCompletionRequest,
  LLMMessage,
  LLMTier,
  TokenUsage,
} from "./types";
