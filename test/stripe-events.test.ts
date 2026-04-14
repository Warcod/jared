import { describe, expect, it } from "vitest";
import { parseStripeEvent, toJaredStripeEvent } from "../src/stripe/events.js";

describe("Stripe event normalization", () => {
  it("normalizes payment_intent.succeeded into a Jared event", () => {
    const stripeEvent = parseStripeEvent(
      Buffer.from(
        JSON.stringify({
          id: "evt_123",
          type: "payment_intent.succeeded",
          created: 1_700_000_000,
          livemode: false,
          data: {
            object: {
              id: "pi_123",
              amount_received: 4900,
              currency: "usd",
              customer: "cus_123",
              receipt_email: "buyer@example.com",
              metadata: {
                organizationId: "org_123",
                ignoredNumber: 123,
              },
            },
          },
        }),
      ),
    );

    expect(toJaredStripeEvent(stripeEvent)).toEqual({
      type: "stripe.payment_succeeded",
      payload: {
        amount: 4900,
        currency: "usd",
        customerId: "cus_123",
        customerEmail: undefined,
        description: undefined,
        livemode: false,
        metadata: {
          organizationId: "org_123",
        },
        paymentIntentId: "pi_123",
        receiptEmail: "buyer@example.com",
        stripeEventId: "evt_123",
        created: 1_700_000_000,
      },
    });
  });

  it("ignores unsupported Stripe events", () => {
    const stripeEvent = parseStripeEvent(
      Buffer.from(
        JSON.stringify({
          id: "evt_123",
          type: "checkout.session.completed",
          created: 1_700_000_000,
          livemode: false,
          data: { object: {} },
        }),
      ),
    );

    expect(toJaredStripeEvent(stripeEvent)).toBeUndefined();
  });
});
