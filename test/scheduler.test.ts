import { afterEach, describe, expect, it, vi } from "vitest";
import { Scheduler } from "../src/scheduler";

describe("Scheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("flushes on interval when content exceeds minCharsDelta", async () => {
    vi.useFakeTimers();
    const flushes: boolean[] = [];
    let size = 0;

    const scheduler = new Scheduler(
      { flushIntervalMs: 100, minCharsDelta: 10, maxUpdatesPerMinute: 0 },
      {
        getSize: () => size,
        flush: async (force) => {
          flushes.push(force);
        },
      }
    );

    scheduler.start();
    size = 15; // Exceeds minCharsDelta of 10

    await vi.advanceTimersByTimeAsync(150);

    expect(flushes.length).toBeGreaterThan(0);
    scheduler.stop();
  });

  it("does not flush when content is below minCharsDelta", async () => {
    vi.useFakeTimers();
    const flushes: boolean[] = [];
    let size = 0;

    const scheduler = new Scheduler(
      { flushIntervalMs: 100, minCharsDelta: 10, maxUpdatesPerMinute: 0 },
      {
        getSize: () => size,
        flush: async (force) => {
          flushes.push(force);
        },
      }
    );

    scheduler.start();
    size = 5; // Below minCharsDelta

    await vi.advanceTimersByTimeAsync(150);

    expect(flushes.length).toBe(0);
    scheduler.stop();
  });

  it("force flush bypasses minCharsDelta", async () => {
    vi.useFakeTimers();
    const flushes: boolean[] = [];

    const scheduler = new Scheduler(
      { flushIntervalMs: 100, minCharsDelta: 100, maxUpdatesPerMinute: 0 },
      {
        getSize: () => 5, // Below minCharsDelta
        flush: async (force) => {
          flushes.push(force);
        },
      }
    );

    scheduler.start();
    scheduler.requestFlush(true); // force = true

    await vi.advanceTimersByTimeAsync(10);

    expect(flushes).toContain(true);
    scheduler.stop();
  });

  it("respects maxUpdatesPerMinute rate limiting", async () => {
    vi.useFakeTimers();
    const flushes: number[] = [];
    let size = 0;

    const scheduler = new Scheduler(
      { flushIntervalMs: 50, minCharsDelta: 1, maxUpdatesPerMinute: 60 }, // 1 per second
      {
        getSize: () => size,
        flush: async () => {
          flushes.push(Date.now());
        },
      }
    );

    scheduler.start();

    // Trigger multiple flushes
    size = 10;
    scheduler.requestFlush();
    await vi.advanceTimersByTimeAsync(100);

    size = 20;
    scheduler.requestFlush();
    await vi.advanceTimersByTimeAsync(100);

    // Should be rate-limited
    expect(flushes.length).toBeLessThanOrEqual(2);
    scheduler.stop();
  });

  it("stops cleanly", async () => {
    vi.useFakeTimers();
    const flushes: boolean[] = [];
    let size = 0;

    const scheduler = new Scheduler(
      { flushIntervalMs: 50, minCharsDelta: 1, maxUpdatesPerMinute: 0 },
      {
        getSize: () => size,
        flush: async (force) => {
          flushes.push(force);
        },
      }
    );

    scheduler.start();
    scheduler.stop();

    size = 100;
    await vi.advanceTimersByTimeAsync(200);

    expect(flushes.length).toBe(0); // No flushes after stop
  });

  it("calls onError when flush throws", async () => {
    vi.useFakeTimers();
    const errors: unknown[] = [];

    const scheduler = new Scheduler(
      { flushIntervalMs: 50, minCharsDelta: 1, maxUpdatesPerMinute: 0 },
      {
        getSize: () => 100,
        flush: async () => {
          throw new Error("flush failed");
        },
        onError: (err) => {
          errors.push(err);
        },
      }
    );

    scheduler.start();
    await vi.advanceTimersByTimeAsync(100);

    expect(errors.length).toBeGreaterThan(0);
    expect((errors[0] as Error).message).toBe("flush failed");
    scheduler.stop();
  });
});
