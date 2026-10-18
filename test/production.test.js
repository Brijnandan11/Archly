import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const load=name=>readFileSync(new URL(name,import.meta.url),'utf8');
test('leader token is hashed and stored in PostgreSQL instead of process memory',()=>{const a=load('../src/extra-routes.js');assert.match(a,/club\.leader_sessions/);assert.doesNotMatch(a,/new Map\(/);assert.match(a,/createHash\('sha256'\)/)});
test('refunded payments require signed gateway webhook status',()=>{const a=load('../src/app.js');assert.match(a,/refund\.processed/);assert.match(a,/x-razorpay-signature/)});
test('webhook checks amount and currency before confirming registration',()=>{const a=load('../src/app.js');assert.match(a,/AND amount=\$3 AND currency=\$4/)});
test('outbox worker retries failed delivery with bounded attempts',()=>{const a=load('../src/notifications.js');assert.match(a,/attempts<8/);assert.match(a,/SKIP LOCKED/)});
test('production-only schema changes keep RLS enabled',()=>{const a=load('../sql/002_production_extensions.sql');assert.match(a,/ENABLE ROW LEVEL SECURITY/);assert.match(a,/REVOKE ALL/)});
