import {Router} from 'express';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import {z} from 'zod';
import {rateLimit} from 'express-rate-limit';
import {query,tx} from './db.js';
import {auth,role,handler,validate,fail,audit} from './utils.js';
import {enqueueMail} from './notifications.js';
import {generateLeaderPassword} from './leader-password.js';
import {participantUpdate,settingsSchema} from './feature-schemas.js';
const r=Router(),admin=[auth,role('ADMIN')];
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const password=z.string().min(10).max(128);
const recoveryLimit=rateLimit({windowMs:15*60_000,limit:15,standardHeaders:'draft-7',legacyHeaders:false});
const emailLimit=rateLimit({windowMs:15*60_000,limit:3,keyGenerator:req=>digest(req.body.email),standardHeaders:'draft-7',legacyHeaders:false});
const genericReset={ok:true,message:'If an active account exists for this email, a password reset link will be sent.'};

r.get('/settings',handler(async(_req,res)=>{const result=await query('SELECT settings FROM club.club_settings WHERE singleton=true');res.json(result.rows[0]?.settings||{})}));
r.get('/admin/settings',...admin,handler(async(_req,res)=>{const result=await query('SELECT settings,updated_at FROM club.club_settings WHERE singleton=true');res.json(result.rows[0]||{settings:{},updated_at:null})}));
r.patch('/admin/settings',...admin,validate(settingsSchema),handler(async(req,res)=>{
 const result=await tx(async c=>{const saved=await c.query(`INSERT INTO club.club_settings(singleton,settings,updated_by) VALUES(true,$1::jsonb,$2) ON CONFLICT(singleton) DO UPDATE SET settings=club.club_settings.settings||EXCLUDED.settings,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING settings,updated_at`,[JSON.stringify(req.body),req.user.id]);await audit(c,req.user.id,'ADMIN_UPDATED_SETTINGS',null,{fields:Object.keys(req.body)});return saved.rows[0]});res.json(result);
}));
r.patch('/auth/me',auth,validate(participantUpdate),handler(async(req,res)=>{
 const keys=Object.keys(req.body);await query(`UPDATE club.participant_profiles SET ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')} WHERE user_id=$${keys.length+1}`,[...Object.values(req.body),req.user.id]);const result=await query('SELECT u.id,u.email,u.role,p.full_name,p.phone,p.department,p.academic_year,p.college,p.roll_number,p.branch,p.bio,p.github,p.linkedin,p.portfolio FROM club.users u JOIN club.participant_profiles p ON p.user_id=u.id WHERE u.id=$1',[req.user.id]);res.json(result.rows[0]);
}));
r.post('/auth/forgot-password',recoveryLimit,validate(z.object({email:z.email().toLowerCase()}).strict()),emailLimit,handler(async(req,res)=>{
 let appUrl;try{appUrl=new URL(process.env.APP_URL||'http://localhost:5173');if(!['http:','https:'].includes(appUrl.protocol)||(process.env.NODE_ENV==='production'&&(!process.env.APP_URL||appUrl.protocol!=='https:')))throw Error()}catch{fail(503,'Password recovery URL is not configured')}
 const token=crypto.randomBytes(32).toString('hex');appUrl.hash='/reset-password?token='+token;
 await tx(async c=>{const user=(await c.query('SELECT id,email FROM club.users WHERE email=$1 AND is_active=true FOR UPDATE',[req.body.email])).rows[0];if(!user)return;await c.query('DELETE FROM club.password_reset_tokens WHERE user_id=$1',[user.id]);await c.query("INSERT INTO club.password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '30 minutes')",[user.id,digest(token)]);await enqueueMail(c,'password_reset',user.email,'Reset your Coding Club password',{url:appUrl.toString()});});res.json(genericReset);
}));
r.post('/auth/reset-password',recoveryLimit,validate(z.object({token:z.string().regex(/^[a-f0-9]{64}$/),password}).strict()),handler(async(req,res)=>{
 const tokenHash=digest(req.body.token);const hash=await argon2.hash(req.body.password,{type:argon2.argon2id});
 await tx(async c=>{
  // Lock the user first, as the request-reset path does, so concurrent resets cannot deadlock.
  const found=(await c.query('SELECT user_id FROM club.password_reset_tokens WHERE token_hash=$1',[tokenHash])).rows[0];if(!found)fail(400,'Invalid or expired reset link');
  const user=(await c.query('SELECT id FROM club.users WHERE id=$1 AND is_active=true FOR UPDATE',[found.user_id])).rows[0];if(!user)fail(400,'Invalid or expired reset link');
  const reset=(await c.query('SELECT id FROM club.password_reset_tokens WHERE token_hash=$1 AND user_id=$2 AND used_at IS NULL AND expires_at>now() FOR UPDATE',[tokenHash,user.id])).rows[0];if(!reset)fail(400,'Invalid or expired reset link');
  await c.query('UPDATE club.users SET password_hash=$1,token_version=token_version+1 WHERE id=$2',[hash,user.id]);await c.query('UPDATE club.password_reset_tokens SET used_at=now() WHERE user_id=$1',[user.id]);await c.query('UPDATE club.leader_sessions SET revoked_at=now() WHERE leader_id IN (SELECT id FROM club.event_leaders WHERE user_id=$1) AND revoked_at IS NULL',[user.id]);await audit(c,user.id,'USER_RESET_PASSWORD',user.id);
 });res.json({ok:true});
}));
r.post('/admin/leaders/:id/reset-password',...admin,handler(async(req,res)=>{
 const pwd=generateLeaderPassword(),hash=await argon2.hash(pwd,{type:argon2.argon2id});
 const leader=await tx(async c=>{const result=await c.query('UPDATE club.event_leaders SET credential_hash=$1 WHERE id=$2 RETURNING id,event_id,user_id,leader_code,is_active',[hash,req.params.id]);if(!result.rowCount)fail(404,'Leader not found');await c.query('UPDATE club.leader_sessions SET revoked_at=now() WHERE leader_id=$1 AND revoked_at IS NULL',[req.params.id]);await audit(c,req.user.id,'ADMIN_RESET_LEADER_PASSWORD',req.params.id);return result.rows[0]});res.json({...leader,one_time_password:pwd});
}));
r.patch('/admin/leaders/:id',...admin,validate(z.object({is_active:z.boolean()}).strict()),handler(async(req,res)=>{
 const leader=await tx(async c=>{const found=(await c.query('SELECT * FROM club.event_leaders WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];if(!found)fail(404,'Leader not found');if(req.body.is_active){const reg=await c.query("SELECT id FROM club.registrations WHERE event_id=$1 AND user_id=$2 AND status='CONFIRMED'",[found.event_id,found.user_id]);if(!reg.rowCount)fail(409,'Leader must be a confirmed participant')}
 const result=await c.query('UPDATE club.event_leaders SET is_active=$1 WHERE id=$2 RETURNING id,event_id,user_id,leader_code,is_active',[req.body.is_active,found.id]);if(!req.body.is_active)await c.query('UPDATE club.leader_sessions SET revoked_at=now() WHERE leader_id=$1 AND revoked_at IS NULL',[found.id]);await audit(c,req.user.id,'ADMIN_CHANGED_LEADER_STATUS',found.id,{is_active:req.body.is_active});return result.rows[0]});res.json(leader);
}));
r.patch('/admin/registrations/:id',...admin,validate(z.object({status:z.enum(['PENDING','CONFIRMED','CANCELLED']),reason:z.string().trim().min(3).max(300)}).strict()),handler(async(req,res)=>{
 const result=await tx(async c=>{
  const reference=(await c.query('SELECT event_id,user_id FROM club.registrations WHERE id=$1',[req.params.id])).rows[0];if(!reference)fail(404,'Registration not found');
  const event=(await c.query('SELECT id,max_participants,status FROM club.events WHERE id=$1 FOR UPDATE',[reference.event_id])).rows[0];
  const leaders=await c.query('SELECT id FROM club.event_leaders WHERE event_id=$1 AND user_id=$2 ORDER BY id FOR UPDATE',[reference.event_id,reference.user_id]);
  await c.query('SELECT id FROM club.teams WHERE leader_id=ANY($1::uuid[]) OR id IN (SELECT team_id FROM club.team_members WHERE registration_id=$2) ORDER BY id FOR UPDATE',[leaders.rows.map(l=>l.id),req.params.id]);
  const reg=(await c.query('SELECT * FROM club.registrations WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
  if(reg.status===req.body.status)return reg;
  if(req.body.status!=='CANCELLED'&&['CANCELLED','ARCHIVED'].includes(event.status))fail(409,'Cannot restore a registration for a cancelled or archived event');
  if(reg.status==='CANCELLED'&&req.body.status!=='CANCELLED'){const count=Number((await c.query("SELECT count(*) n FROM club.registrations WHERE event_id=$1 AND status!='CANCELLED'",[event.id])).rows[0].n);if(count>=event.max_participants)fail(409,'Event full')}
  if(req.body.status==='PENDING'){const paid=await c.query("SELECT id FROM club.payments WHERE registration_id=$1 AND status='PAID'",[reg.id]);if(paid.rowCount)fail(409,'A paid registration cannot be marked pending')}
  if(req.body.status!=='CONFIRMED'){
   await c.query('DELETE FROM club.team_members WHERE registration_id=$1',[reg.id]);
   await c.query('UPDATE club.event_leaders SET is_active=false WHERE id=ANY($1::uuid[])',[leaders.rows.map(l=>l.id)]);
   await c.query('UPDATE club.leader_sessions SET revoked_at=now() WHERE leader_id=ANY($1::uuid[]) AND revoked_at IS NULL',[leaders.rows.map(l=>l.id)]);
  }
  const changed=(await c.query('UPDATE club.registrations SET status=$1 WHERE id=$2 RETURNING *',[req.body.status,reg.id])).rows[0];
  await audit(c,req.user.id,'ADMIN_CHANGED_REGISTRATION_STATUS',reg.id,{from:reg.status,to:changed.status,reason:req.body.reason,payment_status_unchanged:true});return changed;
 });res.json(result);
}));
export default r;
