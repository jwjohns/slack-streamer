import type { SlackPostMessageArgs, SlackUpdateMessageArgs, SlackWebClient } from "../src";

type PostHandler = (args: SlackPostMessageArgs) => Promise<any>;
type UpdateHandler = (args: SlackUpdateMessageArgs) => Promise<any>;

export function createMockClient() {
  const postCalls: SlackPostMessageArgs[] = [];
  const updateCalls: SlackUpdateMessageArgs[] = [];

  let postHandler: PostHandler = async (args) => {
    postCalls.push(args);
    return {
      ok: true,
      ts: String(postCalls.length),
      channel: args.channel,
    };
  };

  let updateHandler: UpdateHandler = async (args) => {
    updateCalls.push(args);
    return {
      ok: true,
      ts: args.ts,
      channel: args.channel,
    };
  };

  const client: SlackWebClient = {
    chat: {
      postMessage: async (args) => postHandler(args),
      update: async (args) => updateHandler(args),
    },
  };

  return {
    client,
    postCalls,
    updateCalls,
    setPostHandler: (handler: PostHandler) => {
      postHandler = async (args) => {
        postCalls.push(args);
        return handler(args);
      };
    },
    setUpdateHandler: (handler: UpdateHandler) => {
      updateHandler = async (args) => {
        updateCalls.push(args);
        return handler(args);
      };
    },
  };
}

export function rateLimitError(retryAfterSeconds = 1) {
  const err: any = new Error("rate limited");
  err.statusCode = 429;
  err.headers = {
    "retry-after": String(retryAfterSeconds),
  };
  err.data = {
    error: "ratelimited",
  };
  return err;
}
