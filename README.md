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
- `POST /api/payments/order`, `POST /api/payments/webhook` (requires Razorpay environment secrets)

Registration fee amounts are **paise**, not rupees. Free events confirm immediately. Paid events confirm only from a signature-verified webhook. Leader access is event-specific; there is no global LEADER user role.

## Additional modules (October 2026 iteration)

- `POST /api/leader/login` with `{ "leader_id": "CC26-L001", "password": "..." }` returns an eight-hour bearer token.
- `POST /api/leader/logout` and `GET /api/leader/session`, `GET /api/leader/event`, `GET /api/leader/session/team`, `POST /api/leader/session/team/spin` require that bearer token.
- `GET /api/admin/registrations/export?event_id=...` downloads CSV (up to 50,000 rows).
- `POST /api/admin/teams/:id/members`, `DELETE /api/admin/teams/:id/members/:registrationId`, `PATCH /api/admin/teams/:id/leader`, `GET /api/admin/teams/:id/members`.
- `GET /api/admin/dashboard/summary` gives computed counters.
- `POST /api/payments/verify` checks Razorpay checkout HMAC and independently fetches the captured transaction details from the provider.

## Verification

Run `npm test` for structural and simulated notification-worker checks, `npm run lint:syntax` for JavaScript syntax, and `npm run test:integration` for HTTP workflows against the configured PostgreSQL database.

The integration suite creates uniquely named test accounts/events and a tiny real storage image, then deletes its own fixtures. Razorpay responses are simulated; it does not charge money or send email. Use a development or staging database, and avoid running an outbox worker concurrently with the suite.

Supabase connections use `certs/supabase-ca.crt` with certificate verification in development and production. The Docker image includes this certificate.

See `READINESS.md` for verified behavior and external-service blockers.

## October 2026 production extension

Installed additive SQL migration `sql/002_production_extensions.sql` on existing Coding Club Supabase project (`wfmzhrjdjbkuezsmewjk`). It adds persisted/revocable leader sessions, email outbox with worker retry, and refund records. The database has 16 private `club` tables protected by RLS. No frontend is included.

New backend endpoints:
- `POST /api/leader/login` and `POST /api/leader/logout` — stored, expiring bearer sessions
- `GET /api/leader/session`, `/api/leader/event`, `/api/leader/session/team`
- `POST /api/leader/session/team/spin` — transactional DB-selected team member
- `POST /api/admin/teams/:id/move` — transfer assigned member to another team in same event
- `GET /api/admin/notifications`, `POST /api/admin/notifications/:id/retry`
- `POST /api/admin/payments/:id/refund` — authenticated admin refund request
- `POST /api/internal/notifications/process` — worker-secret-protected processing endpoint
- `npm run worker` — one outbox processing batch (run periodically)

Read `DEPLOYMENT.md` before using a production environment. Core workflows are covered by database-backed integration tests. Real payment capture/refund and email sending still require provider configuration and sandbox acceptance. Image uploads are implemented below.

## Real image storage
`POST /api/admin/images/{events|faculty|team}/:id` accepts multipart `image`, requires ADMIN token, re-encodes to WebP, and updates the corresponding image URL. `sql/003_media.sql` creates the public-read `coding-club-media` bucket; already applied to Coding Club Supabase. Server requires `SUPABASE_SECRET_KEY`, never a browser-exposed key. Images need to be uploaded separately; none were supplied in this turn.

**Build status:** dependencies and lockfile are present. Core HTTP/database workflows, real image upload/download, and targeted concurrency cases are integration-tested. Production deployment, real gateway callback/capture/refund acceptance, and real email delivery remain unverified.
