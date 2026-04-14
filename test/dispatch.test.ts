import { describe, expect, it, vi } from "vitest";
import { dispatchJaredEvent, getSlackChannelForEvent } from "../src/handlers/dispatch.js";
import type { AppConfig } from "../src/config/env.js";
import type { JaredEvent } from "../src/events/types.js";

const config: AppConfig = {
  stripeWebhookSecret: "whsec_test",
  slackBotToken: "xoxb-test",
  slackChannelByEvent: {
    "stripe.payment_succeeded": "C123",
  },
  logLevel: "info",
};

const event: JaredEvent = {
  type: "stripe.payment_succeeded",
  payload: {
    amount: 4900,
    currency: "usd",
    customerId: "cus_123",
    customerEmail: undefined,
    description: undefined,
    livemode: true,
    metadata: {
      plan: "Pro",
    },
    paymentIntentId: "pi_123",
    receiptEmail: "buyer@example.com",
    stripeEventId: "evt_123",
    created: 1_700_000_000,
  },
};

describe("Jared event dispatch", () => {
  it("gets the Slack channel for an event", () => {
    expect(getSlackChannelForEvent(config, "stripe.payment_succeeded")).toBe("C123");
  });

  it("posts payment messages to Slack", async () => {
    const slack = {
      postMessage: vi.fn().mockResolvedValue(undefined),
    };

    await dispatchJaredEvent({ config, event, slack });

    expect(slack.postMessage).toHaveBeenCalledWith({
      channel: "C123",
      text: expect.stringContaining("New payment received"),
    });
  });
});
