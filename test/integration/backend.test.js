import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sharp from 'sharp';

// Real HTTP + PostgreSQL; no payment provider calls or email are sent.
const {default:app}=await import('../../src/app.js');
const {pool,query}=await import('../../src/db.js');
const {assertConfig}=await import('../../src/config.js');
const realFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const url=String(input);
 if(url==='https://api.resend.com/emails')throw Error('Integration suite must never send email');
 return realFetch(input,init);
};

test('full backend workflows against PostgreSQL',{timeout:240_000},async t=>{
 assertConfig();await query('SELECT 1');
 const marker='integration-'+crypto.randomUUID();
 const users=[],events=[],content=[],uploads=[];
 let server,base,admin,participant,other,leader,team,team2,reg;
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
 try{
  server=app.listen(0,'127.0.0.1');await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});base=`http://127.0.0.1:${server.address().port}`;
  await t.test('health, public lists, missing routes and auth guards',async()=>{
   assert.deepEqual(await request('GET','/api/health'),{status:'ok',database:'connected'});
   for(const path of ['/api/events','/api/faculty','/api/team'])assert.ok(Array.isArray(await request('GET',path)));
   for(const path of ['/api/auth/me','/api/admin/events','/api/admin/leaders','/api/admin/dashboard','/api/registrations/me','/api/leader/session'])await request('GET',path,undefined,null,401);
   for(const path of ['/api/payments/order','/api/payments/verify','/api/payments/webhook','/api/admin/payments'])await request('GET',path,undefined,null,404);
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
   await request('POST','/api/leader/team',{name:'Integration team'},null,401);
   team=await request('POST','/api/leader/team',{name:'Integration team'},leader.token,201);
   await request('POST','/api/leader/team',{name:'Duplicate team'},leader.token,409);
   assert.equal((await request('GET','/api/leader/team',undefined,leader.token)).remaining_slots,1);
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
  await t.test('leader creates a three-person team and can allocate only two other students',async()=>{
   const ev=await event('three-person-team',{team_size:3});
   for(const u of [admin,participant,other])await request('POST','/api/events/'+ev.id+'/register',undefined,u.token,201);
   const l=await request('POST','/api/admin/events/'+ev.id+'/leaders',{user_id:admin.user.id},admin.token,201);
   const login=await request('POST','/api/leader/login',{leader_id:l.leader_code,password:l.one_time_password});
   await request('POST','/api/leader/team',{name:'Three people'},login.token,201);
   assert.equal((await request('GET','/api/leader/team',undefined,login.token)).remaining_slots,2);
   const first=await request('POST','/api/leader/team/spin',undefined,login.token);
   const second=await request('POST','/api/leader/team/spin',undefined,login.token);
   assert.notEqual(first.selected.id,second.selected.id);assert.ok(first.selected.full_name);assert.equal(second.remaining_slots,0);
   await request('POST','/api/leader/team/spin',undefined,login.token,409);
   const roster=await request('GET','/api/leader/team',undefined,login.token);
   assert.equal(roster.total_members,3);assert.equal(roster.members.length,2);assert.ok(roster.leader_name);
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
   const managedEvents=await request('GET','/api/admin/events?limit=100',undefined,admin.token);
   assert.ok(managedEvents.some(e=>e.status==='DRAFT'),'Admin can see draft events');
   const managedLeaders=await request('GET','/api/admin/leaders?event_id='+leader.event_id,undefined,admin.token);
   assert.ok(managedLeaders.some(l=>l.id===leader.id));
   assert.ok(managedLeaders.every(l=>!('credential_hash' in l)&&!('one_time_password' in l)));
   for(const path of ['/api/admin/events','/api/admin/leaders','/api/admin/payments/upi'])await request('GET',path,undefined,participant.token,403);
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
  await query('DELETE FROM club.registrations WHERE event_id=ANY($1::uuid[])',[events]);
  await query('DELETE FROM club.events WHERE id=ANY($1::uuid[])',[events]);
  await query('DELETE FROM club.audit_logs WHERE actor_id=ANY($1::uuid[])',[users]);
  await query('DELETE FROM club.notification_outbox WHERE recipient LIKE $1',[marker+'%']);
  await query('DELETE FROM club.contact_messages WHERE subject=$1',[marker]);
  for(const row of content)await query(`DELETE FROM club.${row.kind==='faculty'?'faculty':'student_team'} WHERE id=$1`,[row.id]);
  await query('DELETE FROM club.users WHERE id=ANY($1::uuid[])',[users]);
  globalThis.fetch=realFetch;await pool.end();
 }
});
