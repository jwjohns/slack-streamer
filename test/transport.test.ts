import { afterEach, describe, expect, it, vi } from "vitest";
import { SlackTransport } from "../src";
import { createMockClient, rateLimitError } from "./helpers";

describe("SlackTransport", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries on 429 using retry-after", async () => {
    vi.useFakeTimers();
    const { client, postCalls, setPostHandler } = createMockClient();

    let attempt = 0;
    setPostHandler(async () => {
      attempt += 1;
      if (attempt === 1) {
        throw rateLimitError(1);
      }
      return { ok: true, ts: "1", channel: "C1" };
    });

    const onRateLimit = vi.fn();
    const transport = new SlackTransport(client, { onRateLimit });

    const promise = transport.postMessage({ channel: "C1", text: "hi" });

    await vi.advanceTimersByTimeAsync(999);
    expect(postCalls.length).toBe(1);

    await vi.advanceTimersByTimeAsync(2);
    await promise;

    expect(postCalls.length).toBe(2);
    expect(onRateLimit).toHaveBeenCalledWith(1000);
  });

  it("throws immediately on fatal errors", async () => {
    const { client, setPostHandler } = createMockClient();

    setPostHandler(async () => {
      const err: any = new Error("channel_not_found");
      err.data = { error: "channel_not_found" };
      throw err;
    });

    const transport = new SlackTransport(client, { maxRetries: 3 });

    await expect(transport.postMessage({ channel: "C1", text: "hi" }))
      .rejects.toThrow("channel_not_found");
  });

  it("throws immediately on invalid_auth", async () => {
    const { client, setPostHandler } = createMockClient();

    setPostHandler(async () => {
      const err: any = new Error("invalid_auth");
      err.data = { error: "invalid_auth" };
      throw err;
    });

    const transport = new SlackTransport(client);

    await expect(transport.postMessage({ channel: "C1", text: "hi" }))
      .rejects.toThrow("invalid_auth");
  });

  it("retries on transient 5xx errors", async () => {
    vi.useFakeTimers();
    const { client, postCalls, setPostHandler } = createMockClient();

    let attempt = 0;
    setPostHandler(async () => {
      attempt += 1;
      if (attempt === 1) {
        const err: any = new Error("server error");
        err.statusCode = 500;
        throw err;
      }
      return { ok: true, ts: "1", channel: "C1" };
    });

    const transport = new SlackTransport(client, { baseRetryDelayMs: 100 });
    const promise = transport.postMessage({ channel: "C1", text: "hi" });

    await vi.advanceTimersByTimeAsync(200);
    await promise;

    expect(postCalls.length).toBe(2);
  });

  it("retries on network errors", async () => {
    vi.useFakeTimers();
    const { client, postCalls, setPostHandler } = createMockClient();

    let attempt = 0;
    setPostHandler(async () => {
      attempt += 1;
      if (attempt === 1) {
        const err: any = new Error("connection reset");
        err.code = "ECONNRESET";
        throw err;
      }
      return { ok: true, ts: "1", channel: "C1" };
    });

    const transport = new SlackTransport(client, { baseRetryDelayMs: 100 });
    const promise = transport.postMessage({ channel: "C1", text: "hi" });

    await vi.advanceTimersByTimeAsync(200);
    await promise;

    expect(postCalls.length).toBe(2);
  });

  it("throws after max retries exceeded", async () => {
    vi.useFakeTimers();
    const { client, postCalls, setPostHandler } = createMockClient();

    setPostHandler(async () => {
      throw rateLimitError(0.05); // 50ms
    });

    const transport = new SlackTransport(client, { maxRetries: 2, baseRetryDelayMs: 50 });

    let error: Error | null = null;
    const promise = transport.postMessage({ channel: "C1", text: "hi" }).catch((e) => {
      error = e;
    });

    // Advance through all retries (3 attempts * 50ms each + buffer)
    await vi.advanceTimersByTimeAsync(300);
    await promise;

    expect(error).not.toBeNull();
    expect(error!.message).toBe("rate limited");
    expect(postCalls.length).toBe(3); // 1 initial + 2 retries
  });

  it("updates messages with retry on failure", async () => {
    vi.useFakeTimers();
    const { client, updateCalls, setUpdateHandler } = createMockClient();

    let attempt = 0;
    setUpdateHandler(async (args) => {
      attempt += 1;
      if (attempt === 1) {
        const err: any = new Error("server error");
        err.statusCode = 503;
        throw err;
      }
      return { ok: true, ts: args.ts, channel: args.channel };
    });

    const transport = new SlackTransport(client, { baseRetryDelayMs: 100 });
    const promise = transport.updateMessage({ channel: "C1", ts: "123", text: "updated" });

    await vi.advanceTimersByTimeAsync(200);
    await promise;

    expect(updateCalls.length).toBe(2);
  });

  it("respects maxRetryDelayMs cap", async () => {
    vi.useFakeTimers();
    const { client, postCalls, setPostHandler } = createMockClient();

    let attempts = 0;
    setPostHandler(async () => {
      attempts += 1;
      if (attempts === 1) {
        const err: any = new Error("server error");
        err.statusCode = 500;
        throw err;
      }
      return { ok: true, ts: "1", channel: "C1" };
    });

    const transport = new SlackTransport(client, {
      baseRetryDelayMs: 100,
      maxRetryDelayMs: 200,
      maxRetries: 3,
    });

    const promise = transport.postMessage({ channel: "C1", text: "hi" });

    // Advance enough time for retry with jitter
    await vi.advanceTimersByTimeAsync(500);
    await promise;

    expect(postCalls.length).toBe(2);
    expect(attempts).toBe(2);
  });
});

