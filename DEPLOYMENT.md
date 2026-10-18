# Deployment runbook — NOT DEPLOYED

**Status:** Deployment scaffolding only. This backend has not been integration-tested end-to-end against live payment and email providers. Treat as staging candidate, not production-approved.

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
