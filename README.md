<p align="center">
  <h1 align="center">slack-streamer</h1>
  <p align="center">
    <strong>Stream text updates into Slack with throttling, rate-limit backoff, and session modes.</strong>
  </p>
  <p align="center">
    <a href="https://www.npmjs.com/package/slack-streamer"><img src="https://img.shields.io/npm/v/slack-streamer.svg?style=flat-square" alt="npm version"></a>
    <a href="https://github.com/jwjohns/slack-streamer/actions"><img src="https://img.shields.io/github/actions/workflow/status/jwjohns/slack-streamer/ci.yml?branch=main&style=flat-square" alt="CI"></a>
    <a href="https://github.com/jwjohns/slack-streamer/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/slack-streamer.svg?style=flat-square" alt="MIT License"></a>
    <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg?style=flat-square" alt="Node.js">
    <img src="https://img.shields.io/badge/TypeScript-%3E%3D5.0-blue.svg?style=flat-square" alt="TypeScript">
  </p>
</p>

---

Minimal Slack streaming library for AI/LLM responses. Perfect for streaming ChatGPT, Claude, or any LLM output to Slack in real-time with automatic throttling and graceful rate-limit handling.

## Why

Slack APIs are easy to call but easy to over-call. `slack-streamer` gives you a
minimal session abstraction that handles update cadence, thread switching, and
rate-limit backoff without pulling in heavy abstractions.

## Install

```bash
npm install slack-streamer
```

<details>
<summary>pnpm / yarn / bun</summary>

```bash
pnpm add slack-streamer
yarn add slack-streamer
bun add slack-streamer
```
</details>

## Features

- **Stream text in real-time** — Perfect for LLM/AI responses
- **Three session modes** — `edit`, `thread`, and `hybrid`
- **Smart throttling** — Batches updates to avoid rate limits
- **Automatic retry** — Handles 429s and transient errors gracefully
- **Rotating status** — Sims-style "Thinking...", "Pondering..." animations
- **Works with Bolt** — Drop-in compatible with `@slack/bolt`
- **Zero config** — Sensible defaults, customize when needed
- **Fully tested** — 43 tests across all modules

## Documentation

- **[Usage Guide](./docs/usage.md)** — Detailed examples and use cases
- **[Slack Setup](./docs/setup-slack.md)** — Creating your Slack app

## Quick Start

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

### `session.startRotatingStatus(options?)`
Start cycling through status messages (Sims/Claude-style "Thinking...", "Pondering...").

```ts
// Use fun defaults
session.startRotatingStatus();

// Or provide your own messages
session.startRotatingStatus({
  messages: ["Analyzing...", "Computing...", "Almost there..."],
  intervalMs: 2000,  // rotate every 2 seconds
  shuffle: true,     // randomize order
});
```

### `session.stopRotatingStatus()`
Stop the rotating status animation. Also called automatically by `finalize()`.

## Using with Bolt

Works seamlessly with Bolt apps:

```ts
import { App } from "@slack/bolt";
import { SlackStreamer } from "slack-streamer";

const app = new App({ token: "xoxb-...", signingSecret: "..." });
const streamer = new SlackStreamer({ client: app.client });

app.message("ask", async ({ message }) => {
  const session = streamer.startSession({
    channel: message.channel,
    threadTs: message.ts,
    mode: "edit",
  });
  
  session.startRotatingStatus(); // "Thinking...", "Pondering..."
  for await (const chunk of someAIStream()) {
    session.append(chunk);
  }
  await session.finalize();
});
```


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
