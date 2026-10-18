import {query,tx} from './db.js';
import {config} from './config.js';
export async function enqueueMail(c,kind,recipient,subject,payload={}) {
 await c.query('INSERT INTO club.notification_outbox(kind,recipient,subject,payload) VALUES($1,$2,$3,$4::jsonb)',[kind,recipient,subject,JSON.stringify(payload)]);
}
export function renderMail(kind,payload){
 const text={registration:`Your registration ${payload.code||''} has been received for ${payload.event||'the event'}.`,payment:`Payment confirmed for registration ${payload.code||''}.`,leader:`You were selected as event leader. Your leader ID is ${payload.leaderCode||''}. Contact the administrator for secure credential delivery.`,team:`Your team has been updated for ${payload.event||'the event'}.`}[kind]||'Coding Club notification';
 return text;
}
export async function deliverNotifications(limit=10){
 if(!process.env.RESEND_API_KEY||!process.env.MAIL_FROM)throw new Error('Email delivery not configured');
 let completed=0,failed=0;
 for(let i=0;i<Math.min(limit,50);i++){
  const task=await tx(async c=>{const r=await c.query(`SELECT id,kind,recipient,subject,payload FROM club.notification_outbox WHERE (status='PENDING' OR status='FAILED' OR (status='SENDING' AND claimed_at<now()-interval '10 minutes')) AND attempts<8 AND next_attempt_at<=now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`);if(!r.rows[0])return null;await c.query("UPDATE club.notification_outbox SET status='SENDING',attempts=attempts+1,claimed_at=now() WHERE id=$1",[r.rows[0].id]);return r.rows[0];});
  if(!task)break;
  try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':task.id},body:JSON.stringify({from:process.env.MAIL_FROM,to:[task.recipient],subject:task.subject,text:renderMail(task.kind,task.payload)})});
   if(!response.ok)throw new Error('Email provider returned '+response.status);
   await query("UPDATE club.notification_outbox SET status='SENT',sent_at=now(),last_error=NULL WHERE id=$1",[task.id]);completed++;
  }catch(e){await query("UPDATE club.notification_outbox SET status='FAILED',last_error=$2,next_attempt_at=now()+make_interval(mins=>LEAST(1440,POWER(2,LEAST(attempts,10))::int)) WHERE id=$1",[task.id,String(e.message).slice(0,200)]);failed++;}
 }
 return {completed,failed};
}
