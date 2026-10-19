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
- **Admin → Registrations:** change status with a reason. Capacity and eligibility are enforced; payment evidence is handled in Payment Verification.

The hosted project has both additive migrations applied: `../supabase/migrations/20261018192757_complete_club_features.sql` and `../supabase/migrations/20261018203006_preserve_legacy_profile_fields.sql`. Existing event records are preserved. The source club settings, faculty, and committee profiles have been seeded into the database; `npm run legacy:seed` at the repository root can safely fill or refresh those records from `app/src/data.ts`. Profile photo URLs refer to images shipped in `app/public/assets/`.

## UPI registration payments

Paid registrations use the Coding Club UPI QR or a prefilled UPI app link. The registration remains pending until an administrator checks the receiving account and approves the payment in Admin → Payment Verification. Screenshots and OCR are supporting evidence only; they do not confirm payment. Configure `UPI_VPA` and the private storage credentials in the backend environment. The supplied QR encodes ₹9, so a different event fee uses the dynamic UPI app link.

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

Paid registrations use the configured UPI destination. A participant uploads payment proof and waits for manual bank verification; an administrator approval confirms registration. A registration confirmation download is not a tax invoice.

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
