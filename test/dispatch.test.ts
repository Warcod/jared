import { describe, expect, it, vi } from "vitest";
import { dispatchJaredEvent, getSlackChannelForEvent } from "../src/handlers/dispatch.js";
import type { AppConfig } from "../src/config/env.js";
import type { JaredEvent } from "../src/events/types.js";

const config: AppConfig = {
  stripeWebhookSecret: "whsec_test",
  slackBotToken: "xoxb-test",
  slackChannelByEvent: {
    "stripe.charge_succeeded": "C123",
    "stripe.charge_failed": "C123",
  },
  logLevel: "info",
};

const event: JaredEvent = {
  type: "stripe.charge_succeeded",
  payload: {
    amount: 4900,
    chargeId: "ch_123",
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
    expect(getSlackChannelForEvent(config, "stripe.charge_succeeded")).toBe("C123");
  });

  it("posts charge messages to Slack", async () => {
    const slack = {
      postMessage: vi.fn().mockResolvedValue(undefined),
    };

    await dispatchJaredEvent({ config, event, slack });

    expect(slack.postMessage).toHaveBeenCalledWith({
      channel: "C123",
      text: expect.stringContaining("Nuevo pago recibido"),
    });
  });

  it("posts charge.failed messages with :x: and reason", async () => {
    const slack = {
      postMessage: vi.fn().mockResolvedValue(undefined),
    };

    const failedEvent: JaredEvent = {
      type: "stripe.charge_failed",
      payload: {
        amount: 1500,
        chargeId: "ch_456",
        currency: "usd",
        customerId: "cus_456",
        customerEmail: undefined,
        description: undefined,
        livemode: true,
        metadata: {},
        paymentIntentId: "pi_456",
        receiptEmail: undefined,
        stripeEventId: "evt_456",
        created: 1_700_000_001,
        failureCode: "card_declined",
        failureMessage: "Your card was declined.",
      },
    };

    await dispatchJaredEvent({ config, event: failedEvent, slack });

    expect(slack.postMessage).toHaveBeenCalledTimes(1);
    const call = slack.postMessage.mock.calls[0][0];
    expect(call.channel).toBe("C123");
    expect(call.text).toContain("Pago fallido :x:");
    expect(call.text).toContain("Reason: Your card was declined. (card_declined)");
  });
});
