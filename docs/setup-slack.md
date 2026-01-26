# Slack App Setup (Local Testing)

This guide walks you through creating a Slack app and getting a token that can post messages.

## 1) Create a Slack app

1. Go to https://api.slack.com/apps
2. Click **Create New App** → **From scratch**
3. Name: `slack-streamer-test` (or anything)
4. Choose your workspace

## 2) Enable a bot token

1. In the app sidebar, go to **OAuth & Permissions**
2. Under **Scopes → Bot Token Scopes**, add:
   - `chat:write`
   - `channels:read` (optional, if you need to look up channel IDs)
   - `groups:read` (optional, for private channels)
3. Click **Install to Workspace**
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

## 3) Add the bot to a channel

In Slack, open the channel you want to post to and run:

```
/invite @your-bot-name
```

## 4) Get the channel ID

- Right-click the channel → **View channel details** → **About** → copy **Channel ID**
- Or use `channels.list` with the Slack API explorer

## 5) Run the local test

Create a simple test script (see `README.md`) and run:

```bash
SLACK_TOKEN=xoxb-your-token SLACK_CHANNEL=C12345678 npm run local:test
```

## Troubleshooting

- **not_in_channel** → Make sure the bot is invited to the channel.
- **missing_scope** → Add scopes and reinstall the app.
- **ratelimited** → The library will back off; reduce update frequency if needed.
