import {Router} from 'express';
import argon2 from 'argon2';
import crypto from 'node:crypto';
import {z} from 'zod';
import {rateLimit} from 'express-rate-limit';
import {query,tx} from './db.js';
import {enqueueMail} from './notifications.js';
import {auth,role,handler,validate,fail,audit,pagination} from './utils.js';
import {memberCapacity,remainingSlots} from './team-capacity.js';
const r=Router(), uuid=z.string().uuid(), str=z.string().trim();
const admin=[auth,role('ADMIN')];
// Admin read endpoints include drafts and operational records; credentials never leave these lists.
r.get('/admin/events',...admin,handler(async(req,res)=>{const {limit,offset}=pagination(req.query);const result=await query('SELECT * FROM club.events ORDER BY event_date DESC,id LIMIT $1 OFFSET $2',[limit,offset]);res.json(result.rows)}));
r.get('/admin/leaders',...admin,handler(async(req,res)=>{const {limit,offset}=pagination(req.query);const eventId=req.query.event_id||null;if(eventId&&!uuid.safeParse(eventId).success)fail(400,'Invalid event ID');const result=await query(`SELECT l.id,l.event_id,l.user_id,l.leader_code,l.is_active,l.created_at,p.full_name,u.email,e.title AS event_title,t.id AS team_id,t.name AS team_name FROM club.event_leaders l JOIN club.users u ON u.id=l.user_id JOIN club.participant_profiles p ON p.user_id=l.user_id JOIN club.events e ON e.id=l.event_id LEFT JOIN club.teams t ON t.leader_id=l.id WHERE ($1::uuid IS NULL OR l.event_id=$1) ORDER BY l.created_at DESC,l.id LIMIT $2 OFFSET $3`,[eventId,limit,offset]);res.json(result.rows)}));
// Leader sessions are persisted in PostgreSQL, shared across all server instances.
const lead=handler(async(req,res,next)=>{
 const bearer=/^Bearer (.+)$/i.exec(req.headers.authorization||'')?.[1];
 if(!bearer)fail(401,'Leader session required');
 const digest=crypto.createHash('sha256').update(bearer).digest('hex');
 const session=await query('SELECT leader_id FROM club.leader_sessions WHERE token_hash=$1 AND expires_at>now() AND revoked_at IS NULL',[digest]);
 if(!session.rows[0])fail(401,'Leader session expired');
 const {rows}=await query('SELECT l.id,l.event_id,l.user_id,l.leader_code,p.full_name,u.is_active AS user_active,l.is_active FROM club.event_leaders l JOIN club.users u ON u.id=l.user_id JOIN club.participant_profiles p ON p.user_id=l.user_id WHERE l.id=$1',[session.rows[0].leader_id]);
 if(!rows[0]?.is_active||!rows[0]?.user_active)fail(401,'Leader inactive');req.leader=rows[0];req.leaderDigest=digest;next();
});
r.post('/leader/login',rateLimit({windowMs:15*60_000,limit:10,standardHeaders:'draft-7',legacyHeaders:false}),validate(z.object({leader_id:str.min(3),password:z.string().min(1)}).strict()),handler(async(req,res)=>{
 const token=crypto.randomBytes(32).toString('base64url');
 const l=await tx(async c=>{
  const {rows}=await c.query('SELECT l.id,l.event_id,l.user_id,l.leader_code,l.credential_hash,l.is_active,u.is_active AS user_active FROM club.event_leaders l JOIN club.users u ON u.id=l.user_id WHERE l.leader_code=$1 FOR UPDATE OF l',[req.body.leader_id]);
  const leader=rows[0];if(!leader?.is_active||!leader.user_active||!await argon2.verify(leader.credential_hash,req.body.password))fail(401,'Invalid credentials');
  await c.query("INSERT INTO club.leader_sessions(leader_id,token_hash,expires_at) VALUES($1,$2,now()+interval '8 hours')",[leader.id,crypto.createHash('sha256').update(token).digest('hex')]);return leader;
 });
 res.json({token,expires_in:28800,leader_id:l.leader_code,event_id:l.event_id});
}));
r.post('/leader/logout',lead,handler(async(req,res)=>{await query('UPDATE club.leader_sessions SET revoked_at=now() WHERE token_hash=$1',[req.leaderDigest]);res.json({ok:true});}));
r.get(['/leader/session','/leader/me'],lead,(req,res)=>res.json({leader_id:req.leader.leader_code,event_id:req.leader.event_id,user_id:req.leader.user_id,full_name:req.leader.full_name}));
r.get('/leader/event',lead,handler(async(req,res)=>{const a=await query('SELECT id,title,slug,event_date,start_time,end_time,venue,team_size,status FROM club.events WHERE id=$1',[req.leader.event_id]);if(!a.rows[0])fail(404,'Event not found');res.json(a.rows[0]);}));
r.post('/leader/team',lead,validate(z.object({name:str.min(2).max(100)}).strict()),handler(async(req,res)=>{
 const team=await tx(async c=>{
  const leader=(await c.query('SELECT l.id,e.status FROM club.event_leaders l JOIN club.events e ON e.id=l.event_id WHERE l.id=$1 AND l.is_active=true FOR UPDATE OF l',[req.leader.id])).rows[0];
  if(!leader)fail(401,'Leader inactive');
  if(!['OPEN','CLOSED'].includes(leader.status))fail(409,'Team creation is unavailable for this event');
  const registration=await c.query("SELECT id FROM club.registrations WHERE event_id=$1 AND user_id=$2 AND status='CONFIRMED' FOR UPDATE",[req.leader.event_id,req.leader.user_id]);
  if(!registration.rowCount)fail(409,'Your event registration must be confirmed');
  if((await c.query('SELECT id FROM club.teams WHERE leader_id=$1',[req.leader.id])).rowCount)fail(409,'You already have a team');
  const row=(await c.query('INSERT INTO club.teams(event_id,leader_id,name) VALUES($1,$2,$3) RETURNING *',[req.leader.event_id,req.leader.id,req.body.name])).rows[0];
  await audit(c,req.leader.user_id,'LEADER_CREATED_TEAM',row.id,{event_id:req.leader.event_id});return row;
 });res.status(201).json(team);
}));
r.get(['/leader/session/team','/leader/team'],lead,handler(async(req,res)=>{const a=await query('SELECT t.*,e.team_size FROM club.teams t JOIN club.events e ON e.id=t.event_id WHERE t.leader_id=$1',[req.leader.id]);if(!a.rows[0])fail(404,'Team not found');const b=await query('SELECT p.full_name,r.registration_code FROM club.team_members tm JOIN club.registrations r ON r.id=tm.registration_id JOIN club.participant_profiles p ON p.user_id=r.user_id WHERE tm.team_id=$1 ORDER BY tm.joined_at',[a.rows[0].id]);res.json({...a.rows[0],leader_name:req.leader.full_name,members:b.rows,total_members:b.rows.length+1,remaining_slots:remainingSlots(a.rows[0].team_size,b.rows.length)});}));
// This endpoint reuses the same locking and unique constraints as the existing spin endpoint.
r.post(['/leader/session/team/spin','/leader/team/spin'],lead,handler(async(req,res)=>{const result=await tx(async c=>{
 const active=await c.query('SELECT id FROM club.event_leaders WHERE id=$1 AND is_active=true FOR UPDATE',[req.leader.id]);if(!active.rowCount)fail(401,'Leader inactive');
 const t=(await c.query('SELECT t.*,e.team_size FROM club.teams t JOIN club.events e ON e.id=t.event_id WHERE t.leader_id=$1 FOR UPDATE OF t',[req.leader.id])).rows[0];if(!t)fail(404,'Team not found');if(t.locked)fail(409,'Team locked');
 const n=Number((await c.query('SELECT count(*) n FROM club.team_members WHERE team_id=$1',[t.id])).rows[0].n);if(n>=memberCapacity(t.team_size))fail(409,'Team full');
 const v=(await c.query(`SELECT rg.id,rg.registration_code,p.full_name FROM club.registrations rg JOIN club.participant_profiles p ON p.user_id=rg.user_id WHERE rg.event_id=$1 AND rg.status='CONFIRMED' AND NOT EXISTS(SELECT 1 FROM club.event_leaders l WHERE l.event_id=rg.event_id AND l.user_id=rg.user_id) AND NOT EXISTS(SELECT 1 FROM club.team_members m WHERE m.event_id=rg.event_id AND m.registration_id=rg.id) ORDER BY random() LIMIT 1 FOR UPDATE OF rg SKIP LOCKED`,[t.event_id])).rows[0];
 if(!v)fail(409,'No eligible participants');
 const ins=await c.query('INSERT INTO club.team_members(team_id,event_id,registration_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING registration_id',[t.id,t.event_id,v.id]);if(!ins.rowCount)fail(409,'Participant claimed by concurrent request');return {selected:v,team_id:t.id,remaining_slots:remainingSlots(t.team_size,n+1)};});res.json(result);
}));
r.get('/admin/registrations/export',...admin,handler(async(req,res)=>{
 const ev=req.query.event_id||null;if(ev&&!uuid.safeParse(ev).success)fail(400,'Invalid event ID');
 const q=await query(`SELECT r.registration_code,e.title as event,u.email,p.full_name,p.phone,p.college,p.roll_number,p.branch,p.department,p.academic_year,r.status,r.created_at FROM club.registrations r JOIN club.events e ON e.id=r.event_id JOIN club.users u ON u.id=r.user_id JOIN club.participant_profiles p ON p.user_id=r.user_id WHERE ($1::uuid IS NULL OR r.event_id=$1) ORDER BY r.created_at DESC LIMIT 50000`,[ev]);
 const fields=['registration_code','event','email','full_name','phone','college','roll_number','branch','department','academic_year','status','created_at'];const cell=x=>'"'+String(x??'').replace(/^[=+@\-\t\r]/,'\'$&').replaceAll('"','""')+'"';
 res.type('text/csv').set('Content-Disposition','attachment; filename="coding-club-registrations.csv"').send([fields.join(','),...q.rows.map(row=>fields.map(f=>cell(row[f])).join(','))].join('\r\n'));
}));
r.post('/admin/teams/:id/members',...admin,validate(z.object({registration_id:uuid}).strict()),handler(async(req,res)=>{const out=await tx(async c=>{
 const t=(await c.query('SELECT t.*,e.team_size FROM club.teams t JOIN club.events e ON e.id=t.event_id WHERE t.id=$1 FOR UPDATE OF t',[req.params.id])).rows[0];if(!t)fail(404,'Team not found');if(t.locked)fail(409,'Team locked');
 const count=Number((await c.query('SELECT count(*) n FROM club.team_members WHERE team_id=$1',[t.id])).rows[0].n);if(count>=memberCapacity(t.team_size))fail(409,'Team full');
 const reg=(await c.query("SELECT r.id FROM club.registrations r WHERE r.id=$1 AND r.event_id=$2 AND r.status='CONFIRMED' AND NOT EXISTS (SELECT 1 FROM club.event_leaders l WHERE l.event_id=r.event_id AND l.user_id=r.user_id) FOR UPDATE OF r",[req.body.registration_id,t.event_id])).rows[0];if(!reg)fail(409,'Participant not eligible');
 const row=await c.query('INSERT INTO club.team_members(team_id,event_id,registration_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *',[t.id,t.event_id,reg.id]);if(!row.rowCount)fail(409,'Already in team');await audit(c,req.user.id,'ADMIN_ADDED_TEAM_MEMBER',t.id,{registration_id:reg.id});return row.rows[0];});res.status(201).json(out);
}));
r.delete('/admin/teams/:id/members/:registrationId',...admin,handler(async(req,res)=>{const out=await tx(async c=>{const t=(await c.query('SELECT * FROM club.teams WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];if(!t)fail(404,'Team not found');const q=await c.query('DELETE FROM club.team_members WHERE team_id=$1 AND registration_id=$2 RETURNING *',[t.id,req.params.registrationId]);if(!q.rowCount)fail(404,'Member not found');await audit(c,req.user.id,'ADMIN_REMOVED_TEAM_MEMBER',t.id,{registration_id:req.params.registrationId});return q.rows[0]});res.json(out);}));
r.patch('/admin/teams/:id/leader',...admin,validate(z.object({leader_id:uuid}).strict()),handler(async(req,res)=>{const row=await tx(async c=>{const t=(await c.query('SELECT * FROM club.teams WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];if(!t)fail(404,'Team not found');const q=await c.query('UPDATE club.teams SET leader_id=$1 WHERE id=$2 RETURNING *',[req.body.leader_id,t.id]);await audit(c,req.user.id,'ADMIN_CHANGED_LEADER',t.id,{leader_id:req.body.leader_id});return q.rows[0]});res.json(row);}));
r.get('/admin/teams/:id/members',...admin,handler(async(req,res)=>{const a=await query('SELECT m.*,p.full_name,r.registration_code FROM club.team_members m JOIN club.registrations r ON r.id=m.registration_id JOIN club.participant_profiles p ON p.user_id=r.user_id WHERE m.team_id=$1 ORDER BY m.joined_at',[req.params.id]);res.json(a.rows);}));
r.get('/admin/dashboard/summary',...admin,handler(async(req,res)=>{const {rows}=await query(`SELECT (SELECT count(*) FROM club.events)::int total_events,(SELECT count(*) FROM club.events WHERE event_date>=current_date AND status NOT IN('ARCHIVED','CANCELLED'))::int upcoming_events,(SELECT count(*) FROM club.events WHERE event_date<current_date)::int past_events,(SELECT count(*) FROM club.registrations)::int total_registrations,(SELECT count(*) FROM club.registrations WHERE status='CONFIRMED')::int confirmed_registrations,(SELECT count(*) FROM club.registrations WHERE status='PENDING')::int pending_registrations,(SELECT count(*) FROM club.event_leaders)::int total_leaders,(SELECT count(*) FROM club.teams)::int total_teams`);res.json(rows[0]);}));
export default r;
