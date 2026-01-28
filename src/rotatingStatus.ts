/**
 * Default rotating status messages inspired by The Sims and Claude Code.
 */
export const DEFAULT_STATUS_MESSAGES = [
  "Thinking...",
  "Pondering...",
  "Contemplating reality...",
  "Reticulating splines...",
  "Consulting the oracle...",
  "Gathering thoughts...",
  "Processing...",
  "Computing possibilities...",
  "Analyzing...",
  "Synthesizing response...",
];

export interface RotatingStatusOptions {
  /** Status messages to cycle through */
  messages?: string[];
  /** Interval between status changes in ms (default: 2500) */
  intervalMs?: number;
  /** Whether to shuffle messages randomly (default: false) */
  shuffle?: boolean;
}

export class RotatingStatus {
  private readonly messages: string[];
  private readonly intervalMs: number;
  private readonly onStatusChange: (status: string) => void;

  private timer: ReturnType<typeof setInterval> | null = null;
  private index = 0;

  constructor(onStatusChange: (status: string) => void, options: RotatingStatusOptions = {}) {
    this.onStatusChange = onStatusChange;
    this.intervalMs = options.intervalMs ?? 2500;

    let messages = options.messages ?? DEFAULT_STATUS_MESSAGES;
    if (options.shuffle) {
      messages = shuffleArray([...messages]);
    }
    this.messages = messages;
  }

  start() {
    if (this.timer) return;

    // Show first status immediately
    this.onStatusChange(this.messages[this.index]);

    this.timer = setInterval(() => {
      this.index = (this.index + 1) % this.messages.length;
      this.onStatusChange(this.messages[this.index]);
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  isRunning() {
    return this.timer !== null;
  }
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
