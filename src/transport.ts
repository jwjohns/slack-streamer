import { sleep } from "./util/sleep";

export interface SlackTransportOptions {
  maxRetries?: number;
  baseRetryDelayMs?: number;
  maxRetryDelayMs?: number;
  onRateLimit?: (retryAfterMs: number) => void;
}

export interface SlackPostMessageArgs {
  channel: string;
  text: string;
  thread_ts?: string;
}

export interface SlackUpdateMessageArgs {
  channel: string;
  ts: string;
  text: string;
}

export interface SlackPostMessageResponse {
  ok: boolean;
  ts?: string;
  channel?: string;
}

export interface SlackUpdateMessageResponse {
  ok: boolean;
  ts?: string;
  channel?: string;
}

export interface SlackWebClient {
  chat: {
    postMessage: (args: SlackPostMessageArgs) => Promise<SlackPostMessageResponse>;
    update: (args: SlackUpdateMessageArgs) => Promise<SlackUpdateMessageResponse>;
  };
}

export class SlackTransport {
  private readonly client: SlackWebClient;
  private readonly maxRetries: number;
  private readonly baseRetryDelayMs: number;
  private readonly maxRetryDelayMs: number;
  private readonly onRateLimit?: (retryAfterMs: number) => void;

  constructor(client: SlackWebClient, options: SlackTransportOptions = {}) {
    this.client = client;
    this.maxRetries = options.maxRetries ?? 5;
    this.baseRetryDelayMs = options.baseRetryDelayMs ?? 500;
    this.maxRetryDelayMs = options.maxRetryDelayMs ?? 8000;
    this.onRateLimit = options.onRateLimit;
  }

  async postMessage(args: SlackPostMessageArgs) {
    return this.callWithRetries(() => this.client.chat.postMessage(args));
  }

  async updateMessage(args: SlackUpdateMessageArgs) {
    return this.callWithRetries(() => this.client.chat.update(args));
  }

  private async callWithRetries<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (err) {
        const retryAfterMs = getRetryAfterMs(err);
        if (isRateLimitError(err)) {
          if (attempt >= this.maxRetries) throw err;
          this.onRateLimit?.(retryAfterMs);
          await sleep(retryAfterMs || this.baseRetryDelayMs);
          attempt += 1;
          continue;
        }

        if (!isTransientError(err) || isFatalSlackError(err)) {
          throw err;
        }

        if (attempt >= this.maxRetries) throw err;

        const backoff = Math.min(
          this.maxRetryDelayMs,
          this.baseRetryDelayMs * Math.pow(2, attempt)
        );
        const jitter = Math.floor(Math.random() * 0.3 * backoff);
        await sleep(backoff + jitter);
        attempt += 1;
      }
    }
  }
}

const FATAL_ERRORS = new Set([
  "invalid_auth",
  "not_authed",
  "token_revoked",
  "account_inactive",
  "missing_scope",
  "invalid_arguments",
  "invalid_arg_name",
  "invalid_arg_value",
  "channel_not_found",
  "not_in_channel",
  "restricted_action",
  "invalid_array_arg",
  "invalid_charset",
  "msg_too_long",
]);

function getRetryAfterMs(err: unknown): number {
  const header = getHeaderValue(err, "retry-after");
  if (header) {
    const seconds = Number(header);
    if (!Number.isNaN(seconds) && seconds > 0) return seconds * 1000;
  }
  const data = (err as any)?.data;
  if (data?.retry_after) return Number(data.retry_after) * 1000;
  return 0;
}

function getHeaderValue(err: unknown, key: string): string | undefined {
  const lower = key.toLowerCase();
  const headers = (err as any)?.headers ?? (err as any)?.response?.headers;
  if (!headers) return undefined;
  const value = headers[lower] ?? headers[key] ?? headers[key.toUpperCase()];
  if (Array.isArray(value)) return value[0];
  return value;
}

function isRateLimitError(err: unknown): boolean {
  const status = getStatusCode(err);
  if (status === 429) return true;
  const dataError = (err as any)?.data?.error;
  return dataError === "ratelimited";
}

function isFatalSlackError(err: unknown): boolean {
  const dataError = (err as any)?.data?.error;
  return FATAL_ERRORS.has(String(dataError));
}

function isTransientError(err: unknown): boolean {
  const status = getStatusCode(err);
  if (status && status >= 500) return true;
  const code = String((err as any)?.code ?? "");
  return ["ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN"].includes(code);
}

function getStatusCode(err: unknown): number | undefined {
  const status = (err as any)?.statusCode ?? (err as any)?.response?.status;
  if (typeof status === "number") return status;
  return undefined;
}
