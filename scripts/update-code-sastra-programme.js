import 'dotenv/config';
import {readFileSync} from 'node:fs';
import {tx,pool} from '../src/db.js';
import {eventExtras} from '../src/feature-schemas.js';
const programme=eventExtras.faqs.parse(JSON.parse(readFileSync(new URL('./data/code-sastra-programme.json',import.meta.url),'utf8')));
try{
 const results=await tx(async c=>{
  const updated=await c.query(`UPDATE club.events SET description=$1,faqs=$2::jsonb,tagline='A Coding Club event · 29–31 October 2026' WHERE slug='code-sastra-2026' RETURNING id`,['Code Sastra is a Coding Club event at Rajkiya Engineering College, Azamgarh, from 29 to 31 October 2026. Explore nine challenges spanning a nine-hour hackathon, debugging, resume analysis, software testing, technology deduction, quizzes, practical tasks, unfamiliar languages, and blind coding.',JSON.stringify(programme)]);
  if(updated.rowCount!==1)throw Error('Code Sastra event not found');
  const opened=await c.query(`UPDATE club.events SET status='OPEN',registration_fee=900,max_participants=200,presentation=presentation||'{"registration_pending":false,"capacity_pending":false}'::jsonb WHERE slug='code-sastra-2026' RETURNING id,title,slug,status,registration_fee,max_participants`);
  if(opened.rowCount!==1)throw Error('Expected one Code Sastra registration event');
  await c.query(`UPDATE club.events SET status='CLOSED',presentation=presentation||'{"registration_pending":false}'::jsonb WHERE slug='code-sastra-bug-bounty-2026'`);
  await c.query(`UPDATE club.events SET banner='https://codingclub.live/assets/events/hacktober-2026.webp' WHERE slug='code-sastra-bug-bounty-2026'`);
  for(const row of opened.rows)await c.query(`INSERT INTO club.audit_logs(actor_id,action,target_id,details) VALUES(NULL,'OPERATOR_UPDATED_EVENT_PROGRAMME',$1,$2::jsonb)`,[row.id,JSON.stringify({registration_fee:900,max_participants:200,status:'OPEN',source:'User requested Code Sastra programme and Hacktober poster'})]);
  return opened.rows;
 });
 console.log(JSON.stringify(results));
}finally{await pool.end();}
