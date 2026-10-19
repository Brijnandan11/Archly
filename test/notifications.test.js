import test from 'node:test';
import assert from 'node:assert/strict';
import {pool} from '../src/db.js';
import {deliverNotifications} from '../src/notifications.js';

function env(t,key,value){const previous=process.env[key];process.env[key]=value;t.after(()=>{if(previous===undefined)delete process.env[key];else process.env[key]=previous;});}

function fakeOutbox(t){
 const statements=[];let available=true;
 const task={id:'00000000-0000-4000-8000-000000000001',kind:'registration',recipient:'test@example.invalid',subject:'Test',payload:{code:'TEST001',event:'Test event'}};
 t.mock.method(pool,'connect',async()=>({
  query:async(sql,args)=>{statements.push({sql,args});if(sql.startsWith('SELECT id,kind')){const rows=available?[task]:[];available=false;return {rows};}return {rows:[],rowCount:1};},release(){}
 }));
 t.mock.method(pool,'query',async(sql,args)=>{statements.push({sql,args});return {rows:[],rowCount:1};});
 env(t,'RESEND_API_KEY','integration-placeholder');env(t,'MAIL_FROM','test@example.invalid');
 return {task,statements};
}

test('outbox delivery renders mail, uses stable idempotency key and marks sent',async t=>{
 const {task,statements}=fakeOutbox(t);
 env(t,'MAIL_REPLY_TO','codingclub@gecazamgarh.ac.in');
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  assert.equal(url,'https://api.resend.com/emails');
  assert.equal(options.headers['Idempotency-Key'],task.id);
  const body=JSON.parse(options.body);assert.equal(body.reply_to,'codingclub@gecazamgarh.ac.in');assert.deepEqual(body.to,[task.recipient]);assert.match(body.text,/TEST001.*Test event/);
  return Response.json({id:'email_test'});
 });
 assert.deepEqual(await deliverNotifications(2),{completed:1,failed:0});
 assert.ok(statements.some(x=>x.sql.includes("status='SENDING'")));
 assert.ok(statements.some(x=>x.sql.includes("status='SENT'")));
});

test('outbox provider failure schedules a retry instead of losing the task',async t=>{
 const {task,statements}=fakeOutbox(t);
 t.mock.method(globalThis,'fetch',async()=>Response.json({error:'unavailable'},{status:503}));
 assert.deepEqual(await deliverNotifications(1),{completed:0,failed:1});
 const failure=statements.find(x=>x.sql.startsWith('UPDATE')&&x.sql.includes("status='FAILED'"));assert.ok(failure);assert.equal(failure.args[0],task.id);assert.match(failure.args[1],/503/);assert.match(failure.sql,/next_attempt_at/);
});

test('outbox refuses delivery when sender configuration is missing',async t=>{
 env(t,'MAIL_FROM','');
 await assert.rejects(deliverNotifications(),/Email delivery not configured/);
});


test('password recovery mail contains the reset link and clears its payload after delivery',async t=>{
 const {task,statements}=fakeOutbox(t);task.kind='password_reset';task.payload={url:'https://club.example.invalid/#/reset-password?token=test-token'};
 t.mock.method(globalThis,'fetch',async(_url,options)=>{const body=JSON.parse(options.body);assert.match(body.text,/valid for 30 minutes/);assert.ok(body.text.includes(task.payload.url));return Response.json({id:'recovery-email'})});
 assert.deepEqual(await deliverNotifications(1),{completed:1,failed:0});assert.ok(statements.some(x=>x.sql.includes("payload=CASE WHEN kind='password_reset' THEN '{}'::jsonb")));
});
