import 'dotenv/config';
import {readFileSync} from 'node:fs';
import {tx,pool} from '../src/db.js';
import {eventExtras} from '../src/feature-schemas.js';

const entries=[
 {title:'Code Sastra',slug:'code-sastra-2026',poster:'code-sastra',category:'Other',description:'Code Sastra is a Coding Club event at Rajkiya Engineering College, Azamgarh, taking place from 29 to 31 October 2026.'},
 {title:'Hacktober 2026',slug:'code-sastra-hacktober-2026',poster:'hacktober',category:'Hackathons',description:'Hacktober 2026 is a nine-hour team coding marathon at Rajkiya Engineering College, Azamgarh, on 30 October 2026, presented as part of Code Sastra.'},
 {title:'The Debug',slug:'code-sastra-the-debug-2026',poster:'the-debug',category:'Coding competitions',description:'The Debug is a debugging-focused Coding Club event under Code Sastra, taking place at Rajkiya Engineering College, Azamgarh, from 29 to 31 October 2026.'},
 {title:'Tech Quiz',slug:'code-sastra-tech-quiz-2026',poster:'tech-quiz',category:'Coding competitions',description:'Tech Quiz is presented by Code Sastra and the Coding Club at Rajkiya Engineering College, Azamgarh, from 29 to 31 October 2026.'},
];
const presentation=eventExtras.presentation.parse({end_date:'2026-10-31',poster_format:'portrait',organiser:'Coding Club, Rajkiya Engineering College, Azamgarh',website:'https://codingclub.live',instagram:'https://www.instagram.com/codingclub_recazm/',email:'codingclub@gecazamgarh.ac.in',schedule_pending:true,registration_pending:true,capacity_pending:true});

try{
 const rows=await tx(async c=>{
  await c.query(readFileSync(new URL('../supabase/migrations/20261019083000_event_presentation.sql',import.meta.url),'utf8'));
  const results=[];
  for(const entry of entries){
   // Drafts stay private until their poster assets and display changes are deployed.
   // Pending flags keep unannounced storage defaults out of the public UI.
   const result=await c.query(`INSERT INTO club.events(title,slug,description,banner,event_date,start_time,end_time,venue,registration_fee,team_size,max_participants,registration_start,registration_deadline,status,category,tagline,tone,contact,presentation)
    VALUES($1,$2,$3,$4,'2026-10-29','00:00','23:59',$5,0,10,1,'2026-10-19T00:00:00Z','2026-10-28T18:29:59Z','DRAFT',$6,$7,$8,$9,$10::jsonb)
    ON CONFLICT(slug) DO NOTHING RETURNING id,title,slug,status`,[entry.title,entry.slug,entry.description,'https://codingclub.live/assets/events/'+entry.poster+'-2026.webp','Rajkiya Engineering College, Azamgarh',entry.category,'A Coding Club event · 29–31 October 2026',entry.poster==='the-debug'?'blue':'coral','Coding Club · codingclub@gecazamgarh.ac.in · Instagram: @codingclub_recazm',JSON.stringify(presentation)]);
   const row=result.rows[0]||(await c.query('SELECT id,title,slug,status FROM club.events WHERE slug=$1',[entry.slug])).rows[0];
   if(result.rowCount)await c.query("INSERT INTO club.audit_logs(actor_id,action,target_id,details) VALUES(NULL,'OPERATOR_CREATED_CODE_SASTRA_EVENT',$1,$2::jsonb)",[row.id,JSON.stringify({slug:entry.slug,source:'User-provided posters',poster_updated:true})]);
   results.push(row);
  }
  return results;
 });
 console.log(JSON.stringify(rows));
}finally{await pool.end();}
