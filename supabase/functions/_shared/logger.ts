/**
 * Structured logging utility for edge functions.
 * Outputs JSON-formatted logs with consistent metadata for observability.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  function: string;
  message: string;
  userId?: string;
  householdId?: string;
  requestId?: string;
  durationMs?: number;
  error?: string;
  meta?: Record<string, unknown>;
}

export class Logger {
  private functionName: string;
  private requestId: string;
  private userId?: string;
  private householdId?: string;
  private startTime: number;

  constructor(functionName: string) {
    this.functionName = functionName;
    this.requestId = crypto.randomUUID().slice(0, 8);
    this.startTime = Date.now();
  }

  setContext(ctx: { userId?: string; householdId?: string }) {
    if (ctx.userId) this.userId = ctx.userId;
    if (ctx.householdId) this.householdId = ctx.householdId;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      function: this.functionName,
      message,
      requestId: this.requestId,
      durationMs: Date.now() - this.startTime,
    };

    if (this.userId) entry.userId = this.userId;
    if (this.householdId) entry.householdId = this.householdId;
    if (meta) entry.meta = meta;

    const output = JSON.stringify(entry);

    switch (level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "debug":
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.log("debug", message, meta);
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.log("warn", message, meta);
  }

  error(message: string, error?: unknown, meta?: Record<string, unknown>) {
    const errorStr = error instanceof Error
      ? `${error.message}\n${error.stack}`
      : String(error);
    this.log("error", message, { ...meta, error: errorStr });
  }

  /** Log the final response status and total duration */
  done(statusCode: number) {
    this.info("Request completed", {
      statusCode,
      totalDurationMs: Date.now() - this.startTime,
    });
  }
}
