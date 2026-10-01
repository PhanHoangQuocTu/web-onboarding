# AR Sketch & Trace quiz

Next.js App Router and Tailwind CSS implementation of the `VAR_AR-Drawing-Web` funnel. It lives beside the existing `landing` project.

## Run

```bash
cd quiz
pnpm install
pnpm dev
```

Use `pnpm lint` for Oxlint, `pnpm format` to format the project, and `pnpm format:check` to verify formatting. VS Code formats files on save with the recommended Prettier extension.

Open http://localhost:3000. The entire 15-question flow, the interstitials, plan, offer, pricing, checkout preview, and completion preview run on the single `/` page. Each step is a separate component, and answers are saved in local storage.

The visible promo code comes from `NEXT_PUBLIC_PROMO_CODE` in `.env.local`. Copy `.env.example` when setting up another environment. Restart the Next.js server after changing it. This is a public value embedded in the client build.

The original source has no payment integration. Checkout is a clearly labeled preview: it does not collect card details or claim a purchase. The promo code is displayed on the offer card, but pricing and checkout do not apply the discount yet. Connect a real payment provider and confirmed offer before enabling payment.
