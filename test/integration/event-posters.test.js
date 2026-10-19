import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import app from '../../src/app.js';
import {query,pool} from '../../src/db.js';

test('poster announcements preserve dates, hide drafts and block unannounced registration',{timeout:60000},async()=>{
 const marker='poster-'+randomUUID(),password='Poster-test-password-2026!',users=[];let event;
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port+'/api';
 async function request(method,path,body,token,status=200){
  const response=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
  const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));return data;
 }
 try{
  async function account(label){const email=marker+'-'+label+'@example.invalid';const a=await request('POST','/auth/register',{email,password,full_name:'Poster '+label},null,201);users.push(a.user.id);return {...a,email};}
  const admin=await account('admin'),student=await account('student');
  await query("UPDATE club.users SET role='ADMIN' WHERE id=$1",[admin.user.id]);
  admin.token=(await request('POST','/auth/login',{email:admin.email,password})).token;
  const presentation={end_date:'2099-01-03',poster_format:'portrait',schedule_pending:true,registration_pending:true,capacity_pending:true,organiser:'Coding Club'};
  event=await request('POST','/admin/events',{title:'Poster event',slug:marker,event_date:'2099-01-01',start_time:'00:00',end_time:'23:59',venue:'College',registration_fee:0,team_size:3,max_participants:1,registration_start:'2020-01-01T00:00:00Z',registration_deadline:'2098-12-31T00:00:00Z',status:'DRAFT',presentation},admin.token,201);
  await request('GET','/events/'+marker,undefined,null,404);
  await request('PATCH','/admin/events/'+event.id,{status:'CLOSED'},admin.token);
  const published=await request('GET','/events/'+marker);assert.deepEqual(published.presentation,presentation);
  await request('PATCH','/admin/events/'+event.id,{presentation:{end_date:'not-a-date'}},admin.token,400);
  await request('PATCH','/admin/events/'+event.id,{status:'OPEN'},admin.token);
  const blocked=await request('POST','/events/'+event.id+'/register',{},student.token,409);
  assert.match(blocked.error,/not been announced/);
 }finally{
  await new Promise(resolve=>server.close(resolve));
  if(event){await query('DELETE FROM club.events WHERE id=$1',[event.id]);await query('DELETE FROM club.audit_logs WHERE target_id=$1',[event.id]);}
  await query('DELETE FROM club.audit_logs WHERE actor_id=ANY($1::uuid[])',[users]);
  await query('DELETE FROM club.users WHERE id=ANY($1::uuid[])',[users]);
  await pool.end();
 }
});
