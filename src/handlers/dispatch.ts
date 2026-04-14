import type { AppConfig } from "../config/env.js";
import type { JaredEvent } from "../events/types.js";
import type { SlackClient } from "../slack/client.js";
import { buildChargeSucceededSlackMessage } from "../slack/payment-message.js";

export const getSlackChannelForEvent = (config: AppConfig, eventType: JaredEvent["type"]): string => {
  const channel = config.slackChannelByEvent[eventType];

  if (!channel) {
    throw new Error(`No Slack channel configured for event type: ${eventType}`);
  }

  return channel;
};

export const dispatchJaredEvent = async ({
  config,
  event,
  slack,
}: {
  config: AppConfig;
  event: JaredEvent;
  slack: SlackClient;
}): Promise<void> => {
  const channel = getSlackChannelForEvent(config, event.type);

  switch (event.type) {
    case "stripe.charge_succeeded":
      await slack.postMessage({
        channel,
        text: buildChargeSucceededSlackMessage(event.payload),
      });
      return;
  }
};
