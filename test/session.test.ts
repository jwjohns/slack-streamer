import { afterEach, describe, expect, it, vi } from "vitest";
import { SlackStreamer } from "../src";
import { createMockClient, rateLimitError } from "./helpers";

describe("Session", () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  it("throttles updates", async () => {
    vi.useFakeTimers();
    const { client, postCalls, updateCalls } = createMockClient();
    const streamer = new SlackStreamer({ client });

    const session = streamer.startSession({
      channel: "C1",
      mode: "edit",
      scheduler: { flushIntervalMs: 50, minCharsDelta: 10, maxUpdatesPerMinute: 0 },
    });

    session.append("12345");
    session.append("67890");
    session.append("abcde");

    await vi.advanceTimersByTimeAsync(60);
    await session.finalize();

    expect(postCalls.length).toBe(1);
    expect(updateCalls.length).toBeLessThan(3);
  });

  it("posts diffs in thread mode", async () => {
    vi.useFakeTimers();
    const { client, postCalls } = createMockClient();
    const streamer = new SlackStreamer({ client });

    const session = streamer.startSession({
      channel: "C1",
      mode: "thread",
      threadTs: "parent",
      scheduler: { flushIntervalMs: 10, minCharsDelta: 1, maxUpdatesPerMinute: 0 },
    });

    session.append("Hello");
    await vi.advanceTimersByTimeAsync(20);

    session.append(" world");
    await vi.advanceTimersByTimeAsync(20);

    await session.finalize();

    expect(postCalls.length).toBeGreaterThanOrEqual(2);
    expect(postCalls[0].text).toBe("Hello");
    expect(postCalls[1].text).toBe(" world");
    expect(postCalls[1].thread_ts).toBe("parent");
  });

  it("switches to thread mode on size in hybrid", async () => {
    vi.useFakeTimers();
    const { client, postCalls, updateCalls } = createMockClient();
    const streamer = new SlackStreamer({ client });

    const session = streamer.startSession({
      channel: "C1",
      mode: "hybrid",
      hybridSwitchChars: 5,
      scheduler: { flushIntervalMs: 10, minCharsDelta: 1, maxUpdatesPerMinute: 0 },
    });

    session.append("123456");
    await vi.advanceTimersByTimeAsync(20);
    await session.finalize();

    expect(postCalls.length).toBe(1);
    expect(updateCalls.length).toBe(0);
  });

  it("switches to thread mode on 429 in hybrid", async () => {
    vi.useFakeTimers();
    const { client, postCalls, updateCalls, setUpdateHandler } = createMockClient();
    const streamer = new SlackStreamer({
      client,
      transport: { maxRetries: 0 },
    });

    let updateAttempt = 0;
    setUpdateHandler(async () => {
      updateAttempt += 1;
      if (updateAttempt === 1) {
        throw rateLimitError(1);
      }
      return { ok: true, ts: "1", channel: "C1" };
    });

    const session = streamer.startSession({
      channel: "C1",
      mode: "hybrid",
      hybridSwitchOn429: true,
      scheduler: { flushIntervalMs: 10, minCharsDelta: 1, maxUpdatesPerMinute: 0 },
    });

    session.append("Hello");
    await vi.advanceTimersByTimeAsync(20);

    session.append(" world");
    await vi.advanceTimersByTimeAsync(20);

    await session.finalize();

    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    expect(postCalls.length).toBeGreaterThanOrEqual(2);
    expect(postCalls[postCalls.length - 1].thread_ts).toBeDefined();
  });
});
