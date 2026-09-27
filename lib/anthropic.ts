import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { AgentOutputError, AppError } from "@/lib/errors";

const DEFAULT_MODEL = "claude-opus-5";

// Server-side refusal fallbacks ("default" routing) — supported on these models.
const FALLBACK_MODELS = new Set(["claude-opus-5", "claude-fable-5-1"]);

let client: Anthropic | null = null;

export function getModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

export function assertApiKeyConfigured(): void {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    throw new AppError(
      "missing_api_key",
      "The server is not configured with an ANTHROPIC_API_KEY. Add it to .env.local (or your Vercel project settings) and restart.",
      500,
    );
  }
}

function getClient(): Anthropic {
  assertApiKeyConfigured();
  // API keys that are not scoped to a workspace must name one per request.
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  // maxRetries covers 408/409/429/5xx and connection errors with backoff.
  client ??= new Anthropic({
    maxRetries: 3,
    timeout: 180_000,
    ...(workspaceId ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } } : {}),
  });
  return client;
}

export type Effort = "low" | "medium" | "high";

export interface StructuredCallOptions<S extends z.ZodType> {
  agent: string;
  system: string;
  user: string;
  schema: S;
  effort: Effort;
  maxTokens?: number;
  signal?: AbortSignal;
}

/**
 * Makes one isolated Claude call that must return JSON matching `schema`.
 * The schema is enforced by the API (structured outputs) and re-validated by
 * Zod in the SDK's parse helper. A malformed response is retried once.
 */
export async function callStructured<S extends z.ZodType>(
  options: StructuredCallOptions<S>,
): Promise<z.infer<S>> {
  const attempts = 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await callOnce(options);
    } catch (error) {
      // Only malformed output is worth an immediate retry; API errors are
      // already retried by the SDK and should surface.
      if (!(error instanceof AgentOutputError)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

async function callOnce<S extends z.ZodType>({
  agent,
  system,
  user,
  schema,
  effort,
  maxTokens = 16_000,
  signal,
}: StructuredCallOptions<S>): Promise<z.infer<S>> {
  const model = getModel();
  const useFallbacks = FALLBACK_MODELS.has(model);

  let response;
  try {
    response = await getClient().beta.messages.parse(
      {
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
        thinking: { type: "adaptive" },
        output_config: { effort, format: betaZodOutputFormat(schema) },
        ...(useFallbacks
          ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
          : {}),
      },
      { signal },
    );
  } catch (error) {
    // API/network errors extend APIError. The parse helper throws a base
    // AnthropicError when the returned JSON fails Zod validation.
    if (error instanceof Anthropic.APIError) throw error;
    if (error instanceof Anthropic.AnthropicError) {
      throw new AgentOutputError(agent, "response failed schema validation");
    }
    throw error;
  }

  if (response.stop_reason === "refusal") {
    throw new AppError(
      "refusal",
      "The AI declined to analyse this content. Please review your inputs and try again.",
      422,
    );
  }
  if (response.stop_reason === "max_tokens") {
    throw new AgentOutputError(agent, "response was truncated (max_tokens)");
  }
  if (response.parsed_output == null) {
    throw new AgentOutputError(agent, "no parseable structured output");
  }
  return response.parsed_output;
}
