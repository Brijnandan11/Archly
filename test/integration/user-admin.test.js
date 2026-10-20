import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

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

test('admin user management: list, update, delete with dependent record cleanup',{timeout:120_000},async()=>{
 assertConfig();await query('SELECT 1');
 const marker='user-admin-'+crypto.randomUUID();
 const users=[];let server,base,admin,participant,cancelled;
 const password='Integration-test-password-2026!';
 async function request(method,path,body,token,expected=200){
  const headers={};if(token)headers.Authorization='Bearer '+token;
  if(body!==undefined)headers['Content-Type']='application/json';
  const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();let data;try{data=JSON.parse(text)}catch{data=text}
  assert.equal(response.status,expected,`${method} ${path}: ${text}`);return data;
 }
 try{
  server=app.listen(0,'127.0.0.1');await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject)});base=`http://127.0.0.1:${server.address().port}`;
  const email=label=>`${marker}-${label}@example.invalid`;
  const passwordHash=await (await import('argon2')).hash(password);
  admin=(await query(`INSERT INTO club.users(email,password_hash,role) VALUES($1,$2,'ADMIN') RETURNING id,email`,[email('admin'),passwordHash])).rows[0];users.push(admin.id);
  participant=(await query(`INSERT INTO club.users(email,password_hash) VALUES($1,$2) RETURNING id,email`,[email('participant'),passwordHash])).rows[0];users.push(participant.id);
  await query(`INSERT INTO club.participant_profiles(user_id,full_name,department,academic_year,college) VALUES($1,'User Admin Participant','Testing',2,'Integration College')`,[participant.id]);
  await query(`INSERT INTO club.participant_profiles(user_id,full_name,department,academic_year,college) VALUES($1,'User Admin Admin','Testing',2,'Integration College')`,[admin.id]);
  const tokens=await Promise.all([admin,participant].map(async u=>(await request('POST','/api/auth/login',{email:u.email,password})).token));
  [admin.token,participant.token]=tokens;
  await request('GET','/api/admin/users',undefined,participant.token,403);
  await request('DELETE','/api/admin/users/'+admin.id,undefined,participant.token,403);
  const listed=await request('GET','/api/admin/users?search='+encodeURIComponent('User Admin Participant'),undefined,admin.token);
  const row=listed.find(x=>x.id===participant.id);
  assert.equal(row.role,'PARTICIPANT');assert.equal(row.is_active,true);assert.equal(row.department,'Testing');assert.equal(row.email,participant.email);
  await request('PATCH','/api/admin/users/'+participant.id,{role:'ADMIN',reason:'x'},admin.token,400);
  await request('PATCH','/api/admin/users/'+admin.id,{role:'PARTICIPANT'},admin.token,409);
  await request('PATCH','/api/admin/users/'+participant.id,{is_active:false},admin.token);
  assert.equal((await request('GET','/api/admin/users?search='+encodeURIComponent('User Admin Participant'),undefined,admin.token)).find(x=>x.id===participant.id).is_active,false);
  // Deactivated users cannot sign in and existing tokens are revoked.
  await request('POST','/api/auth/login',{email:participant.email,password},null,401);
  await request('GET','/api/auth/me',undefined,participant.token,401);
  await request('PATCH','/api/admin/users/'+participant.id,{is_active:true},admin.token);
  participant.token=(await request('POST','/api/auth/login',{email:participant.email,password})).token;
  await request('GET','/api/auth/me',undefined,participant.token);
  await request('DELETE','/api/admin/users/'+admin.id,undefined,admin.token,409);
  // Registration creation through the public flow needs an open event; reuse the admin-created event and free registration.
  const ev=(await request('POST','/api/admin/events',{title:'User Admin Delete Event',slug:marker+'-event',event_date:'2099-01-01',start_time:'10:00',end_time:'12:00',venue:'Test venue',registration_fee:0,team_size:2,max_participants:10,registration_start:'2020-01-01T00:00:00Z',registration_deadline:'2098-12-31T00:00:00Z',status:'OPEN'},admin.token,201));
  const reg=await request('POST','/api/events/'+ev.id+'/register',undefined,participant.token,201);
  assert.equal(reg.status,'CONFIRMED');
  // Team setup: participant is granted a leader profile, but the team itself is owned by the admin so the participant can also be an ordinary member.
  const leader=await request('POST','/api/admin/events/'+ev.id+'/leaders',{user_id:participant.id},admin.token,201);
  await request('POST','/api/leader/login',{leader_id:leader.leader_code,password:'wrong'},null,401);
  // Deleting a registration cascades its payment and submission records; the rest is covered by user deletion below.
  await request('DELETE','/api/admin/registrations/'+reg.id,undefined,admin.token);
  assert.equal((await request('GET','/api/admin/users?search='+encodeURIComponent('User Admin Participant'),undefined,admin.token)).find(x=>x.id===participant.id).registrations,0);
  assert.ok(!(await request('GET','/api/admin/registrations?event_id='+ev.id,undefined,admin.token)).some(x=>x.id===reg.id));
  // Re-register, allocate into the team, then delete the whole account in one call.
  const reg2=await request('POST','/api/events/'+ev.id+'/register',undefined,participant.token,201);
  const adminReg=await request('POST','/api/events/'+ev.id+'/register',undefined,admin.token,201);
  const adminLeader=await request('POST','/api/admin/events/'+ev.id+'/leaders',{user_id:admin.id},admin.token,201);
  const team=await request('POST','/api/admin/events/'+ev.id+'/teams',{leader_id:adminLeader.id,name:'User Admin Team'},admin.token,201);
  // The event-leader rule excludes leaders from ordinary membership, so a third account fills the team; deleting that user proves the member rows are cleaned up.
  const third=(await query(`INSERT INTO club.users(email,password_hash) VALUES($1,$2) RETURNING id,email`,[email('third'),passwordHash])).rows[0];users.push(third.id);
  await query(`INSERT INTO club.participant_profiles(user_id,full_name) VALUES($1,'User Admin Third')`,[third.id]);
  const thirdToken=(await request('POST','/api/auth/login',{email:third.email,password})).token;
  const reg3=await request('POST','/api/events/'+ev.id+'/register',undefined,thirdToken,201);
  await request('POST','/api/admin/teams/'+team.id+'/members',{registration_id:reg3.id},admin.token,201);
  await request('DELETE','/api/admin/users/'+participant.id,undefined,admin.token);
  users.splice(users.indexOf(participant.id),1);
  assert.ok(!(await request('GET','/api/admin/users?search='+encodeURIComponent('User Admin Participant'),undefined,admin.token)).length);
  await request('POST','/api/auth/login',{email:participant.email,password},null,401);
  assert.equal((await query('SELECT count(*)::int n FROM club.registrations WHERE user_id=$1',[participant.id])).rows[0].n,0);
  // Admin's own registration remains; participant's team leadership and session rows are gone.
  assert.equal((await query('SELECT count(*)::int n FROM club.event_leaders WHERE user_id=$1',[participant.id])).rows[0].n,0);
  assert.equal((await query('SELECT count(*)::int n FROM club.team_members WHERE registration_id IN (SELECT id FROM club.registrations WHERE user_id=$1)',[participant.id])).rows[0].n,0);
  assert.equal((await query('SELECT count(*)::int n FROM club.participant_profiles WHERE user_id=$1',[participant.id])).rows[0].n,0);
  assert.equal((await query('SELECT count(*)::int n FROM club.audit_logs WHERE actor_id=$1',[participant.id])).rows[0].n,0);
  assert.ok((await query('SELECT count(*)::int n FROM club.audit_logs WHERE action=\'ADMIN_DELETED_USER\' AND target_id=$1',[participant.id])).rows[0].n>=1);
 }finally{
  if(server)await new Promise(resolve=>server.close(resolve));
  if(cancelled)try{await query('DELETE FROM club.event_leaders WHERE user_id=ANY($1::uuid[])',[users])}catch{}
  await query('DELETE FROM club.team_members WHERE event_id IN (SELECT e.id FROM club.events e WHERE e.slug LIKE $1)',['%'+marker+'%']);
  await query('DELETE FROM club.teams WHERE event_id IN (SELECT e.id FROM club.events e WHERE e.slug LIKE $1)',['%'+marker+'%']);
  await query('DELETE FROM club.event_leaders WHERE event_id IN (SELECT e.id FROM club.events e WHERE e.slug LIKE $1)',['%'+marker+'%']);
  await query('DELETE FROM club.registrations WHERE event_id IN (SELECT e.id FROM club.events e WHERE e.slug LIKE $1)',['%'+marker+'%']);
  await query('DELETE FROM club.events WHERE slug LIKE $1',['%'+marker+'%']);
  await query('DELETE FROM club.audit_logs WHERE actor_id=ANY($1::uuid[]) OR action=\'ADMIN_DELETED_USER\' AND target_id::text=ANY($2::text[])',[users,users.map(String)]);
  await query('DELETE FROM club.notification_outbox WHERE recipient LIKE $1',[marker+'%']);
  await query('DELETE FROM club.users WHERE id=ANY($1::uuid[])',[users]);
  globalThis.fetch=realFetch;await pool.end();
 }
});
