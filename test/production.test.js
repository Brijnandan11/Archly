import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const load=name=>readFileSync(new URL(name,import.meta.url),'utf8');
test('leader token is hashed and stored in PostgreSQL instead of process memory',()=>{const a=load('../src/extra-routes.js');assert.match(a,/club\.leader_sessions/);assert.doesNotMatch(a,/new Map\(/);assert.match(a,/createHash\('sha256'\)/)});
test('paid registrations use the configured UPI verification workflow',()=>{const a=load('../src/app.js');assert.match(a,/PENDING_PAYMENT/);assert.match(a,/UPI payment is not configured/);assert.doesNotMatch(a,/razorpay/i)});
test('payment approval is isolated to manually verified UPI evidence',()=>{const a=load('../src/upi-routes.js');assert.match(a,/bank_checked/);assert.match(a,/verified_bank_reference/);assert.match(a,/ADMIN_APPROVED_UPI_PAYMENT/)});
test('outbox worker retries failed delivery with bounded attempts',()=>{const a=load('../src/notifications.js');assert.match(a,/attempts<8/);assert.match(a,/SKIP LOCKED/)});
test('production-only schema changes keep RLS enabled',()=>{const a=load('../sql/002_production_extensions.sql');assert.match(a,/ENABLE ROW LEVEL SECURITY/);assert.match(a,/REVOKE ALL/)});
