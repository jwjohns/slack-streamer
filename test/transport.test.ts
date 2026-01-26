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
});
