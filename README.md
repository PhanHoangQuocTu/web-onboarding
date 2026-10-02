# AR Sketch & Trace quiz

Next.js App Router and Tailwind CSS implementation of the `VAR_AR-Drawing-Web` funnel. It lives beside the existing `landing` project.

## Run

```bash
cd quiz
pnpm install
pnpm dev
```

Use `pnpm lint` for Oxlint, `pnpm format` to format the project, and `pnpm format:check` to verify formatting. VS Code formats files on save with the recommended Prettier extension.

Open http://localhost:3000. The entire 14-question flow, the interstitials, plan, offer, pricing, Paddle checkout, and completion screen run on the single `/` page. Each step is a separate component, and answers are saved in local storage.

## Paddle checkout

Copy `.env.example` to `.env.local` and set the Paddle client token, price IDs, API key, and yearly discount ID (`PADDLE_DISCOUNT_ID`, server-only). A `test_` client token opens Paddle sandbox checkout; a `live_` token opens production checkout. Restart the dev server or rebuild production after changing any `NEXT_PUBLIC_` value.

Configure a default payment link in the corresponding Paddle dashboard account. The trial price should represent the 3-day offer and its weekly renewal; verify all price billing periods and the discount's eligibility in Paddle before going live. Paddle calculates the final total, including applicable tax, in its checkout.

The wallet buttons open Paddle's overlay checkout with the selected payment method. The card button opens a branded dialog containing Paddle's secure inline checkout frame, where Paddle collects email and card details and submits payment. While the offer runs, the yearly checkout opens a transaction that `POST /api/checkout` creates with the discount, so the discount needs no code. Create it with no code, checkout redemption turned off (`enabled_for_checkout: false`), restricted to the yearly price, and applying to the first payment only (`recur: false`), separately in sandbox and live. An open checkout keeps its discount after the timer runs out. Google Pay, Apple Pay, and PayPal availability depends on the buyer's device, browser, location, and Paddle account settings. If a wallet is unavailable, Paddle does not switch that button to card checkout. The completion screen appears only after Paddle emits `checkout.completed`.

## Backend and activation codes

The API routes store quiz answers and Paddle billing state in Postgres. Set the `POSTGRES_*` variables, `PADDLE_WEBHOOK_SECRET`, and `PADDLE_API_KEY` in `.env.local`, then apply the SQL migrations in `db/migrations`:

```bash
pnpm db:migrate
```

With PM2, run migrations manually before deploying a new schema. The Docker image runs them on every container start.

In Paddle, create a notification destination for `https://<host>/api/paddle/webhook` with the events `transaction.completed`, `transaction.paid`, `subscription.created`, `subscription.updated`, `subscription.activated`, `subscription.canceled`, `subscription.past_due`, `subscription.paused`, `subscription.resumed`, `subscription.trialing`, `customer.created`, and `customer.updated`. Copy its secret key into `PADDLE_WEBHOOK_SECRET`. `PADDLE_API_KEY` lets the completion screen verify a transaction directly with Paddle when the webhook arrives late.

Each paid subscription gets one activation code, which the completion screen shows after checkout. Renewals keep the same code.

| Endpoint                                        | Purpose                                                                                                          |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `POST /api/sessions`                            | Saves `{ id, answers, email?, plan?, step? }` for a quiz session.                                                |
| `POST /api/paddle/webhook`                      | Receives signed Paddle notifications.                                                                            |
| `GET /api/activation?transactionId=&sessionId=` | Returns `{ code, premium, status, plan, expiresAt }`, or `202 { pending: true }` while Paddle is processing.     |
| `POST /api/activation/redeem`                   | Called by the app with `{ code }`. Returns `{ premium, status, plan, expiresAt }`, or `404` for an unknown code. |

The app should unlock Premium while `premium` is `true`, and call redeem again to refresh the status, for example on launch. `premium` is true for `active` and `trialing` subscriptions until 24 hours after `expiresAt`. Codes are case-insensitive, and dashes and spaces are ignored.

Each client IP may call sessions, activation, and redeem 30 times a minute; extra calls get `429` with `Retry-After`. The activation fallback calls Paddle at most 120 times a minute, and only for saved sessions. Limits live in memory, so they reset on restart and apply per container.

## Tests

The API tests call the route handlers directly against a real Postgres. Each run creates a temporary database, applies the migrations, and drops it afterwards. Paddle API calls are mocked.

```bash
docker run -d --name onboarding-test-pg -e POSTGRES_PASSWORD=test -p 5440:5432 postgres:16
TEST_DATABASE_URL=postgres://postgres:test@localhost:5440/postgres pnpm test
```

Use `pnpm test:coverage` for a coverage report. Point `TEST_DATABASE_URL` only at a disposable server.

## Run with PM2

```bash
cd quiz
pnpm build
pm2 start pm2.config.json
```

PM2 serves the production build on port 5123. Run `pm2 restart ar-sketch-quiz` after rebuilding.

## Run with Docker Compose

From `quiz`, copy `.env.example` to `.env.local` and set the environment values. Set `POSTGRES_HOST=db` and `POSTGRES_PORT=5432`, and choose a strong `POSTGRES_PASSWORD`. The app and the `db` service both read `.env.local`, and Postgres creates that user and database on its first start. Changing them later does not update an existing `pgdata` volume.

The app joins the external `edge` network, where the reverse proxy reaches it at `http://arsketch:5123`. Create the network once and attach the proxy to it, then build and start the app and Postgres:

```bash
docker network create edge
docker compose up --build -d
```

The build and container both read `.env.local`; no build arguments are needed. The app applies pending migrations before it starts. Postgres listens only on `127.0.0.1:5439` of the server, while the app uses `db:5432`. Connect from your machine through an SSH tunnel, then use `localhost:5439`:

```bash
ssh -N -L 5439:127.0.0.1:5439 <user>@<server>
```

Its data lives in the `pgdata` volume, so back it up regularly:

```bash
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup.sql
```

The container serves plain HTTP, so put it behind an HTTPS reverse proxy. Rate limits use the last `X-Forwarded-For` entry, so the proxy must set it to the real client IP (for nginx, `proxy_set_header X-Forwarded-For $remote_addr;`; behind a CDN, restore the client IP first). The app publishes no host port, so clients cannot bypass the proxy and the limits with their own header. Rebuild after changing `NEXT_PUBLIC_` values because Next.js embeds them in the client bundle.

The offer shows a 50% discount on the first year of the yearly plan. Pricing also offers a $0.99 three-day trial that renews at $6.99 per week. The displayed prices must match the configured Paddle prices and discount.
