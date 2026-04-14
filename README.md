# Jared

Jared is Commet's Slack bot service. The first integration receives Stripe webhooks and posts payment alerts to Slack.

## Architecture

- `api/stripe/webhook.ts`: Vercel Function exposed to Stripe.
- `src/stripe`: Stripe signature verification and event parsing.
- `src/events`: internal Jared event types.
- `src/handlers`: event dispatch and Slack notification logic.
- `src/slack`: Slack Web API client and message formatting.

The first version intentionally has no database. Configure Stripe to send only `payment_intent.succeeded` to avoid duplicated Slack messages from overlapping Stripe events.

## Environment

Copy `.env.example` into `.env.local` for local development:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxx
SLACK_BOT_TOKEN=xoxb-xxx
SLACK_CHANNEL_BY_EVENT={"stripe.payment_succeeded":"C0123456789"}
LOG_LEVEL=info
```

Jared's Slack app needs the `chat:write` scope and must be invited to the configured channel.

## Development

```bash
npm install
npm run dev
```

Forward Stripe webhooks locally:

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
stripe trigger payment_intent.succeeded
```

## Checks

```bash
npm run check
npm test
```
