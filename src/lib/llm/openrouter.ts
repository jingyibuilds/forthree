import type { LLMCompletionRequest, LLMProvider } from "./types";

type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterResponse = {
  error?: { message?: string };
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    cost?: number | string;
  };
};

const endpoint = "https://openrouter.ai/api/v1/chat/completions";

function modelForTier(tier: LLMCompletionRequest["tier"]) {
  if (tier === "planner") {
    return process.env.LLM_MODEL_PLANNER || process.env.LLM_MODEL_MICRO || "~openai/gpt-latest";
  }
  return process.env.LLM_MODEL_MICRO || "~openai/gpt-latest";
}

export function hasOpenRouterKey() {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export const openRouterProvider: LLMProvider = {
  async complete(req) {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const model = modelForTier(req.tier);
    const messages: OpenRouterMessage[] = [
      { role: "system", content: req.system },
      ...req.messages,
    ];

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://forthree.vercel.app",
        "X-OpenRouter-Title": "forthree",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: req.maxTokens,
        temperature: 0.3,
        ...(req.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    const data = (await res.json().catch(() => ({}))) as OpenRouterResponse;
    if (!res.ok) {
      throw new Error(data.error?.message || `OpenRouter request failed (${res.status})`);
    }

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("OpenRouter response did not include assistant text");
    }

    return {
      text,
      model,
      provider: "openrouter",
      usage: {
        tokensIn: data.usage?.prompt_tokens ?? 0,
        tokensOut: data.usage?.completion_tokens ?? 0,
        costUsd: Number(data.usage?.cost ?? 0),
      },
    };
  },
};
