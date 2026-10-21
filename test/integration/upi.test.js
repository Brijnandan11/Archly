import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sharp from 'sharp';

// Opt in only on a disposable/staging database after sql/004_manual_upi_verification.sql.
test('UPI registration, private proof, admin bank verification, and retry-safe confirmation',{skip:process.env.RUN_UPI_INTEGRATION!=='1',timeout:180_000},async t=>{
 process.env.UPI_VPA='codingclub-test@upi';
 process.env.SUPABASE_URL='https://storage.integration.test';
 process.env.SUPABASE_SECRET_KEY='integration-only-storage-key';
 const {default:app}=await import('../../src/app.js');
 const {pool,query}=await import('../../src/db.js');
 const {setOCRImplementationForTests}=await import('../../src/upi-routes.js');
 const realFetch=globalThis.fetch,objects=new Map(),marker='upi-integration-'+crypto.randomUUID();
 let server,base;const users=[],events=[],registrations=[];let admin,participant,secondParticipant;
 setOCRImplementationForTests(async()=>({text:'Payment successful. UPI Ref: TEST123456789. Amount ₹9.00. Recipient codingclub-test@upi',confidence:.97,candidates:[{reference:'TEST123456789',confidence:.98,context:'UPI Ref: TEST123456789'}],fields:{amount_rupees:9,transaction_date_text:'19/10/2026 12:00',recipient_upi:'codingclub-test@upi',success_text_detected:true}}));
 globalThis.fetch=async(input,init)=>{
  const url=String(input),prefix=process.env.SUPABASE_URL+'/storage/v1/';
  if(url.startsWith(prefix+'object/sign/private-payment-evidence/'))return Response.json({signedURL:'/object/sign/private-payment-evidence/'+url.slice((prefix+'object/sign/private-payment-evidence/').length)+'?token=mock'});
  if(url.startsWith(prefix+'object/private-payment-evidence/')){const key=url.slice((prefix+'object/private-payment-evidence/').length);if(init?.method==='DELETE'){objects.delete(key);return Response.json({ok:true})}objects.set(key,init?.body);return Response.json({Key:key})}
  if(url==='https://api.resend.com/emails')throw Error('Integration test must queue but never send email');
  return realFetch(input,init);
 };
 async function request(method,path,body,token,expected=200){const headers={};if(token)headers.Authorization='Bearer '+token;if(body!==undefined&&!(body instanceof FormData))headers['Content-Type']='application/json';const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});const text=await response.text();let data;try{data=JSON.parse(text)}catch{data=text}assert.equal(response.status,expected,`${method} ${path}: ${text}`);return data}
 async function account(label){const email=`${marker}-${label}@example.invalid`,data=await request('POST','/api/auth/register',{email,password:'Integration-UPI-test-2026!',full_name:'UPI '+label,department:'Testing',academic_year:2},undefined,201);users.push(data.user.id);return {...data,email}}
 async function image(color){return sharp({create:{width:40,height:40,channels:3,background:color}}).png().toBuffer()}
 async function submitProof(registration,who,token,bytes,utr){const form=new FormData();form.append('registration_id',registration.id);form.append('utr',utr);form.append('claimed_amount','9');form.append('screenshot',new Blob([bytes],{type:'image/png'}),'proof.png');return request('POST','/api/payments/submit',form,token,201)}
 try{
  assert.ok(process.env.DATABASE_URL,'DATABASE_URL must point at a disposable/staging database');await query('SELECT 1');
  server=app.listen(0,'127.0.0.1');await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject)});base=`http://127.0.0.1:${server.address().port}`;
  admin=await account('admin');participant=await account('participant');secondParticipant=await account('second');await query("UPDATE club.users SET role='ADMIN' WHERE id=$1",[admin.user.id]);
  admin.token=(await request('POST','/api/auth/login',{email:admin.email,password:'Integration-UPI-test-2026!'},undefined)).token;
  const ev=await request('POST','/api/admin/events',{title:'Coding Club UPI '+marker,slug:marker,event_date:'2099-10-19',start_time:'10:00',end_time:'12:00',venue:'Test venue',registration_fee:900,team_size:2,max_participants:10,registration_start:'2020-01-01T00:00:00Z',registration_deadline:'2098-12-31T00:00:00Z',status:'OPEN'},admin.token,201);events.push(ev.id);
  await t.test('registration starts pending and payment config uses the server UPI value',async()=>{
   const config=await request('GET','/api/payments/config');assert.equal(config.enabled,true);assert.equal(config.upi_id,'codingclub-test@upi');assert.equal(config.amount_rupees,9);
   const reg=await request('POST',`/api/events/${ev.id}/register`,undefined,participant.token,201);registrations.push(reg.id);assert.equal(reg.status,'PENDING_PAYMENT');assert.equal(reg.registration_code,null);assert.match(reg.registration_ref,/^UPI-/);
   const resumed=await request('POST',`/api/events/${ev.id}/register`,undefined,participant.token,201);assert.equal(resumed.id,reg.id);assert.equal(resumed.status,'PENDING_PAYMENT');
   const status=await request('GET',`/api/registrations/${reg.id}/payment-status`,undefined,participant.token);assert.equal(status.registration.status,'PENDING_PAYMENT');assert.equal(status.registration.registration_code,null);
   await request('GET',`/api/registrations/${reg.id}/payment-status`,undefined,secondParticipant.token,404);
  });
  const reg1=(await query('SELECT id FROM club.registrations WHERE user_id=$1 AND event_id=$2',[participant.user.id,ev.id])).rows[0];
  await t.test('OCR candidates remain claims and screenshot validation checks decoded image bytes',async()=>{
   const bytes=await image('#123456');const form=new FormData();form.append('screenshot',new Blob([bytes],{type:'image/png'}),'receipt.png');
   const ocr=await request('POST','/api/payments/extract-utr',form,participant.token);assert.equal(ocr.candidates[0].reference,'TEST123456789');assert.equal(ocr.fields.success_text_detected,true);assert.equal('verified' in ocr,false);
   const missing=new FormData();missing.append('registration_id',reg1.id);missing.append('utr','TEST123456789');
   await request('POST','/api/payments/submit',missing,participant.token,400);
   const unchanged=await request('GET',`/api/registrations/${reg1.id}/payment-status`,undefined,participant.token);
   assert.equal(unchanged.registration.status,'PENDING_PAYMENT');assert.equal(unchanged.submissions.length,0);
   const invalid=new FormData();invalid.append('registration_id',reg1.id);invalid.append('utr','TEST123456789');invalid.append('screenshot',new Blob(['not an image'],{type:'image/png'}),'fake.png');await request('POST','/api/payments/submit',invalid,participant.token,400);
  });
  const firstBytes=await image('#123456'),proof1=await submitProof(reg1,participant,participant.token,firstBytes,'TEST123456789');
  await t.test('valid proof is private, owner-scoped, and visible in the admin queue',async()=>{
   assert.equal(proof1.status,'PENDING');assert.equal(proof1.amount_mismatch,false);assert.equal(objects.size,1);
   const status=await request('GET',`/api/registrations/${reg1.id}/payment-status`,undefined,participant.token);assert.equal(status.registration.status,'PENDING_VERIFICATION');assert.equal(status.submissions.length,1);
   await request('GET',`/api/payments/${proof1.id}/screenshot`,undefined,secondParticipant.token,404);assert.ok((await request('GET',`/api/payments/${proof1.id}/screenshot`,undefined,participant.token)).url.includes('token=mock'));
   const queue=await request('GET','/api/admin/payments/upi?status=PENDING',undefined,participant.token,403);assert.ok(queue.error);
   assert.ok((await request('GET','/api/admin/payments/upi?status=PENDING',undefined,admin.token)).some(row=>row.id===proof1.id));
   await request('PATCH',`/api/admin/registrations/${reg1.id}`,{status:'CONFIRMED',reason:'Must not bypass bank review'},admin.token,409);
   await request('POST',`/api/admin/payments/upi/${proof1.id}/approve`,{bank_checked:false,verified_bank_reference:'BANK-REF-123456'},admin.token,400);
   await request('POST',`/api/admin/payments/upi/${proof1.id}/review`,{},admin.token);assert.equal((await request('GET',`/api/admin/payments/upi/${proof1.id}`,undefined,admin.token)).status,'UNDER_REVIEW');
  });
  const approvalBody={bank_checked:true,verified_bank_reference:'BANK-REF-123456'};
  await t.test('approval is admin-only, idempotent, concurrency-safe, and queues one email',async()=>{
   await request('POST',`/api/admin/payments/upi/${proof1.id}/approve`,approvalBody,participant.token,403);
   const responses=await Promise.all([1,2].map(()=>request('POST',`/api/admin/payments/upi/${proof1.id}/approve`,approvalBody,admin.token)));
   assert.deepEqual(responses.map(x=>x.registration_code),[responses[0].registration_code,responses[0].registration_code]);assert.match(responses[0].registration_code,/^CC-\d{4}-\d{6}$/);
   const status=await request('GET',`/api/registrations/${reg1.id}/payment-status`,undefined,participant.token);assert.equal(status.registration.status,'CONFIRMED');assert.equal(status.registration.registration_code,responses[0].registration_code);
   assert.equal(Number((await query("SELECT count(*) FROM club.notification_outbox WHERE recipient=$1 AND kind='cc_registration'",[participant.email])).rows[0].count),1);
  });
  const reg2=await request('POST',`/api/events/${ev.id}/register`,undefined,secondParticipant.token,201);registrations.push(reg2.id);
  const proof2=await submitProof(reg2,secondParticipant,secondParticipant.token,firstBytes,'TEST123456789');
  await t.test('duplicates are flagged, rejected evidence is retained, and resubmission can be approved',async()=>{
   assert.equal(proof2.duplicate_utr,true);assert.equal(proof2.duplicate_screenshot,true);
   await request('POST',`/api/admin/payments/upi/${proof2.id}/approve`,approvalBody,admin.token,409);
   await request('POST',`/api/admin/payments/upi/${proof2.id}/request-resubmission`,{reason:'Please provide a clear screenshot and correct reference.'},admin.token);
   assert.equal((await request('GET',`/api/registrations/${reg2.id}/payment-status`,undefined,secondParticipant.token)).registration.status,'PAYMENT_REJECTED');
   setOCRImplementationForTests(async()=>({text:'Payment complete. UTR: TEST987654321. Amount ₹5.00.',confidence:.97,candidates:[{reference:'TEST987654321',confidence:.98,context:'UTR: TEST987654321'}],fields:{amount_rupees:5,transaction_date_text:null,recipient_upi:'codingclub-test@upi',success_text_detected:true}}));
   const proof3=await submitProof(reg2,secondParticipant,secondParticipant.token,await image('#abcdef'),'TEST987654321');
   assert.equal(proof3.duplicate_screenshot,false);assert.equal(proof3.amount_mismatch,true);
   const approved=await request('POST',`/api/admin/payments/upi/${proof3.id}/approve`,{...approvalBody,verified_bank_reference:'BANK-REF-987654'},admin.token);
   assert.equal(approved.status,'APPROVED');const state=await request('GET',`/api/registrations/${reg2.id}/payment-status`,undefined,secondParticipant.token);assert.equal(state.submissions.length,2);assert.equal(state.registration.status,'CONFIRMED');
  });
 }finally{
  if(server)await new Promise(resolve=>server.close(resolve));
  globalThis.fetch=realFetch;setOCRImplementationForTests(null);
  if(registrations.length){await query('DELETE FROM club.manual_payment_submissions WHERE registration_id=ANY($1::uuid[])',[registrations]);await query('DELETE FROM club.team_members WHERE registration_id=ANY($1::uuid[])',[registrations]);await query('DELETE FROM club.registrations WHERE id=ANY($1::uuid[])',[registrations])}
  if(events.length)await query('DELETE FROM club.events WHERE id=ANY($1::uuid[])',[events]);
  if(users.length){await query('DELETE FROM club.audit_logs WHERE actor_id=ANY($1::uuid[])',[users]);await query('DELETE FROM club.notification_outbox WHERE recipient LIKE $1',[marker+'%']);await query('DELETE FROM club.users WHERE id=ANY($1::uuid[])',[users])}
  await pool.end();
 }
});
