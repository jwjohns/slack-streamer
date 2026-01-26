import { SchedulerOptions } from "./scheduler";
import { Session, SessionOptions } from "./session";
import { SlackTransport, SlackTransportOptions, SlackWebClient } from "./transport";

export interface SlackStreamerOptions {
  client: SlackWebClient;
  transport?: SlackTransportOptions;
  scheduler?: SchedulerOptions;
}

export class SlackStreamer {
  private readonly transport: SlackTransport;
  private readonly schedulerDefaults: SchedulerOptions;

  constructor(options: SlackStreamerOptions) {
    this.transport = new SlackTransport(options.client, options.transport);
    this.schedulerDefaults = options.scheduler ?? {};
  }

  startSession(options: SessionOptions) {
    return new Session(this.transport, {
      ...options,
      scheduler: { ...this.schedulerDefaults, ...(options.scheduler ?? {}) },
    });
  }
}
