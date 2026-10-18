# Coding Club frontend

The React app connects to the Express API in `../src`. Events, directories, accounts, registrations, leader allocation and admin changes use backend records. Old browser demo records are not imported or submitted.

## Run locally

From the repository root, install both sets of dependencies:

```sh
npm install
npm --prefix app install
```

Start the API with the root `.env` configured (see `../.env.example`):

```sh
npm run dev:api
```

In a second terminal:

```sh
npm run dev
```

Open http://localhost:5173. The frontend proxies `/api/*` to http://127.0.0.1:4000. Set `API_TARGET` when starting the frontend if the API uses another address. Set `PORT` to change the frontend port. Restart the frontend after changing these variables.

Accounts are created through **Sign in / Create account**. Only backend accounts with the `ADMIN` role can access `#/admin`. To provision an administrator, first register the account through the website, then have the server operator run `npm run admin:promote -- your-email@example.com` at the repository root. This command uses the operator’s database credentials; it is not a public endpoint. Sign in again after promotion. Leader credentials are generated once by an administrator from a confirmed participant; a team must then be created for that leader. Each participant registers individually, and organisers assign teams afterward.

Sessions are stored in sessionStorage for the current tab; passwords and leader credentials are not persisted. Logout revokes the server session. Expired tokens return users to sign-in.

## New management features

- **Admin → Club settings:** save club identity, contact details, social links, about, vision and mission.
- **Admin → Events → Edit:** manage categories, rules, objectives, schedules, prizes, FAQs, winners, highlights and photo URLs. Event cards also upload gallery photos separately from the banner.
- **Admin → Faculty / Student team:** manage biographies, qualifications, interests, year, published contact information, CV and portfolio links.
- **My account:** edit participant details, roll number, branch, biography and social links.
- **Forgot your password:** request a single-use link expiring after 30 minutes. Set backend `APP_URL` to the public frontend URL; production requires HTTPS. Configure verified `MAIL_FROM` and run `npm run worker` for actual email delivery.
- **Admin → Leaders:** reset passwords, deactivate/reactivate access and revoke prior leader sessions.
- **Admin → Registrations:** change status with a reason. Capacity and eligibility are enforced; payment status and refunds remain separate.

The hosted project has both additive migrations applied: `../supabase/migrations/20261018192757_complete_club_features.sql` and `../supabase/migrations/20261018203006_preserve_legacy_profile_fields.sql`. Existing event records are preserved. The source club settings, faculty, and committee profiles have been seeded into the database; `npm run legacy:seed` at the repository root can safely fill or refresh those records from `app/src/data.ts`. Profile photo URLs refer to images shipped in `app/public/assets/`.

## Razorpay test mode and webhooks

The local `.env` has a working Razorpay test key pair. `npm run dev:api` serves the order and webhook routes on port 4000; the frontend at port 5173 calls `/api/payments/order`, launches Standard Checkout, and verifies a returned payment through `/api/payments/verify`. Keep the test key (`rzp_test_…`) in use until a real test checkout succeeds; test payments do not move real money.

`RAZORPAY_WEBHOOK_SECRET` is generated locally and stored in `.env`. To receive real test webhooks, create a webhook in the Razorpay Dashboard’s **Test Mode** with URL `https://<public-api-host>/api/payments/webhook`, use the exact secret from `.env`, and subscribe to `payment.captured`, `payment.failed`, and `refund.processed`. Razorpay cannot deliver to `localhost`; local delivery needs a public tunnel. The endpoint validates the HMAC against the raw request body and ignores duplicate event IDs. Razorpay documents that webhooks require a public URL and recommends HTTPS ([webhook setup](https://razorpay.com/docs/payments/dashboard/settings/webhooks/), [signature validation and localhost testing](https://razorpay.com/docs/webhooks/validate-test/)).

## Build and host

```sh
npm run build
npm start
```

Run these commands in `app/`. The production preview runs on port 3000 and also proxies `/api` using `API_TARGET`.

For static hosting, configure a reverse proxy for `/api`, or build with an absolute API address:

```sh
API_BASE_URL=https://your-api.example/api npm run build
```

Allow the frontend origin in the backend's `CORS_ORIGINS` when using a separate API origin. Never place backend secrets in frontend configuration.

Payments require the backend Razorpay configuration and checkout access. Amounts are displayed in rupees and sent to the backend in paise. Checkout results are verified by the API before confirmation. Closing checkout leaves a pending registration that can be paid or cancelled from My registrations. A registration confirmation download is not a tax invoice.

Image uploads require the backend storage configuration. Email notifications are queued by the API and delivered by the backend worker. The UI displays actual API failures if these services are unavailable.

## Checks

```sh
npm run build
npm run typecheck
npm run check
npx playwright install chromium
npm run test:browser
```

`CHROMIUM_PATH=/path/to/chrome npm run test:browser` can use an installed Chromium browser. The contract browser tests intercept API and checkout requests, with no real charges or messages. `tests/live.spec.cjs` also runs the six feature groups through a real isolated Express listener and PostgreSQL, using and cleaning up test records; it requires the root database environment and queues reset messages without sending them. Do not run it concurrently with other tests that edit club settings. The repository's `npm run test:integration` separately verifies the real PostgreSQL API workflows and storage upload, with simulated payment and email providers.

See [API integration coverage](API_INTEGRATION.md) for endpoint mapping and server-only routes.
