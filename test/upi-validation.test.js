import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPaymentDetails,normalizeReference} from '../src/upi-validation.js';
import {renderMail} from '../src/notifications.js';

test('normalizes transaction references without assuming a fixed UTR length',()=>{
 assert.equal(normalizeReference(' ab-12 34-x '),'AB1234X');
 const result=extractPaymentDetails('UPI Ref No: 2026101987654321');
 assert.equal(result.candidates[0].reference,'2026101987654321');
 assert.ok(result.candidates[0].confidence>0.9);
});

test('extracts alternate RRN and transaction reference labels',()=>{
 const result=extractPaymentDetails('RRN: 4815162342 Transaction ID: TXN-2026-10-19-999');
 assert.deepEqual(result.candidates.map(item=>item.reference),['4815162342','TXN20261019999']);
});

test('extracts payment clues but never treats OCR success text as verification',()=>{
 const result=extractPaymentDetails('Payment successful. Amount ₹9.00 on 19/10/2026 14:35. Paid to codingclub@okaxis. UTR: 123456789012');
 assert.equal(result.fields.amount_rupees,9);
 assert.equal(result.fields.transaction_date_text,'19/10/2026 14:35');
 assert.equal(result.fields.recipient_upi,'codingclub@okaxis');
 assert.equal(result.fields.success_text_detected,true);
 assert.equal('verified' in result.fields,false);
});

test('renders a Coding Club confirmation email only from explicit registration payload',()=>{
 const body=renderMail('cc_registration',{name:'Asha',event:'Code Sastra',code:'CC-2026-000001',amount:900});
 assert.match(body,/Code Sastra/);
 assert.match(body,/CC-2026-000001/);
 assert.match(body,/₹9\.00/);
});
