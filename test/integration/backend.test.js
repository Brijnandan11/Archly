import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sharp from 'sharp';

// Real HTTP + PostgreSQL. Only gateway calls are simulated; no charges or mail are sent.
process.env.RAZORPAY_KEY_ID='rzp_test_integration';
process.env.RAZORPAY_KEY_SECRET=crypto.randomBytes(32).toString('hex');
process.env.RAZORPAY_WEBHOOK_SECRET=crypto.randomBytes(32).toString('hex');
const {default:app}=await import('../../src/app.js');
const {pool,query}=await import('../../src/db.js');
const {assertConfig,config}=await import('../../src/config.js');
const realFetch=globalThis.fetch;
const orders=new Map(),captures=new Map();
let orderCalls=0;
globalThis.fetch=async(input,init)=>{
 const url=String(input);
 if(url==='https://api.razorpay.com/v1/orders'){
  orderCalls++;const body=JSON.parse(init.body);const order={...body,id:'order_'+crypto.randomUUID()};orders.set(order.id,order);
  return Response.json(order);
 }
 if(url.startsWith('https://api.razorpay.com/v1/payments/')){
  const id=url.split('/')[5];
  if(url.endsWith('/refund'))return Response.json({id:'rfnd_'+crypto.randomUUID(),status:'processed'});
  return captures.has(id)?Response.json(captures.get(id)):Response.json({}, {status:404});
 }
 if(url==='https://api.resend.com/emails')throw Error('Integration suite must never send email');
 return realFetch(input,init);
};

test('full backend workflows against PostgreSQL',{timeout:240_000},async t=>{
 assertConfig();await query('SELECT 1');
 const marker='integration-'+crypto.randomUUID();
 const users=[],events=[],content=[],uploads=[],webhooks=[];
 let server,base,admin,participant,other,leader,team,team2,reg,paidReg,payment;
 const password='Integration-test-password-2026!';
 async function request(method,path,body,token,expected=200){
  const headers={};if(token)headers.Authorization='Bearer '+token;
  if(body!==undefined)headers['Content-Type']='application/json';
  const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}
  assert.equal(response.status,expected,`${method} ${path}: ${text}`);return data;
 }
 async function account(label){
  const email=`${marker}-${label}@example.invalid`;
  const data=await request('POST','/api/auth/register',{email,password,full_name:'Integration '+label,department:'Testing',academic_year:2},null,201);
  users.push(data.user.id);return {...data,email};
 }
 async function event(label,overrides={}){
  const data=await request('POST','/api/admin/events',{title:'Integration '+label,slug:marker+'-'+label,event_date:'2099-01-01',start_time:'10:00',end_time:'12:00',venue:'Test venue',registration_fee:0,team_size:2,max_participants:10,registration_start:'2020-01-01T00:00:00Z',registration_deadline:'2098-12-31T00:00:00Z',status:'OPEN',...overrides},admin.token,201);
  events.push(data.id);return data;
 }
 async function webhook(type,entity,id=marker+'-'+crypto.randomUUID()){
  webhooks.push(id);const body=JSON.stringify({event:type,payload:entity});
  return fetch(base+'/api/payments/webhook',{method:'POST',headers:{'Content-Type':'application/json','x-razorpay-event-id':id,'x-razorpay-signature':crypto.createHmac('sha256',config.razorpay.webhook).update(body).digest('hex')},body});
 }
 try{
  server=app.listen(0,'127.0.0.1');await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});base=`http://127.0.0.1:${server.address().port}`;
  await t.test('health, public lists, missing routes and auth guards',async()=>{
   assert.deepEqual(await request('GET','/api/health'),{status:'ok',database:'connected'});
   for(const path of ['/api/events','/api/faculty','/api/team'])assert.ok(Array.isArray(await request('GET',path)));
   for(const path of ['/api/auth/me','/api/admin/events','/api/admin/dashboard','/api/registrations/me','/api/leader/session'])await request('GET',path,undefined,null,path==='/api/admin/events'?404:401);
   await request('GET','/missing',undefined,null,404);
  });
  await t.test('private schema has RLS and no public API role access',async()=>{
   const tables=await query("SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='club'");
   assert.ok(tables.rows.length>=16);assert.ok(tables.rows.every(x=>x.rowsecurity));
   for(const role of ['anon','authenticated'])assert.equal((await query("SELECT has_schema_privilege($1,'club','USAGE') AS allowed",[role])).rows[0].allowed,false);
  });
  await t.test('registration, login, profile, role enforcement and duplicate validation',async()=>{
   admin=await account('admin');participant=await account('participant');other=await account('other');
   await query("UPDATE club.users SET role='ADMIN' WHERE id=$1",[admin.user.id]);
   admin.token=(await request('POST','/api/auth/login',{email:admin.email,password})).token;
   assert.equal((await request('GET','/api/auth/me',undefined,participant.token)).full_name,'Integration participant');
   await request('POST','/api/auth/login',{email:participant.email,password:'wrong'},null,401);
   await request('POST','/api/auth/register',{email:participant.email,password,full_name:'Duplicate'},null,409);
   await request('POST','/api/auth/register',{email:'bad',password:'short',full_name:'x'},null,400);
   await request('GET','/api/admin/dashboard',undefined,participant.token,403);
  });
  await t.test('event create, public details, edit, draft privacy and invalid input',async()=>{
   const ev=await event('free');reg={event_id:ev.id};
   assert.equal((await request('GET','/api/events/'+ev.slug)).id,ev.id);
   assert.equal((await request('PATCH','/api/admin/events/'+ev.id,{venue:'Updated venue'},admin.token)).venue,'Updated venue');
   await request('PATCH','/api/admin/events/'+ev.id,{},admin.token,400);
   const draft=await event('draft',{status:'DRAFT'});await request('GET','/api/events/'+draft.slug,undefined,null,404);
   await request('GET','/api/events/not-a-real-event',undefined,null,404);
  });
  await t.test('free registration, duplicate rejection, owner list and admin filters/export',async()=>{
   reg=await request('POST',`/api/events/${reg.event_id}/register`,undefined,participant.token,201);
   assert.equal(reg.status,'CONFIRMED');
   await request('POST',`/api/events/${reg.event_id}/register`,undefined,participant.token,409);
   assert.ok((await request('GET','/api/registrations/me',undefined,participant.token)).some(x=>x.id===reg.id));
   assert.ok((await request('GET',`/api/admin/registrations?event_id=${reg.event_id}&department=Testing&year=2`,undefined,admin.token)).some(x=>x.id===reg.id));
   assert.match(await request('GET','/api/admin/registrations/export?event_id='+reg.event_id,undefined,admin.token),/registration_code/);
  });
  await t.test('leader selection, credential login and persisted session',async()=>{
   leader=await request('POST',`/api/admin/events/${reg.event_id}/leaders`,{user_id:participant.user.id},admin.token,201);
   await request('POST','/api/leader/login',{leader_id:leader.leader_code,password:'wrong'},null,401);
   leader.token=(await request('POST','/api/leader/login',{leader_id:leader.leader_code,password:leader.one_time_password})).token;
   assert.equal((await request('GET','/api/leader/session',undefined,leader.token)).user_id,participant.user.id);
   assert.equal((await request('GET','/api/leader/event',undefined,leader.token)).id,reg.event_id);
   team=await request('POST',`/api/admin/events/${reg.event_id}/teams`,{leader_id:leader.id,name:'Integration team'},admin.token,201);
  });
  await t.test('team spin under concurrency never assigns a participant twice',async()=>{
   const otherReg=await request('POST',`/api/events/${reg.event_id}/register`,undefined,other.token,201);
   const responses=await Promise.all([1,2].map(()=>fetch(base+'/api/leader/session/team/spin',{method:'POST',headers:{Authorization:'Bearer '+leader.token}})));
   assert.deepEqual(responses.map(x=>x.status).sort(),[200,409]);
   const members=await request('GET',`/api/admin/teams/${team.id}/members`,undefined,admin.token);
   assert.equal(members.length,1);assert.equal(members[0].registration_id,otherReg.id);
   const info=await request('GET','/api/leader/session/team',undefined,leader.token);assert.equal(info.members.length,1);
   await request('PATCH',`/api/admin/teams/${team.id}/lock`,{locked:true},admin.token);
   await request('POST','/api/leader/session/team/spin',undefined,leader.token,409);
   await request('PATCH',`/api/admin/teams/${team.id}/lock`,{locked:false},admin.token);
   await request('DELETE',`/api/admin/teams/${team.id}/members/${otherReg.id}`,undefined,admin.token);
   await request('POST',`/api/admin/teams/${team.id}/members`,{registration_id:otherReg.id},admin.token,201);
   await request('POST',`/api/admin/teams/${team.id}/members`,{registration_id:otherReg.id},admin.token,409);
   await request('POST',`/api/events/${reg.event_id}/register`,undefined,admin.token,201);
   const secondLeader=await request('POST',`/api/admin/events/${reg.event_id}/leaders`,{user_id:admin.user.id},admin.token,201);
   team2=await request('POST',`/api/admin/events/${reg.event_id}/teams`,{leader_id:secondLeader.id,name:'Second test team'},admin.token,201);
   await request('PATCH',`/api/admin/teams/${team2.id}/leader`,{leader_id:secondLeader.id},admin.token);
   await request('POST',`/api/admin/teams/${team.id}/move`,{registration_id:otherReg.id,destination_team_id:team2.id},admin.token);
   assert.equal((await request('GET',`/api/admin/teams/${team2.id}/members`,undefined,admin.token)).length,1);
  });
  await t.test('registration capacity serialized under concurrent requests',async()=>{
   const ev=await event('capacity',{max_participants:1});
   const responses=await Promise.all([participant,other].map(u=>fetch(`${base}/api/events/${ev.id}/register`,{method:'POST',headers:{Authorization:'Bearer '+u.token}})));
   assert.deepEqual(responses.map(x=>x.status).sort(),[201,409]);
  });
  await t.test('paid order creation, repeat idempotency and verified capture (simulated gateway)',async()=>{
   const ev=await event('paid',{registration_fee:25000});
   paidReg=await request('POST',`/api/events/${ev.id}/register`,undefined,participant.token,201);assert.equal(paidReg.status,'PENDING');
   const order=await request('POST','/api/payments/order',{registration_id:paidReg.id},participant.token,201);
   assert.equal(order.amount,25000);
   const again=await request('POST','/api/payments/order',{registration_id:paidReg.id},participant.token);assert.equal(again.order_id,order.order_id);assert.equal(orderCalls,1);
   const paymentId='pay_'+crypto.randomUUID();captures.set(paymentId,{status:'captured',order_id:order.order_id,amount:order.amount,currency:'INR'});
   const body={registration_id:paidReg.id,razorpay_order_id:order.order_id,razorpay_payment_id:paymentId,razorpay_signature:crypto.createHmac('sha256',config.razorpay.secret).update(order.order_id+'|'+paymentId).digest('hex')};
   await request('POST','/api/payments/verify',body,other.token,404);
   assert.equal((await request('POST','/api/payments/verify',body,participant.token)).status,'PAID');
   assert.equal((await query('SELECT status FROM club.registrations WHERE id=$1',[paidReg.id])).rows[0].status,'CONFIRMED');
   payment=(await query('SELECT * FROM club.payments WHERE registration_id=$1',[paidReg.id])).rows[0];
  });
  await t.test('signed capture webhook, replay deduplication and bad signature rejection',async()=>{
   const ev=await event('webhook',{registration_fee:100});const r=await request('POST',`/api/events/${ev.id}/register`,undefined,other.token,201);
   const order=await request('POST','/api/payments/order',{registration_id:r.id},other.token,201);
   const entity={payment:{entity:{order_id:order.order_id,id:'pay_'+crypto.randomUUID(),amount:100,currency:'INR'}}};
   assert.equal((await webhook('payment.captured',{payment:{entity:{...entity.payment.entity,amount:99}}})).status,200);
   assert.equal((await query('SELECT status FROM club.registrations WHERE id=$1',[r.id])).rows[0].status,'PENDING');
   const id=marker+'-capture';assert.equal((await webhook('payment.captured',entity,id)).status,200);assert.equal((await webhook('payment.captured',entity,id)).status,200);
   assert.equal((await query('SELECT status FROM club.registrations WHERE id=$1',[r.id])).rows[0].status,'CONFIRMED');
   await request('POST','/api/payments/webhook',{},null,401);
  });
  await t.test('concurrent payment order requests create one gateway order',async()=>{
   const ev=await event('order-race',{registration_fee:100});const r=await request('POST',`/api/events/${ev.id}/register`,undefined,other.token,201);
   const before=orderCalls;
   const responses=await Promise.all([1,2].map(()=>fetch(base+'/api/payments/order',{method:'POST',headers:{Authorization:'Bearer '+other.token,'Content-Type':'application/json'},body:JSON.stringify({registration_id:r.id})})));
   const data=await Promise.all(responses.map(x=>x.json()));
   assert.equal(data[0].order_id,data[1].order_id);assert.equal(orderCalls-before,1);
  });
  await t.test('paid cancellation and registration ownership',async()=>{
   const ev=await event('cancel',{registration_fee:100});const r=await request('POST',`/api/events/${ev.id}/register`,undefined,participant.token,201);
   await request('POST',`/api/registrations/${r.id}/cancel`,undefined,other.token,409);
   assert.equal((await request('POST',`/api/registrations/${r.id}/cancel`,undefined,participant.token)).status,'CANCELLED');
  });
  await t.test('refund updates payment after full processed refund (simulated gateway)',async()=>{
   await request('POST',`/api/admin/payments/${payment.id}/refund`,{amount:payment.amount,reason:'Integration refund'},admin.token,202);
   assert.equal((await query('SELECT status FROM club.payments WHERE id=$1',[payment.id])).rows[0].status,'REFUNDED');
  });
  await t.test('faculty and student team content CRUD',async()=>{
   for(const kind of ['faculty','team']){
    const row=await request('POST','/api/admin/'+kind,{name:marker+' '+kind},admin.token,201);content.push({kind,id:row.id});
    assert.ok((await request('GET','/api/'+kind)).some(x=>x.id===row.id));
    assert.equal((await request('PATCH',`/api/admin/${kind}/${row.id}`,{name:marker+' edited'},admin.token)).name,marker+' edited');
    await request('DELETE',`/api/admin/${kind}/${row.id}`,undefined,admin.token);
    assert.ok(!(await request('GET','/api/'+kind)).some(x=>x.id===row.id));
   }
  });
  await t.test('contact submission, admin inbox and status update',async()=>{
   await request('POST','/api/contact',{name:'Integration Test',email:admin.email,subject:marker,message:'Integration test message only.'},null,201);
   const rows=await request('GET','/api/admin/contact',undefined,admin.token);const row=rows.find(x=>x.subject===marker);assert.ok(row);
   assert.equal((await request('PATCH','/api/admin/contact/'+row.id,{status:'READ'},admin.token)).status,'READ');
  });
  await t.test('dashboards, team lists, audit and notification queue',async()=>{
   for(const path of ['/api/admin/dashboard','/api/admin/dashboard/summary','/api/admin/teams','/api/admin/audit','/api/admin/notifications'])await request('GET',path,undefined,admin.token);
   assert.ok(Number((await query('SELECT count(*) FROM club.notification_outbox WHERE recipient=$1',[participant.email])).rows[0].count)>0);
   await request('POST','/api/internal/notifications/process',{},null,401);
  });
  await t.test('real multipart image upload, public download and DB URL',async()=>{
   const bytes=await sharp({create:{width:8,height:8,channels:3,background:'#336699'}}).png().toBuffer();
   const form=new FormData();form.append('image',new Blob([bytes],{type:'image/png'}),'integration.png');
   const response=await fetch(`${base}/api/admin/images/events/${events[0]}`,{method:'POST',headers:{Authorization:'Bearer '+admin.token},body:form});
   const data=await response.json();assert.equal(response.status,201,JSON.stringify(data));uploads.push(data.url);
   const image=await fetch(data.url);assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/image\/webp/);
   assert.equal((await query('SELECT banner FROM club.events WHERE id=$1',[events[0]])).rows[0].banner,data.url);
  });
  await t.test('invalid JSON, malformed IDs and invalid pagination return client errors',async()=>{
   const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{broken'});assert.equal(r.status,400);
   await request('GET','/api/admin/teams/not-a-uuid/members',undefined,admin.token,400);
   await request('GET','/api/events?limit=1.5&offset=Infinity',undefined,null,400);
  });
  await t.test('participant and leader logout revoke sessions',async()=>{
   await request('POST','/api/leader/logout',undefined,leader.token);await request('GET','/api/leader/session',undefined,leader.token,401);
   await request('POST','/api/auth/logout',undefined,participant.token);await request('GET','/api/auth/me',undefined,participant.token,401);
  });
 }finally{
  if(server)await new Promise(resolve=>server.close(resolve));
  for(const url of uploads){const objectUrl=url.replace('/object/public/','/object/');const r=await realFetch(objectUrl,{method:'DELETE',headers:{apikey:process.env.SUPABASE_SECRET_KEY}});assert.ok(r.ok,'Test image cleanup failed');}
  await query('DELETE FROM club.team_members WHERE event_id=ANY($1::uuid[])',[events]);
  await query('DELETE FROM club.teams WHERE event_id=ANY($1::uuid[])',[events]);
  await query('DELETE FROM club.event_leaders WHERE event_id=ANY($1::uuid[])',[events]);
  await query('DELETE FROM club.payment_refunds WHERE payment_id IN (SELECT p.id FROM club.payments p JOIN club.registrations r ON r.id=p.registration_id WHERE r.event_id=ANY($1::uuid[]))',[events]);
  await query('DELETE FROM club.payments WHERE registration_id IN (SELECT id FROM club.registrations WHERE event_id=ANY($1::uuid[]))',[events]);
  await query('DELETE FROM club.registrations WHERE event_id=ANY($1::uuid[])',[events]);
  await query('DELETE FROM club.events WHERE id=ANY($1::uuid[])',[events]);
  await query('DELETE FROM club.audit_logs WHERE actor_id=ANY($1::uuid[])',[users]);
  await query('DELETE FROM club.notification_outbox WHERE recipient LIKE $1',[marker+'%']);
  await query('DELETE FROM club.contact_messages WHERE subject=$1',[marker]);
  for(const row of content)await query(`DELETE FROM club.${row.kind==='faculty'?'faculty':'student_team'} WHERE id=$1`,[row.id]);
  await query('DELETE FROM club.users WHERE id=ANY($1::uuid[])',[users]);
  await query('DELETE FROM club.webhook_events WHERE event_id=ANY($1::text[])',[webhooks]);
  globalThis.fetch=realFetch;await pool.end();
 }
});
