export type JaredEvent = StripePaymentSucceededEvent;

export type StripePaymentSucceededEvent = {
  type: "stripe.payment_succeeded";
  payload: StripePaymentPayload;
};

export type StripePaymentPayload = {
  amount: number;
  currency: string;
  customerId?: string;
  customerEmail?: string;
  description?: string;
  livemode: boolean;
  metadata: Record<string, string>;
  paymentIntentId: string;
  receiptEmail?: string;
  stripeEventId: string;
  created: number;
};
