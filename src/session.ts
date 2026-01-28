import { TextBuffer } from "./buffer";
import { Scheduler, SchedulerOptions } from "./scheduler";
import { diffAppend } from "./util/diff";
import { SlackTransport } from "./transport";
import { RotatingStatus, RotatingStatusOptions } from "./rotatingStatus";

export type SessionMode = "edit" | "thread" | "hybrid";

export interface SessionOptions {
  channel: string;
  threadTs?: string;
  mode?: SessionMode;
  hybridSwitchChars?: number;
  hybridSwitchOn429?: boolean;
  scheduler?: SchedulerOptions;
}

export class Session {
  private readonly transport: SlackTransport;
  private readonly channel: string;
  private readonly hybridSwitchChars: number;
  private readonly hybridSwitchOn429: boolean;
  private mode: SessionMode;

  private threadTs?: string;
  private messageTs?: string;
  private lastSentText = "";

  private readonly buffer = new TextBuffer();
  private readonly scheduler: Scheduler;
  private flushChain: Promise<void> = Promise.resolve();
  private closed = false;
  private lastError: unknown;
  private threadModeActive = false;
  private rotatingStatus: RotatingStatus | null = null;

  constructor(transport: SlackTransport, options: SessionOptions) {
    this.transport = transport;
    this.channel = options.channel;
    this.threadTs = options.threadTs;
    this.mode = options.mode ?? "edit";
    this.hybridSwitchChars = options.hybridSwitchChars ?? 2800;
    this.hybridSwitchOn429 = options.hybridSwitchOn429 ?? true;

    this.scheduler = new Scheduler(options.scheduler ?? {}, {
      getSize: () => this.buffer.getSize(),
      flush: (force) => this.enqueueFlush(force),
      onError: (err) => {
        this.lastError = err;
      },
    });

    this.scheduler.start();
  }

  append(chunk: string) {
    if (this.closed) return;
    this.buffer.append(chunk);
    this.scheduler.requestFlush();
  }

  setStatus(status: string) {
    if (this.closed) return;
    this.buffer.setStatus(status);
    this.scheduler.requestFlush(true);
  }

  clearStatus() {
    if (this.closed) return;
    this.stopRotatingStatus();
    this.buffer.clearStatus();
    this.scheduler.requestFlush(true);
  }

  /**
   * Start cycling through status messages (e.g., "Thinking...", "Pondering...").
   * Uses fun default messages if none provided.
   */
  startRotatingStatus(options?: RotatingStatusOptions) {
    if (this.closed) return;
    this.stopRotatingStatus();
    this.rotatingStatus = new RotatingStatus(
      (status) => this.setStatus(status),
      options
    );
    this.rotatingStatus.start();
  }

  /**
   * Stop the rotating status animation and clear the status line.
   */
  stopRotatingStatus() {
    if (this.rotatingStatus) {
      this.rotatingStatus.stop();
      this.rotatingStatus = null;
    }
  }

  async finalize() {
    if (this.closed) return;
    this.stopRotatingStatus();
    this.buffer.clearStatus();
    this.scheduler.stop();
    await this.enqueueFlush(true);
    this.closed = true;
    if (this.lastError) throw this.lastError;
  }

  cancel() {
    if (this.closed) return;
    this.stopRotatingStatus();
    this.scheduler.stop();
    this.closed = true;
  }

  async error(message: string) {
    this.stopRotatingStatus();
    this.setStatus(message);
    await this.enqueueFlush(true);
    this.closed = true;
  }

  private enqueueFlush(force: boolean): Promise<void> {
    this.flushChain = this.flushChain
      .catch(() => { })
      .then(() => this.flush(force));
    return this.flushChain;
  }

  private async flush(force: boolean) {
    if (this.closed) return;
    const text = this.buffer.getText();
    if (!force && text.length === 0) return;

    if (this.mode === "hybrid" && !this.threadModeActive) {
      if (text.length >= this.hybridSwitchChars) {
        this.switchToThreadMode();
      }
    }

    if (this.threadModeActive || this.mode === "thread") {
      await this.flushThread(force);
      return;
    }

    try {
      await this.flushEdit(force);
    } catch (err) {
      if (this.mode === "hybrid" && this.hybridSwitchOn429 && isRateLimitError(err)) {
        this.switchToThreadMode();
        await this.flushThread(true);
        return;
      }
      throw err;
    }
  }

  private switchToThreadMode() {
    this.threadModeActive = true;
    if (!this.threadTs && this.messageTs) {
      this.threadTs = this.messageTs;
    }
  }

  private async flushEdit(force: boolean) {
    const rendered = this.buffer.render();
    if (rendered === this.lastSentText && !force) return;

    if (!this.messageTs) {
      const res = await this.transport.postMessage({
        channel: this.channel,
        text: rendered,
        thread_ts: this.threadTs,
      });
      this.messageTs = res.ts;
      if (!this.threadTs && res.ts) this.threadTs = res.ts;
    } else {
      await this.transport.updateMessage({
        channel: this.channel,
        ts: this.messageTs,
        text: rendered,
      });
    }

    this.lastSentText = rendered;
  }

  private async flushThread(force: boolean) {
    const text = this.buffer.getText();
    if (text === this.lastSentText && !force) return;

    if (!this.threadTs) {
      const res = await this.transport.postMessage({
        channel: this.channel,
        text,
      });
      this.threadTs = res.ts;
      this.messageTs = res.ts;
      this.lastSentText = text;
      return;
    }

    const diff = diffAppend(this.lastSentText, text);
    if (!diff) return;

    await this.transport.postMessage({
      channel: this.channel,
      text: diff,
      thread_ts: this.threadTs,
    });

    this.lastSentText = text;
  }
}

function isRateLimitError(err: unknown): boolean {
  const status = (err as any)?.statusCode ?? (err as any)?.response?.status;
  if (status === 429) return true;
  return (err as any)?.data?.error === "ratelimited";
}
