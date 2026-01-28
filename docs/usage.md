# Usage Guide

This guide covers common use cases and provides detailed examples for integrating `slack-streamer` into your application.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Use Case: Streaming LLM Responses](#use-case-streaming-llm-responses)
- [Use Case: Long-Running Jobs](#use-case-long-running-jobs)
- [Use Case: Slack Bot Commands](#use-case-slack-bot-commands)
- [Session Modes Explained](#session-modes-explained)
- [Error Handling](#error-handling)
- [Advanced Configuration](#advanced-configuration)

---

## Basic Usage

### Creating a Streamer

```ts
import { SlackStreamer } from "slack-streamer";
import { WebClient } from "@slack/web-api";

const client = new WebClient(process.env.SLACK_TOKEN);
const streamer = new SlackStreamer({ client });
```

### Starting a Session

```ts
const session = streamer.startSession({
  channel: "C123456789", // Channel ID (not name)
  mode: "edit",          // "edit" | "thread" | "hybrid"
});
```

### Streaming Content

```ts
session.append("Hello ");
session.append("world!");
await session.finalize();
```

---

## Use Case: Streaming LLM Responses

Stream AI/LLM output to Slack in real-time. Works with OpenAI, Anthropic, AWS Bedrock, or any streaming API.

### OpenAI Example

```ts
import { SlackStreamer } from "slack-streamer";
import { WebClient } from "@slack/web-api";
import OpenAI from "openai";

const slack = new WebClient(process.env.SLACK_TOKEN);
const openai = new OpenAI();
const streamer = new SlackStreamer({ client: slack });

async function streamToSlack(channel: string, prompt: string) {
  const session = streamer.startSession({ channel, mode: "edit" });
  
  // Show rotating status while we wait for first token
  session.startRotatingStatus();
  
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        session.stopRotatingStatus();
        session.append(content);
      }
    }
    
    await session.finalize();
  } catch (err) {
    await session.error(`Error: ${err.message}`);
  }
}
```

### Anthropic Claude Example

```ts
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

async function streamClaude(channel: string, prompt: string) {
  const session = streamer.startSession({ channel, mode: "edit" });
  session.startRotatingStatus();
  
  try {
    const stream = await anthropic.messages.stream({
      model: "claude-3-opus-20240229",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        session.stopRotatingStatus();
        session.append(event.delta.text);
      }
    }
    
    await session.finalize();
  } catch (err) {
    await session.error(`Error: ${err.message}`);
  }
}
```

### AWS Bedrock Example

```ts
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({ region: "us-east-1" });

async function streamBedrock(channel: string, prompt: string) {
  const session = streamer.startSession({ channel, mode: "hybrid" });
  session.startRotatingStatus();
  
  const command = new InvokeModelWithResponseStreamCommand({
    modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
    }),
  });
  
  const response = await bedrock.send(command);
  
  for await (const event of response.body) {
    const chunk = JSON.parse(new TextDecoder().decode(event.chunk?.bytes));
    if (chunk.delta?.text) {
      session.stopRotatingStatus();
      session.append(chunk.delta.text);
    }
  }
  
  await session.finalize();
}
```

---

## Use Case: Long-Running Jobs

Show progress for background jobs, deployments, or data processing.

```ts
async function runDeployment(channel: string, environment: string) {
  const session = streamer.startSession({ 
    channel, 
    mode: "thread" // Use thread mode to keep history
  });
  
  session.append(`🚀 Starting deployment to **${environment}**\n\n`);
  
  // Step 1
  session.setStatus("Building application...");
  await buildApp();
  session.append("✅ Build complete\n");
  
  // Step 2
  session.setStatus("Running tests...");
  const testResults = await runTests();
  session.append(`✅ Tests passed: ${testResults.passed}/${testResults.total}\n`);
  
  // Step 3
  session.setStatus("Deploying to cloud...");
  await deployToCloud(environment);
  session.append("✅ Deployed successfully\n");
  
  // Step 4
  session.setStatus("Running health checks...");
  await healthCheck();
  session.append("✅ Health checks passed\n\n");
  
  session.append(`🎉 Deployment to **${environment}** complete!`);
  await session.finalize();
}
```

---

## Use Case: Slack Bot Commands

Handle slash commands or message events in a Bolt app.

### With Bolt.js

```ts
import { App } from "@slack/bolt";
import { SlackStreamer } from "slack-streamer";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const streamer = new SlackStreamer({ client: app.client });

// Respond to /ask slash command
app.command("/ask", async ({ command, ack }) => {
  await ack();
  
  const session = streamer.startSession({
    channel: command.channel_id,
    mode: "edit",
  });
  
  session.startRotatingStatus({
    messages: ["Researching...", "Analyzing...", "Crafting response..."],
  });
  
  const response = await generateAIResponse(command.text);
  session.append(response);
  await session.finalize();
});

// Reply in threads
app.message(/^(ask|hey bot)/i, async ({ message, say }) => {
  const session = streamer.startSession({
    channel: message.channel,
    threadTs: message.ts, // Reply in thread
    mode: "edit",
  });
  
  session.startRotatingStatus();
  
  const response = await generateAIResponse(message.text);
  session.append(response);
  await session.finalize();
});

app.start(3000);
```

### With Express (Web API only)

```ts
import express from "express";
import { WebClient } from "@slack/web-api";
import { SlackStreamer } from "slack-streamer";

const app = express();
const client = new WebClient(process.env.SLACK_TOKEN);
const streamer = new SlackStreamer({ client });

app.post("/slack/events", express.json(), async (req, res) => {
  const { type, event } = req.body;
  
  if (type === "event_callback" && event.type === "message") {
    // Acknowledge immediately
    res.sendStatus(200);
    
    // Handle async
    const session = streamer.startSession({
      channel: event.channel,
      threadTs: event.ts,
      mode: "edit",
    });
    
    session.startRotatingStatus();
    const response = await generateResponse(event.text);
    session.append(response);
    await session.finalize();
  }
});
```

---

## Session Modes Explained

### `edit` Mode (Default)
Posts one message and updates it as content streams in.

**Best for:**
- Short to medium responses
- Real-time typing effect
- Clean single message output

```ts
const session = streamer.startSession({ 
  channel: "C123", 
  mode: "edit" 
});
```

### `thread` Mode
Posts each chunk as a new thread reply. Never edits messages.

**Best for:**
- Very long responses
- When you need history of changes
- Avoiding rate limits entirely

```ts
const session = streamer.startSession({ 
  channel: "C123",
  threadTs: "1234567890.123456", // Parent message
  mode: "thread" 
});
```

### `hybrid` Mode
Starts in edit mode, automatically switches to thread mode when:
- Content exceeds `hybridSwitchChars` (default: 2800)
- A 429 rate limit is encountered (if `hybridSwitchOn429: true`)

**Best for:**
- Unknown response lengths
- Graceful degradation under load

```ts
const session = streamer.startSession({ 
  channel: "C123",
  mode: "hybrid",
  hybridSwitchChars: 2000,    // Switch at 2000 chars
  hybridSwitchOn429: true,    // Switch on rate limit
});
```

---

## Error Handling

### Graceful Error Messages

```ts
try {
  session.startRotatingStatus();
  const result = await riskyOperation();
  session.append(result);
  await session.finalize();
} catch (err) {
  // Shows error status and closes session
  await session.error(`❌ Operation failed: ${err.message}`);
}
```

### Cancel Without Posting

```ts
try {
  const result = await operation();
  session.append(result);
  await session.finalize();
} catch (err) {
  session.cancel(); // Silently stops - no message sent
  throw err;
}
```

### Listen for Rate Limits

```ts
const streamer = new SlackStreamer({
  client,
  transport: {
    onRateLimit: (retryAfterMs) => {
      console.warn(`Rate limited! Retrying in ${retryAfterMs}ms`);
    },
  },
});
```

---

## Advanced Configuration

### Tuning the Scheduler

```ts
const streamer = new SlackStreamer({
  client,
  scheduler: {
    flushIntervalMs: 300,      // Check every 300ms (default: 500)
    minCharsDelta: 50,         // Flush after 50 chars (default: 24)
    maxUpdatesPerMinute: 60,   // Cap at 60 updates/min (default: 80)
  },
});
```

### Transport Retry Settings

```ts
const streamer = new SlackStreamer({
  client,
  transport: {
    maxRetries: 3,            // Retry up to 3 times (default: 5)
    baseRetryDelayMs: 1000,   // Start with 1s delay (default: 500)
    maxRetryDelayMs: 10000,   // Cap at 10s delay (default: 8000)
  },
});
```

### Per-Session Scheduler Override

```ts
const session = streamer.startSession({
  channel: "C123",
  mode: "edit",
  scheduler: {
    flushIntervalMs: 100, // Faster updates for this session
  },
});
```

### Custom Rotating Status Messages

```ts
import { DEFAULT_STATUS_MESSAGES } from "slack-streamer";

// Use defaults
session.startRotatingStatus();

// Custom messages
session.startRotatingStatus({
  messages: [
    "Querying database...",
    "Processing results...",
    "Formatting output...",
  ],
  intervalMs: 1500,
  shuffle: false,
});

// Append to defaults
session.startRotatingStatus({
  messages: [...DEFAULT_STATUS_MESSAGES, "Custom status..."],
});
```
