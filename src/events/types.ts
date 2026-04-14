export type JaredEvent = StripeChargeSucceededEvent;

export type StripeChargeSucceededEvent = {
  type: "stripe.charge_succeeded";
  payload: StripeChargePayload;
};

export type StripeChargePayload = {
  amount: number;
  chargeId: string;
  currency: string;
  customerId?: string;
  customerEmail?: string;
  description?: string;
  livemode: boolean;
  metadata: Record<string, string>;
  paymentIntentId?: string;
  receiptEmail?: string;
  stripeEventId: string;
  created: number;
};
