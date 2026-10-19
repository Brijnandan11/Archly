import {query,tx} from './db.js';
import {config} from './config.js';
const escapeHtml=value=>String(value||'').replace(/[&<>\"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[char]));
export async function enqueueMail(c,kind,recipient,subject,payload={}) {
 await c.query('INSERT INTO club.notification_outbox(kind,recipient,subject,payload) VALUES($1,$2,$3,$4::jsonb)',[kind,recipient,subject,JSON.stringify(payload)]);
}
export function renderMail(kind,payload){
 if(kind==='password_reset')return `Reset your Coding Club password using this link (valid for 30 minutes): ${payload.url||''}. If you did not request a reset, ignore this email.`;
 if(kind==='cc_registration')return `Hello ${payload.name||'participant'}, your registration for ${payload.event||'the Coding Club event'} is confirmed. Your registration ID is ${payload.code}. Payment verified: ₹${((payload.amount||0)/100).toFixed(2)}. Please keep this ID for event check-in.${payload.contact?` Organizer contact: ${payload.contact}.`:''}`;
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
   const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':task.id},body:JSON.stringify({from:process.env.MAIL_FROM,to:[task.recipient],subject:task.subject,text:renderMail(task.kind,task.payload),...(task.kind==='cc_registration'?{html:`<div style="background:#101014;color:#f7f3ec;padding:36px;font-family:Arial,sans-serif"><p style="color:#c9ed83;letter-spacing:.14em">CODING CLUB</p><h1>Registration confirmed</h1><p>Hello ${escapeHtml(task.payload.name||'participant')},</p><p>Your registration for <b>${escapeHtml(task.payload.event||'the Coding Club event')}</b> has been confirmed after payment verification.</p><p>Registration ID</p><p style="font-size:24px;font-weight:bold">${escapeHtml(task.payload.code||'')}</p><p>Verified payment: ₹${((task.payload.amount||0)/100).toFixed(2)}</p><p>Please keep your registration ID for event check-in.</p>${task.payload.contact?`<p>Organizer contact: ${escapeHtml(task.payload.contact)}</p>`:''}<p>Code · Create · Conquer</p></div>`}:{})})});
   if(!response.ok)throw new Error('Email provider returned '+response.status);
   await query("UPDATE club.notification_outbox SET status='SENT',sent_at=now(),last_error=NULL,payload=CASE WHEN kind='password_reset' THEN '{}'::jsonb ELSE payload END WHERE id=$1",[task.id]);completed++;
  }catch(e){await query("UPDATE club.notification_outbox SET status='FAILED',last_error=$2,next_attempt_at=now()+make_interval(mins=>LEAST(1440,POWER(2,LEAST(attempts,10))::int)) WHERE id=$1",[task.id,String(e.message).slice(0,200)]);failed++;}
 }
 return {completed,failed};
}
