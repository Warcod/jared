import type { JaredEvent } from "../events/types.js";

type Env = Record<string, string | undefined>;

export type AppConfig = {
  stripeWebhookSecret: string;
  slackBotToken: string;
  slackChannelByEvent: Partial<Record<JaredEvent["type"], string>>;
  logLevel: "debug" | "info" | "warn" | "error";
};

const required = (env: Env, key: string): string => {
  const value = env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const parseChannelMap = (raw: string): AppConfig["slackChannelByEvent"] => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("SLACK_CHANNEL_BY_EVENT must be valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("SLACK_CHANNEL_BY_EVENT must be a JSON object.");
  }

  const channelMap: AppConfig["slackChannelByEvent"] = {};

  for (const [eventType, channelId] of Object.entries(parsed)) {
    if (eventType !== "stripe.charge_succeeded") {
      throw new Error(`Unsupported event type in SLACK_CHANNEL_BY_EVENT: ${eventType}`);
    }

    if (typeof channelId !== "string" || channelId.trim() === "") {
      throw new Error(`Slack channel for ${eventType} must be a non-empty string.`);
    }

    channelMap[eventType] = channelId;
  }

  return channelMap;
};

const parseLogLevel = (value: string | undefined): AppConfig["logLevel"] => {
  if (value === "debug" || value === "info" || value === "warn" || value === "error") {
    return value;
  }

  return "info";
};

export const loadConfig = (env: Env = process.env): AppConfig => ({
  stripeWebhookSecret: required(env, "STRIPE_WEBHOOK_SECRET"),
  slackBotToken: required(env, "SLACK_BOT_TOKEN"),
  slackChannelByEvent: parseChannelMap(required(env, "SLACK_CHANNEL_BY_EVENT")),
  logLevel: parseLogLevel(env.LOG_LEVEL),
});
