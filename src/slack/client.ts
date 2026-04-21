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

export class SlackApiError extends Error {
  readonly statusCode?: number;
  readonly slackError?: string;

  constructor(
    message: string,
    options: {
      cause?: unknown;
      slackError?: string;
      statusCode?: number;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "SlackApiError";
    this.statusCode = options.statusCode;
    this.slackError = options.slackError;
  }
}

export class SlackApiClient implements SlackClient {
  constructor(private readonly botToken: string) {}

  async postMessage(input: SlackPostMessageInput): Promise<void> {
    let response: Response;

    try {
      response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.botToken}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(input),
      });
    } catch (error) {
      throw new SlackApiError("Failed to reach Slack API.", { cause: error });
    }

    if (!response.ok) {
      throw new SlackApiError(`Slack API returned HTTP ${response.status}.`, {
        statusCode: response.status,
      });
    }

    const body = (await response.json()) as SlackPostMessageResponse;

    if (!body.ok) {
      throw new SlackApiError(`Slack API rejected chat.postMessage: ${body.error ?? "unknown_error"}`, {
        slackError: body.error,
        statusCode: response.status,
      });
    }
  }
}
