import { SlackStreamer } from "../src";
import { WebClient } from "@slack/web-api";

const token = process.env.SLACK_TOKEN;
const channel = process.env.SLACK_CHANNEL;

if (!token || !channel) {
  throw new Error("Set SLACK_TOKEN and SLACK_CHANNEL in your env.");
}

const client = new WebClient(token);
const streamer = new SlackStreamer({ client });

const session = streamer.startSession({
  channel,
  mode: "edit",
});

session.setStatus("Thinking...");

for (const chunk of ["Hello", " from ", "slack-streamer", "!"]) {
  session.append(chunk);
}

await session.finalize();
