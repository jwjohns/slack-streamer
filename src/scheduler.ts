import { minIntervalMs } from "./rateLimit";

export interface SchedulerOptions {
  flushIntervalMs?: number;
  minCharsDelta?: number;
  maxUpdatesPerMinute?: number;
}

export interface SchedulerCallbacks {
  getSize: () => number;
  flush: (force: boolean) => Promise<void>;
  onError?: (err: unknown) => void;
}

export class Scheduler {
  private readonly flushIntervalMs: number;
  private readonly minCharsDelta: number;
  private readonly minIntervalMs: number;
  private readonly getSize: () => number;
  private readonly flush: (force: boolean) => Promise<void>;
  private readonly onError?: (err: unknown) => void;

  private lastFlushSize = 0;
  private lastFlushAt = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private rateTimer: ReturnType<typeof setTimeout> | null = null;
  private flushing = false;
  private forcePending = false;

  constructor(options: SchedulerOptions, callbacks: SchedulerCallbacks) {
    this.flushIntervalMs = options.flushIntervalMs ?? 500;
    this.minCharsDelta = options.minCharsDelta ?? 24;
    this.minIntervalMs = minIntervalMs(options.maxUpdatesPerMinute ?? 80);
    this.getSize = callbacks.getSize;
    this.flush = callbacks.flush;
    this.onError = callbacks.onError;
  }

  start() {
    if (this.interval) return;
    this.interval = setInterval(() => this.maybeFlush(), this.flushIntervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.rateTimer) {
      clearTimeout(this.rateTimer);
      this.rateTimer = null;
    }
  }

  requestFlush(force = false) {
    if (force) this.forcePending = true;
    this.maybeFlush();
  }

  private maybeFlush() {
    if (this.flushing) return;

    const size = this.getSize();
    const sizeDelta = size - this.lastFlushSize;
    const shouldFlush = this.forcePending || sizeDelta >= this.minCharsDelta;
    if (!shouldFlush) return;

    const now = Date.now();
    const waitMs = Math.max(0, this.minIntervalMs - (now - this.lastFlushAt));
    if (waitMs > 0) {
      if (!this.rateTimer) {
        this.rateTimer = setTimeout(() => {
          this.rateTimer = null;
          this.maybeFlush();
        }, waitMs);
      }
      return;
    }

    this.flushing = true;
    const force = this.forcePending;
    this.forcePending = false;

    void this.flush(force)
      .catch((err) => this.onError?.(err))
      .finally(() => {
        this.flushing = false;
        this.lastFlushAt = Date.now();
        this.lastFlushSize = this.getSize();
        this.maybeFlush();
      });
  }
}
