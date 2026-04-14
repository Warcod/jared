export type SlackClient = {
  postMessage(input: SlackPostMessageInput): Promise<void>;
};

export type SlackPostMessageInput = {
  channel: string;
  text: string;
  blocks?: unknown[];
};

type SlackPostMessageResponse = {
  ok: boolean;
  error?: string;
};

export class SlackApiClient implements SlackClient {
  constructor(private readonly botToken: string) {}

  async postMessage(input: SlackPostMessageInput): Promise<void> {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.botToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Slack API returned HTTP ${response.status}.`);
    }

    const body = (await response.json()) as SlackPostMessageResponse;

    if (!body.ok) {
      throw new Error(`Slack API rejected chat.postMessage: ${body.error ?? "unknown_error"}`);
    }
  }
}
