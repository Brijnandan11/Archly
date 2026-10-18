# Coding Club backend verification — 2026-10-17

Target: existing Coding Club Supabase project `wfmzhrjdjbkuezsmewjk`. No production deployment performed.

## Verified

- `npm test`: all five test files pass (19 individual structural/notification-worker checks).
- `npm run lint:syntax`: passes.
- `npm run test:integration`: all 19 workflow scenarios pass, plus the parent test (20/20 reported, zero failures).
- `git diff --check`: passes.

The integration suite uses real HTTP requests, real PostgreSQL and real Supabase Storage. It creates uniquely named test fixtures and deletes those fixtures and its uploaded image during cleanup. It does not send email or charge money.

| Workflow | Evidence |
| --- | --- |
| Health/public content/auth guards | Database-backed HTTP 200, lists, 401/403 and 404 responses |
| Database isolation | All club tables have RLS; anon/authenticated lack schema usage |
| Accounts | Register, duplicate detection, login, profile, role checks, logout and token revocation |
| Events | Create, edit, published details, hidden drafts, invalid edits |
| Registrations | Free confirmation, paid pending, duplicate prevention, owner lists, admin filters/CSV, pending cancellation |
| Leaders/teams | Selection, credential login, persistent sessions, team reads, locks, member add/remove/move, leader update, logout |
| Concurrency | Two spins cannot claim one participant twice; event capacity cannot be exceeded; simultaneous order requests reuse one order |
| Payments, simulated provider | Order creation/reuse, signed verification, ownership, captured webhook, replay deduplication, amount mismatch, processed refund |
| Content/contact/admin | Faculty and student team CRUD, inbox/status, dashboards, audit and queued notifications |
| Images, real storage | Multipart PNG upload, WebP re-encoding, database URL update, public download and test object removal |
| Error responses | Malformed JSON, invalid IDs and invalid pagination return HTTP 400 |
| Notification worker, simulated transport/database | Successful delivery, stable idempotency key, retry on provider failure and missing sender rejection |

## Fixed during verification

- Event PATCH applied creation defaults and silently changed OPEN events to DRAFT; edits now preserve unspecified fields.
- Immediate full refunds left payment status PAID; processed totals now update it to REFUNDED.
- Concurrent payment-order requests created separate orders; registration row locking now serializes creation/reuse.
- Malformed JSON returned HTTP 500; parser errors now return HTTP 400 and oversized JSON returns HTTP 413.
- Fractional/infinite pagination could reach SQL and fail; pagination now requires valid integers.
- Dashboard opened five database connections in parallel; it now uses one transaction connection.
- Reduced database pool size and increased connection establishment timeout from 5 to 15 seconds after observing connection timeouts.
- Fixed a whitespace-sensitive structural test and added repeatable integration/worker coverage.

## External configuration still incomplete

- Razorpay credentials passed a real read-only API check (HTTP 200) and are TEST-mode credentials. Real checkout capture/refund and callback delivery were not performed; payment integration tests simulate the provider.
- `RAZORPAY_WEBHOOK_SECRET` is absent. Configure the same webhook secret on the backend and Razorpay before expecting callbacks to work.
- Resend rejected the configured API key with HTTP 401. Replace it with a valid sending key; `MAIL_FROM` is also absent and must identify an approved sender. Real email delivery is not working.
- `WORKER_SECRET` is absent, so the internal HTTP notification-processing endpoint remains unauthorized. CLI workers also need valid email settings.
- Production preflight fails for those missing settings and the current development NODE_ENV. Production deployment, load testing and real provider acceptance remain outstanding.

Run `npm run test:integration` against development/staging. Avoid running an outbox worker concurrently because the suite queues synthetic notifications to reserved `.invalid` addresses. Provider credentials used by the integration suite are temporary process-only values; the local `.env` is not replaced.
