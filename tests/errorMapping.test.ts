import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { toAppError } from "@/lib/errorMapping";
import { AgentOutputError, AppError } from "@/lib/errors";

const headers = new Headers();

describe("toAppError", () => {
  it("maps SDK errors to user-safe codes without leaking provider details", () => {
    const cases: [unknown, string][] = [
      [new Anthropic.RateLimitError(429, { secret: "x" }, "provider detail sk-ant-xyz", headers), "rate_limited"],
      [new Anthropic.AuthenticationError(401, undefined, "invalid x-api-key sk-ant-xyz", headers), "auth_error"],
      [new Anthropic.NotFoundError(404, undefined, "model not found", headers), "model_not_found"],
      [new Anthropic.InternalServerError(529, undefined, "overloaded", headers), "provider_error"],
      [new Anthropic.APIConnectionError({ message: "ECONNRESET" }), "network_error"],
      [new Anthropic.APIConnectionTimeoutError(), "timeout"],
      [new AgentOutputError("evidence", "bad json"), "malformed_response"],
      [new Error("boom at /secret/path.ts:12"), "internal_error"],
    ];
    for (const [error, code] of cases) {
      const mapped = toAppError(error);
      expect(mapped.code).toBe(code);
      expect(mapped.message).not.toMatch(/sk-ant|x-api-key|\/secret|ECONNRESET|bad json/);
    }
  });

  it("recognises the workspace-scoping error specifically", () => {
    const err = new Anthropic.BadRequestError(400, undefined, "must include the anthropic-workspace-id header", headers);
    expect(toAppError(err).code).toBe("workspace_required");
    expect(toAppError(new Anthropic.BadRequestError(400, undefined, "other", headers)).code).toBe("bad_request");
  });

  it("recognises an exhausted credit balance (observed during evaluation)", () => {
    const err = new Anthropic.BadRequestError(400, undefined, "Your credit balance is too low to access the Anthropic API.", headers);
    expect(toAppError(err)).toMatchObject({ code: "insufficient_credits", status: 503 });
  });

  it("passes AppErrors through unchanged", () => {
    const err = new AppError("x", "y", 418);
    expect(toAppError(err)).toBe(err);
  });
});
