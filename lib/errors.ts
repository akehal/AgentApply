// Plain error classes — safe to import from client and server code.

/** An error whose message is safe to show to end users. */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** Raised when a model response is missing, refused, truncated, or fails schema validation. */
export class AgentOutputError extends Error {
  constructor(
    public readonly agent: string,
    detail: string,
  ) {
    super(`${agent}: ${detail}`);
    this.name = "AgentOutputError";
  }
}
