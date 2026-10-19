import {Router} from 'express';
import {z} from 'zod';
import {auth,role,handler,validate,fail,audit} from './utils.js';
import {query,tx} from './db.js';
import {config} from './config.js';
import {deliverNotifications} from './notifications.js';
import {memberCapacity} from './team-capacity.js';
const r=Router(), uuid=z.string().uuid(), admin=[auth,role('ADMIN')];
r.post('/internal/notifications/process',handler(async(req,res)=>{
 const supplied=req.headers['x-worker-secret'];
 if(!process.env.WORKER_SECRET||typeof supplied!=='string'||supplied!==process.env.WORKER_SECRET)fail(401,'Unauthorized');
 res.json(await deliverNotifications(20));
}));
r.get('/admin/notifications',...admin,handler(async(req,res)=>{const data=await query('SELECT id,kind,recipient,subject,status,attempts,created_at,sent_at,last_error FROM club.notification_outbox ORDER BY created_at DESC LIMIT 100');res.json(data.rows);}));
r.post('/admin/notifications/:id/retry',...admin,handler(async(req,res)=>{const q=await query("UPDATE club.notification_outbox SET status='PENDING',next_attempt_at=now() WHERE id=$1 AND status='FAILED' RETURNING id",[req.params.id]);if(!q.rowCount)fail(404,'Failed notification not found');res.json(q.rows[0]);}));
r.post('/admin/teams/:id/move',...admin,validate(z.object({registration_id:uuid,destination_team_id:uuid}).strict()),handler(async(req,res)=>{
 const {registration_id,destination_team_id}=req.body;if(req.params.id===destination_team_id)fail(400,'Same team');
 const result=await tx(async c=>{
  const teams=(await c.query('SELECT t.*,e.team_size FROM club.teams t JOIN club.events e ON e.id=t.event_id WHERE t.id=ANY($1::uuid[]) ORDER BY t.id FOR UPDATE OF t',[[req.params.id,destination_team_id]])).rows;
  if(teams.length!==2)fail(404,'Team not found');const origin=teams.find(t=>t.id===req.params.id),dest=teams.find(t=>t.id===destination_team_id);
  if(origin.event_id!==dest.event_id)fail(409,'Teams must belong to same event');if(dest.locked)fail(409,'Destination locked');
  const count=await c.query('SELECT count(*)::int AS n FROM club.team_members WHERE team_id=$1',[dest.id]);if(count.rows[0].n>=memberCapacity(dest.team_size))fail(409,'Destination full');
  const moved=await c.query('UPDATE club.team_members SET team_id=$1 WHERE team_id=$2 AND registration_id=$3 RETURNING *',[dest.id,origin.id,registration_id]);if(!moved.rowCount)fail(404,'Team member not found');
  await audit(c,req.user.id,'ADMIN_MOVED_TEAM_MEMBER',dest.id,{from:origin.id,registration_id});return moved.rows[0];
 });res.json(result);
}));
r.post('/admin/payments/:id/refund',...admin,validate(z.object({amount:z.number().int().positive(),reason:z.string().min(3).max(200)}).strict()),handler(async(req,res)=>{
 if(!config.razorpay.key||!config.razorpay.secret)fail(503,'Payment gateway not configured');
 const payment=await tx(async c=>{const q=await c.query('SELECT * FROM club.payments WHERE id=$1 FOR UPDATE',[req.params.id]);const p=q.rows[0];if(!p||p.status!=='PAID'||!p.gateway_payment_id)fail(409,'Payment not refundable');
 const sum=await c.query("SELECT coalesce(sum(amount),0)::int AS amount FROM club.payment_refunds WHERE payment_id=$1 AND status IN ('PROCESSING','PROCESSED')",[p.id]);if(req.body.amount>p.amount-sum.rows[0].amount)fail(409,'Refund exceeds available amount');
 const rf=(await c.query('INSERT INTO club.payment_refunds(payment_id,amount) VALUES($1,$2) RETURNING id',[p.id,req.body.amount])).rows[0];await audit(c,req.user.id,'ADMIN_REFUND_REQUESTED',p.id,{refund_id:rf.id,amount:req.body.amount});return {...p,refund_id:rf.id};});
 const authHeader='Basic '+Buffer.from(config.razorpay.key+':'+config.razorpay.secret).toString('base64');
 try{const result=await fetch('https://api.razorpay.com/v1/payments/'+encodeURIComponent(payment.gateway_payment_id)+'/refund',{method:'POST',headers:{Authorization:authHeader,'Content-Type':'application/json','X-Razorpay-Idempotency-Key':payment.refund_id},body:JSON.stringify({amount:req.body.amount,notes:{reason:req.body.reason}})});if(!result.ok)throw Error('Gateway returned '+result.status);const rf=await result.json();await tx(async c=>{await c.query("SELECT id FROM club.payments WHERE id=$1 FOR UPDATE",[payment.id]);await c.query("UPDATE club.payment_refunds SET gateway_refund_id=$1,status=CASE WHEN $2='processed' THEN 'PROCESSED' ELSE 'PROCESSING' END,processed_at=CASE WHEN $2='processed' THEN now() ELSE NULL END WHERE id=$3",[rf.id,rf.status,payment.refund_id]);await c.query("UPDATE club.payments p SET status='REFUNDED' WHERE p.id=$1 AND p.amount<=(SELECT COALESCE(SUM(amount),0) FROM club.payment_refunds WHERE payment_id=p.id AND status='PROCESSED')",[payment.id]);});res.status(202).json({refund_id:rf.id,status:rf.status});}
 catch(e){fail(502,'Refund outcome unknown; reconcile with gateway before retrying');}
}));
export default r;
