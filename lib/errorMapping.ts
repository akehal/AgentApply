import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AgentOutputError, AppError } from "@/lib/errors";

/**
 * Maps any thrown value to a user-safe AppError. Never forwards raw provider
 * messages, stack traces, or request details to the client.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof AgentOutputError) {
    return new AppError(
      "malformed_response",
      "The AI returned a response that did not match the expected structure. Please try again.",
      502,
    );
  }

  // Most specific SDK error classes first.
  if (error instanceof Anthropic.AuthenticationError) {
    return new AppError(
      "auth_error",
      "The AI provider rejected the API key. Check ANTHROPIC_API_KEY on the server.",
      500,
    );
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return new AppError("permission_denied", "The API key does not have access to the configured model.", 500);
  }
  if (error instanceof Anthropic.NotFoundError) {
    return new AppError("model_not_found", "The configured Claude model was not found. Check ANTHROPIC_MODEL.", 500);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new AppError("rate_limited", "The AI provider is rate limiting requests. Please wait a minute and try again.", 429);
  }
  if (error instanceof Anthropic.BadRequestError) {
    // The API has no dedicated error code for this configuration problem.
    if (error.message.includes("anthropic-workspace-id")) {
      return new AppError(
        "workspace_required",
        "The API key is not scoped to a workspace. Set ANTHROPIC_WORKSPACE_ID on the server, or use a workspace-scoped API key.",
        500,
      );
    }
    if (error.message.includes("credit balance")) {
      return new AppError(
        "insufficient_credits",
        "The AI provider account has run out of credits. The site owner needs to add credits before analyses can run.",
        503,
      );
    }
    return new AppError("bad_request", "The AI provider rejected the request.", 400);
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new AppError("timeout", "The AI provider took too long to respond. Please try again.", 504);
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new AppError("network_error", "Could not reach the AI provider. Check your connection and try again.", 502);
  }
  if (error instanceof Anthropic.APIUserAbortError) {
    return new AppError("aborted", "The analysis was cancelled.", 499);
  }
  if (error instanceof Anthropic.APIError) {
    // 5xx / 529 overloaded and anything else from the API.
    return new AppError("provider_error", "The AI provider is temporarily unavailable. Please try again shortly.", 503);
  }

  return new AppError("internal_error", "Something went wrong while analysing your application.", 500);
}
