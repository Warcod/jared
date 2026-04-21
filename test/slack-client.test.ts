import { afterEach, describe, expect, it, vi } from "vitest";
import { SlackApiClient } from "../src/slack/client.js";

describe("SlackApiClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("surfaces Slack application errors with the Slack error code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: false, error: "channel_not_found" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        }),
      ),
    );

    const client = new SlackApiClient("xoxb-test");

    await expect(client.postMessage({ channel: "C123", text: "hello" })).rejects.toMatchObject({
      name: "SlackApiError",
      slackError: "channel_not_found",
      statusCode: 200,
    });
  });

  it("surfaces transport failures when Slack cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND slack.com")));

    const client = new SlackApiClient("xoxb-test");

    await expect(client.postMessage({ channel: "C123", text: "hello" })).rejects.toMatchObject({
      name: "SlackApiError",
      message: "Failed to reach Slack API.",
    });
  });
});
