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

Copy `.env.example` to `.env.local` and set the Paddle client token, price IDs, and yearly discount code. A `test_` client token opens Paddle sandbox checkout; a `live_` token opens production checkout. Restart the dev server or rebuild production after changing any `NEXT_PUBLIC_` value.

Configure a default payment link in the corresponding Paddle dashboard account. The trial price should represent the 3-day offer and its weekly renewal; verify all price billing periods and the discount's eligibility in Paddle before going live. Paddle calculates the final total, including applicable tax, in its checkout.

The wallet buttons open Paddle's overlay checkout with the selected payment method. The card button opens a branded dialog containing Paddle's secure inline checkout frame, where Paddle collects email and card details and submits payment. The yearly plan applies the configured discount code. Google Pay, Apple Pay, and PayPal availability depends on the buyer's device, browser, location, and Paddle account settings. If a wallet is unavailable, Paddle does not switch that button to card checkout. The completion screen appears only after Paddle emits `checkout.completed`.

This client integration does not provision app access. Add server-side Paddle webhooks and transaction verification before using successful payments to grant access.

## Run with PM2

```bash
cd quiz
pnpm build
pm2 start pm2.config.json
```

PM2 serves the production build on port 5123. Run `pm2 restart ar-sketch-quiz` after rebuilding.

## Run with Docker Compose

From `quiz`, copy `.env.example` to `.env.local` and set the environment values, then build and start the container:

```bash
docker compose up --build -d
```

Open http://localhost:5123. The build and container both read `.env.local`; no build arguments are needed. Rebuild after changing `NEXT_PUBLIC_` values because Next.js embeds them in the client bundle.

The offer shows a 50% discount on the first year of the yearly plan. Pricing also offers a $0.99 three-day trial that renews at $6.99 per week. The displayed prices must match the configured Paddle prices and discount.
