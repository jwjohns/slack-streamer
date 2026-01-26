# slack-streamer

Stream text updates into Slack with throttling, session modes, and sane defaults.

## Why

Slack APIs are easy to call but easy to over-call. `slack-streamer` gives you a
minimal session abstraction that handles update cadence, thread switching, and
rate-limit backoff without pulling in heavy abstractions.

## Install

```bash
npm install slack-streamer
```

`@slack/web-api` is a peer dependency, so install it in your app too:

```bash
npm install @slack/web-api
```

## Setup Slack

See `docs/setup-slack.md` for a quick guide to creating an app token and
inviting your bot to a channel.

## Quick start

```ts
import { SlackStreamer } from "slack-streamer";
import { WebClient } from "@slack/web-api";

const client = new WebClient(process.env.SLACK_TOKEN);
const streamer = new SlackStreamer({ client });

const session = streamer.startSession({
  channel: "C123",
  mode: "edit",
});

session.setStatus("Thinking...");
session.append("Hello");
session.append(" world");
await session.finalize();
```

## Session modes

- `edit`: post once, then update the same message
- `thread`: post diffs as thread replies (no updates)
- `hybrid`: start in edit mode, switch to thread based on size or 429

## API

### `new SlackStreamer(options)`

```ts
type SlackStreamerOptions = {
  client: SlackWebClient;
  transport?: SlackTransportOptions;
  scheduler?: SchedulerOptions;
};
```

### `streamer.startSession(options)`

```ts
type SessionOptions = {
  channel: string;
  threadTs?: string;
  mode?: "edit" | "thread" | "hybrid";
  hybridSwitchChars?: number;
  hybridSwitchOn429?: boolean;
  scheduler?: SchedulerOptions;
};
```

### `session.append(text)`
Append a chunk of text and let the scheduler decide when to flush.

### `session.setStatus(text)`
Prepends a status line to the rendered message (`_Thinking..._`).

### `session.finalize()`
Flush any pending output and stop the scheduler.

### `session.cancel()`
Stop without flushing.

## Scheduler options

```ts
type SchedulerOptions = {
  flushIntervalMs?: number; // default 500
  minCharsDelta?: number;   // default 24
  maxUpdatesPerMinute?: number; // default 80
};
```

## Transport options

```ts
type SlackTransportOptions = {
  maxRetries?: number;      // default 5
  baseRetryDelayMs?: number; // default 500
  maxRetryDelayMs?: number;  // default 8000
  onRateLimit?: (retryAfterMs: number) => void;
};
```

## Local testing (no Slack needed)

```bash
npm install
npm test
```

## Local testing (with Slack)

A runnable example is in `examples/local-test.ts`.

```bash
npm install
npm install -D ts-node
SLACK_TOKEN=xoxb-your-token SLACK_CHANNEL=C12345678 \
  npx ts-node examples/local-test.ts
```

## Development

```bash
npm run build
```

## License

MIT
