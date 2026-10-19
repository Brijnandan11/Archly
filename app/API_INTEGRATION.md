# API integration coverage

All paths below are relative to `/api`. Every frontend action waits for the API response and shows errors; data is not written to the old demo localStorage store.

| Endpoints | Frontend flow |
| --- | --- |
| `GET /settings`, `GET/PATCH /admin/settings` | Public club copy, contact details and admin settings editor |
| `PATCH /auth/me` | Participant profile editing with roll number, branch, biography and social links |
| `POST /auth/forgot-password`, `POST /auth/reset-password` | Email reset link, 30-minute expiry, single use and session revocation |
| `POST /admin/leaders/:id/reset-password`, `PATCH /admin/leaders/:id` | Rotate credentials, revoke sessions, deactivate/reactivate leaders |
| `PATCH /admin/registrations/:id` | Audited manual status changes with a required reason and capacity checks |
| `GET /health` | Admin overview database status |
| `GET /events`, `GET /events/:slug` | Home galleries, event detail and registration details; lists paginate until complete |
| `GET /faculty`, `GET /team` | Public faculty and student directories |
| `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` | Account creation, sign-in, session restoration, revoked sign-out |
| `POST /events/:id/register` | Authenticated individual registration |
| `GET /registrations/me`, `POST /registrations/:id/cancel` | Private registrations and pending cancellation |
| `GET /payments/config`, `POST /payments/extract-utr`, `POST /payments/submit` | Coding Club UPI payment details, OCR assistance, and participant payment proof submission |
| `/admin/payments/upi/*` | Admin-only manual bank verification, approval, rejection, and private QR configuration |
| `POST /contact` | Public contact form |
| `POST /leader/login`, `GET /leader/session`, `GET /leader/event`, `POST /leader/logout` | Separate leader credentials and session |
| `GET /leader/team`, `POST /leader/team/spin` | Current allocation and transactional server selection |
| `GET /admin/dashboard`, `GET /admin/dashboard/summary` | Admin overview |
| `GET /admin/events`, `POST /admin/events`, `PATCH /admin/events/:id` | Draft-inclusive event list, creation, edit, categories, schedule, prizes, FAQs, highlights, winners, photos, open/close/cancel/archive |
| `GET /admin/registrations`, `GET /admin/registrations/export` | Registration filters, all pages, server CSV download (export includes selected event, irrespective of other table filters) |
| `GET /admin/leaders`, `POST /admin/events/:id/leaders` | Leader directory and one-time credential generation |
| `GET /admin/teams`, `POST /admin/events/:id/teams` | Team directory and team creation |
| `GET /admin/teams/:id/members`, `POST /admin/teams/:id/members`, `DELETE /admin/teams/:id/members/:registrationId` | Team roster, manual add/remove |
| `PATCH /admin/teams/:id/lock`, `PATCH /admin/teams/:id/leader`, `POST /admin/teams/:id/move` | Lock/unlock, leader reassignment, move participant |
| `GET/POST /admin/faculty`, `PATCH/DELETE /admin/faculty/:id` | Faculty CRUD; deletion deactivates; inactive profiles can be restored |
| `GET/POST /admin/team`, `PATCH/DELETE /admin/team/:id` | Student team CRUD with the same active/inactive behavior |
| `POST /admin/images/:kind/:id` | Multipart event banner or faculty/student photo upload, maximum 8 MB; `?purpose=gallery` appends an extra event photo |
| `GET /admin/contact`, `PATCH /admin/contact/:id` | Inbox and message workflow status |
| `GET /admin/notifications`, `POST /admin/notifications/:id/retry` | Latest 100 outbox records and retry of failed notifications |
| `GET /admin/audit` | Paginated audit history |

`GET /leader/me`, `GET /leader/session/team`, and `POST /leader/session/team/spin` are backend aliases of the canonical leader routes above; the frontend calls one canonical route per action.

`POST /internal/notifications/process` is a worker-only endpoint protected by a worker secret. Its secret must never enter a browser. Notifications can also be processed by `npm run worker` at the repository root.

All six previously missing features now have API and UI support. Faculty/student profiles include biographies, year, qualifications, interests, published contact details, CV, source and portfolio links. Participant profile data stays private to the account and registration administration.

Admin registration changes never rewrite payment evidence. Cancelling or returning a registration to pending removes its team membership, deactivates associated event-leader access and revokes leader sessions. Restoring a cancelled registration checks event capacity. Verified paid registrations cannot be marked pending. Confirming a registration does not automatically reactivate a previously deactivated leader; use the leader control after checking eligibility.

Password recovery uses the trusted backend `APP_URL` (required HTTPS in production) and the outbox worker. Reset tokens are stored hashed in the reset table; the mail outbox temporarily contains the delivery link and clears that payload after successful sending. Generic request responses do not disclose whether an account exists. The email provider still needs a verified `MAIL_FROM` sender; secrets and sender configuration are server-only.

The additive migration is `../supabase/migrations/20261018192757_complete_club_features.sql`. It is applied to the configured hosted project. New installations need the existing `../sql/001_schema.sql` through `003_media.sql` followed by this migration. The private schema remains inaccessible to anonymous and authenticated Data API roles.
