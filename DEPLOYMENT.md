# Deployment runbook

**Status:** Vercel and Render deployment configuration is prepared, but nothing has been deployed yet. The application has not been acceptance-tested end-to-end against live payment and email providers. Keep Razorpay in test mode until the staging checks below pass.

## Vercel frontend

The Vercel project root is `app/`; `app/vercel.json` installs from its lockfile, runs the static build, and publishes `app/dist`. In Vercel, import this repository and set **Root Directory** to `app`. Add the public build variable `API_BASE_URL` in Preview and Production, pointing to the Render API with `/api` at the end, for example `https://coding-club-api.onrender.com/api`. The build intentionally fails on Vercel if this HTTPS URL is missing or malformed. This URL is embedded in the browser bundle and must never contain a secret.

## Render backend

Create a Render Blueprint from the repository root using `render.yaml`. It defines the Docker API service and a cron service that runs the email outbox worker every five minutes. The shared environment group generates `JWT_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and `WORKER_SECRET`; keep these values private. At first Blueprint setup, provide the requested per-service values:

- `DATABASE_URL`: the existing Supabase **session pooler** connection string.
- `CORS_ORIGINS`: the exact Vercel production origin, plus any explicitly trusted preview/custom domains, comma-separated. Do not use `*`.
- `APP_URL`: the exact HTTPS Vercel production origin, used for password reset links.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: use the Razorpay **test-mode** pair during acceptance testing.
- `RESEND_API_KEY` and `MAIL_FROM`: a Resend API key and verified sender identity.
- `SUPABASE_SECRET_KEY`: the server-side `sb_secret_...` key for public image uploads.

The cron service needs the same database URL and CORS value, plus the Resend key and sender. The blueprint does not run migrations automatically; the existing Coding Club Supabase project already has the required migrations. The API health check is `/api/health`. The expected public API origin for the name in `render.yaml` is `https://coding-club-api.onrender.com`; confirm Render’s assigned hostname before setting `API_BASE_URL`.

After the API is live, create the Razorpay Test Mode webhook at `https://coding-club-api.onrender.com/api/payments/webhook`, configure `payment.captured`, `payment.failed`, and `refund.processed`, and copy the Render-generated `RAZORPAY_WEBHOOK_SECRET` into the Dashboard. Do not use real payment keys before the staging acceptance checks pass.

Render’s current default for a new web or cron service is the `0.5c-512mb` plan when `plan` is omitted. Check the service plan and cost in Render before applying the Blueprint. The scheduled mailer is a separate cron service.

1. Use Node 22 or newer; dependencies and `package-lock.json` are present. Use `npm ci` for reproducible installs.
2. Set `DATABASE_URL` to the **session pooler** connection string from Coding Club Supabase; use TLS-verified PostgreSQL connectivity (the bundled CA is loaded for Supabase hosts). Set a random `JWT_SECRET` of at least 32 characters and `CORS_ORIGINS` to the trusted application origin.
3. Migrations 001, 002, and 003 are already applied to the existing Coding Club project. Run them in order only when provisioning a new database. Back up before schema changes.
4. Use provider **test mode** credentials for Razorpay and set webhook URL `/api/payments/webhook`. Test refunds, duplicate notifications, amount mismatch, failed payments, interrupted confirmation, and reconciliation before using live keys.
5. To send notifications, verify your sender domain with Resend, set `RESEND_API_KEY` and `MAIL_FROM`, and arrange a secure scheduler to execute `npm run worker` regularly. Mail is queued without these credentials; it is *not delivered*.
6. Never publish DB credentials, private JWT secret, webhook secret, or worker secret. Run behind HTTPS ingress with request limits and an appropriate network egress policy. Configure logs and alerting.
7. Build: `npm ci && npm test && npm run lint:syntax`; then with staging configuration, run `npm start` and `npm run smoke`. Run `npm run test:integration` against development/staging to check HTTP workflows and concurrency against real PostgreSQL; gateway calls are simulated and test fixtures are cleaned up.
8. Enforce admin onboarding manually by approving a chosen account: `UPDATE club.users SET role='ADMIN' WHERE email='<verified-admin-email>';` run only after verifying ownership. Do not expose self-service admin assignment.
9. Add automated backups, restore drills, monitoring, and secrets rotation. This runbook is not a security certification.

## Real photo/image upload (October 2026)

The `coding-club-media` Supabase Storage bucket was created in the existing Coding Club project; this is intentionally **public-read**, because event banners and staff photos are public website content. Do not upload private IDs, receipts, sensitive participant photos or confidential documents to this bucket.

Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (`sb_secret_...`) in **server-side** environment only. Under an authenticated ADMIN bearer token, send `multipart/form-data` with field `image` to:

`POST /api/admin/images/events/:eventUuid` (sets `events.banner`)
`POST /api/admin/images/faculty/:facultyUuid` (sets `faculty.photo`)
`POST /api/admin/images/team/:studentTeamUuid` (sets `student_team.photo`)

JPEG/PNG/WebP/AVIF uploads up to 8 MiB are decoded and re-encoded as resized WebP (no metadata), written under a random immutable object path, and updated in PostgreSQL. Use only photographs you have permission to publish; obtain consent for identifiable student/faculty photographs. The returned JSON includes the public CDN URL.

The backend does not bundle actual photographs. No user image files were present at build time. It does not provide cleanup of superseded objects or asynchronous antivirus inspection; plan media retention and image-abuse tests before production.

**Required staging acceptance**: install dependencies with a trusted npm registry, commit the actual `package-lock.json`, execute `npm ci`, start server against your private pooler URL, check `/api/health`, register/login, create a draft event, upload sample image, exercise registration, leader+team spin including concurrent calls, verify Razorpay test callbacks and refund reconciliation, and verify email outbox delivery. Do not activate live payments until all these pass.
