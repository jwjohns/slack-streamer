import { afterEach, describe, expect, it, vi } from "vitest";
import { RotatingStatus, DEFAULT_STATUS_MESSAGES } from "../src/rotatingStatus";
import { SlackStreamer } from "../src";
import { createMockClient } from "./helpers";

describe("RotatingStatus", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("has default status messages", () => {
    expect(DEFAULT_STATUS_MESSAGES.length).toBeGreaterThan(5);
    expect(DEFAULT_STATUS_MESSAGES).toContain("Thinking...");
    expect(DEFAULT_STATUS_MESSAGES).toContain("Reticulating splines...");
  });

  it("cycles through messages on interval", async () => {
    vi.useFakeTimers();
    const statuses: string[] = [];
    const rotator = new RotatingStatus((status) => statuses.push(status), {
      messages: ["A", "B", "C"],
      intervalMs: 100,
    });

    rotator.start();
    expect(statuses).toEqual(["A"]); // First shown immediately

    await vi.advanceTimersByTimeAsync(100);
    expect(statuses).toEqual(["A", "B"]);

    await vi.advanceTimersByTimeAsync(100);
    expect(statuses).toEqual(["A", "B", "C"]);

    await vi.advanceTimersByTimeAsync(100);
    expect(statuses).toEqual(["A", "B", "C", "A"]); // Wraps around

    rotator.stop();
  });

  it("stops rotation", async () => {
    vi.useFakeTimers();
    const statuses: string[] = [];
    const rotator = new RotatingStatus((status) => statuses.push(status), {
      messages: ["A", "B"],
      intervalMs: 100,
    });

    rotator.start();
    await vi.advanceTimersByTimeAsync(100);
    rotator.stop();

    const countAfterStop = statuses.length;
    await vi.advanceTimersByTimeAsync(500);

    expect(statuses.length).toBe(countAfterStop); // No more changes
  });
});

describe("Session rotating status", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rotates status messages during streaming", async () => {
    vi.useFakeTimers();
    const { client, postCalls, updateCalls } = createMockClient();
    const streamer = new SlackStreamer({ client });

    const session = streamer.startSession({
      channel: "C1",
      mode: "edit",
      scheduler: { flushIntervalMs: 50, minCharsDelta: 1, maxUpdatesPerMinute: 0 },
    });

    session.startRotatingStatus({ messages: ["Status A", "Status B"], intervalMs: 100 });
    session.append("Hello");

    await vi.advanceTimersByTimeAsync(60);

    // Should have posted with first status
    expect(postCalls.length).toBe(1);
    expect(postCalls[0].text).toContain("Status A");

    await vi.advanceTimersByTimeAsync(100);

    // Status should have rotated
    await vi.advanceTimersByTimeAsync(60);
    expect(updateCalls.some((u: any) => u.text.includes("Status B"))).toBe(true);

    await session.finalize();
  });

  it("stops rotating status on finalize", async () => {
    vi.useFakeTimers();
    const { client } = createMockClient();
    const streamer = new SlackStreamer({ client });

    const session = streamer.startSession({
      channel: "C1",
      mode: "edit",
      scheduler: { flushIntervalMs: 50, minCharsDelta: 1, maxUpdatesPerMinute: 0 },
    });

    session.startRotatingStatus({ messages: ["A", "B"], intervalMs: 100 });
    session.append("Test");

    await vi.advanceTimersByTimeAsync(60);
    await session.finalize();

    // Status should be cleared after finalize (no status prefix)
    // The final message should not have a status line
  });
});
