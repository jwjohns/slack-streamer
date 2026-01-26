# slack-streamer

Lightweight helpers for streaming text updates into Slack without overthinking rate limits.

## Status

Early scaffold. APIs may change.

## Install

```bash
npm install slack-streamer
```

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
for (const chunk of ["Hello", " world", "!"]) {
  session.append(chunk);
}
await session.finalize();
```

## Roadmap

- Core streaming sessions with edit, thread, and hybrid modes.
- Adapters for async iterables and Node streams.
- Examples for Slack Bolt and socket mode.
- Tests for throttling, 429 handling, and hybrid switching.

## License

MIT
