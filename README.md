# AR Sketch & Trace quiz

Next.js App Router and Tailwind CSS implementation of the `VAR_AR-Drawing-Web` funnel. It lives beside the existing `landing` project.

## Run

```bash
cd quiz
pnpm install
pnpm dev
```

Use `pnpm lint` for Oxlint, `pnpm format` to format the project, and `pnpm format:check` to verify formatting. VS Code formats files on save with the recommended Prettier extension.

Open http://localhost:3000. The entire 14-question flow, the interstitials, plan, offer, pricing, checkout preview, and completion preview run on the single `/` page. Each step is a separate component, and answers are saved in local storage.

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

The offer shows a 50% discount on the first year of the yearly plan. Pricing also offers a $0.99 three-day trial that renews at $6.99 per week. The checkout preview shows the amount due today and the renewal terms for the selected plan. The original source has no payment integration: checkout does not collect card details or claim a purchase. Connect a payment provider before enabling payment.
