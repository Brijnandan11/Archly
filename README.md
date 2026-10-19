# Coding Club backend (Node.js / Express / PostgreSQL on Supabase)

Backend only. No UI. Database schema installed in the existing **Coding Club** Supabase project (`wfmzhrjdjbkuezsmewjk`) on 2026-10-17. SQL verification: 13 tables, all 13 RLS-enabled; anon and authenticated have no club schema access. The local database connection uses the IPv4 session pooler with verified TLS.

## Start in dependency order

1. Use the existing **Coding Club** Supabase project (`wfmzhrjdjbkuezsmewjk`). Copy its **session pooler Postgres URL** from Connect / Database settings. Use the pooler URL supported by your region. URL-encode special characters in the password.
2. Schema migration already applied successfully; **do not reapply unless intentionally setting up another database**. This uses a private `club` schema, not the public API schema; do NOT expose it through Supabase Data API. The connection account must have access to the schema.
3. `cp .env.example .env` and set `DATABASE_URL`, `JWT_SECRET` (32+ random characters), `CORS_ORIGINS`. Never commit `.env`.
4. `npm ci` (or `npm install` on first use); `npm test`; `npm start`.
5. Another terminal: `npm run smoke`. Expected: `PASS: DB-backed health and unauthorized guard`.
6. Seed the first admin using the SQL Editor **after registering the account**: `UPDATE club.users SET role='ADMIN' WHERE email='your-admin-email@example.com';` Do not expose this ability through a public API.

## Key routes

- `GET /api/health` (checks database)
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/events?mode=upcoming|past`, `GET /api/events/:slug`
- `POST /api/admin/events`, `PATCH /api/admin/events/:id` (admin)
- `POST /api/events/:id/register`, `GET /api/registrations/me`, `POST /api/registrations/:id/cancel`
- `GET /api/admin/registrations`, `GET /api/admin/dashboard`
- `POST /api/admin/events/:id/leaders` (returns leader password **once**), `POST /api/admin/events/:id/teams`
- `GET /api/leader/me`, `GET /api/leader/team`, `POST /api/leader/team/spin` (headers `x-leader-id`, `x-leader-password`)
- `GET /api/admin/teams`, `PATCH /api/admin/teams/:id/lock`
- `GET /api/faculty`, `GET /api/team`; admin CRUD at `/api/admin/faculty` and `/api/admin/team`
- `POST /api/contact`, `GET /api/admin/contact`, `PATCH /api/admin/contact/:id`, `GET /api/admin/audit`
- UPI payments: `GET /api/payments/config`, `POST /api/payments/extract-utr`, `POST /api/payments/submit`; admins review under `/api/admin/payments/upi`

Registration fee amounts are **paise**, not rupees. Free events confirm immediately. Paid events use the Coding Club UPI QR and remain pending until an admin verifies the credited bank transaction. OCR and screenshots are supporting evidence only. Leader access is event-specific; there is no global LEADER user role.

## Additional modules (October 2026 iteration)

- `POST /api/leader/login` with `{ "leader_id": "CC26-L001", "password": "..." }` returns an eight-hour bearer token.
- `POST /api/leader/logout` and `GET /api/leader/session`, `GET /api/leader/event`, `GET /api/leader/session/team`, `POST /api/leader/session/team/spin` require that bearer token.
- `GET /api/admin/registrations/export?event_id=...` downloads CSV (up to 50,000 rows).
- `POST /api/admin/teams/:id/members`, `DELETE /api/admin/teams/:id/members/:registrationId`, `PATCH /api/admin/teams/:id/leader`, `GET /api/admin/teams/:id/members`.
- `GET /api/admin/dashboard/summary` gives computed counters.

## Verification

Run `npm test` for structural and simulated notification-worker checks, `npm run lint:syntax` for JavaScript syntax, and `npm run test:integration` for HTTP workflows against the configured PostgreSQL database.

The integration suite creates uniquely named test accounts/events and a tiny real storage image, then deletes its own fixtures. It does not initiate payments or send email. Use a development or staging database, and avoid running an outbox worker concurrently with the suite.

Supabase connections use `certs/supabase-ca.crt` with certificate verification in development and production. The Docker image includes this certificate.

See `READINESS.md` for verified behavior and external-service blockers.

## Manual UPI payment review

The Coding Club UPI workflow handles all paid registrations. It requires `UPI_VPA`; without it, paid registration is disabled instead of falling back to a payment gateway. Keep the VPA and Supabase/Resend credentials in the backend environment (Render or local `.env`), never in Vercel frontend variables or source control. `UPI_EVENT_NAME` is an optional display fallback; the page uses the registration's event title. The supplied organizer QR is included at `app/public/assets/payment/coding-club-upi-qr.png`; admins can replace it from Admin → Payment Verification, which stores the replacement in a private bucket. The supplied static QR encodes ₹9; registrations with a different fee are directed to a dynamic UPI payment link instead.

Before enabling it on a database, back up the database and apply `sql/004_manual_upi_verification.sql` after migrations 001–003. This creates the payment evidence table, private storage bucket, registration status/reference fields, idempotent email outbox key, and registration ID sequence. The migration is included but was not applied to the configured Supabase database in this change. Set server environment values:

- `UPI_VPA` — receiving UPI ID; must match the destination encoded in the displayed QR.
- `SUPABASE_URL` and `SUPABASE_SECRET_KEY` — already used by the API, required to write private payment evidence and issue short-lived screenshot links.
- `RESEND_API_KEY` and `MAIL_FROM` — existing email setup; confirmation notices are queued only after approval and use the backend's retrying outbox. `MAIL_FROM` must use a domain verified in Resend.
- `MAIL_REPLY_TO` — club reply address, currently `codingclub@gecazamgarh.ac.in`. Replies go to this mailbox while the verified sender remains `noreply@codingclub.live`. To send from the college address, verify `gecazamgarh.ac.in` in Resend with the college DNS administrator before changing `MAIL_FROM`.
- `UPI_EVENT_NAME` — optional label fallback, default `Coding Club`.
- `UPI_QR_IMAGE_URL` — optional public QR override; otherwise the supplied QR is used until an admin replaces it with a private stored image.

For local workflow checks, use a disposable development database, apply the migration there, configure the server `.env`, then run `npm test`, `npm run typecheck --prefix app`, and `npm run build --prefix app`. The opt-in database-backed UPI flow test runs with `RUN_UPI_INTEGRATION=1 npm run test:integration`; it creates temporary accounts/events, mocks OCR and private storage, queues email without sending it, and cleans up its rows. Register an account for a ₹9 event, submit a test screenshot and UTR, then use an Admin account to review it. Only approve after checking a matching credit in the receiving account's bank history; tests must use mock evidence and must not initiate real transfers. The app marks the email job accepted when Resend accepts it; actual delivery depends on provider response and recipient mail handling. No production deployment or live database migration was performed.

## October 2026 production extension

Installed additive SQL migration `sql/002_production_extensions.sql` on existing Coding Club Supabase project (`wfmzhrjdjbkuezsmewjk`). It adds persisted/revocable leader sessions, email outbox with worker retry, and refund records. The database has 16 private `club` tables protected by RLS. No frontend is included.

New backend endpoints:
- `POST /api/leader/login` and `POST /api/leader/logout` — stored, expiring bearer sessions
- `GET /api/leader/session`, `/api/leader/event`, `/api/leader/session/team`
- `POST /api/leader/session/team/spin` — transactional DB-selected team member
- `POST /api/admin/teams/:id/move` — transfer assigned member to another team in same event
- `GET /api/admin/notifications`, `POST /api/admin/notifications/:id/retry`
- `POST /api/internal/notifications/process` — worker-secret-protected processing endpoint
- `npm run worker` — one outbox processing batch (run periodically)

Read `DEPLOYMENT.md` before using a production environment. Core workflows are covered by database-backed integration tests. Manual UPI bank verification and email delivery still require organizer configuration and staging acceptance. Image uploads are implemented below.

## Real image storage
`POST /api/admin/images/{events|faculty|team}/:id` accepts multipart `image`, requires ADMIN token, re-encodes to WebP, and updates the corresponding image URL. `sql/003_media.sql` creates the public-read `coding-club-media` bucket; already applied to Coding Club Supabase. Server requires `SUPABASE_SECRET_KEY`, never a browser-exposed key. Images need to be uploaded separately; none were supplied in this turn.

**Build status:** dependencies and lockfile are present. Core HTTP/database workflows, real image upload/download, and targeted concurrency cases are integration-tested. Production deployment, live bank-credit verification, and real email delivery remain unverified.
