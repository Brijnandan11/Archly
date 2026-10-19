import 'dotenv/config';
import {readFileSync} from 'node:fs';
import {z} from 'zod';
import {facultyExtras,eventExtras} from '../src/feature-schemas.js';
import {tx,pool} from '../src/db.js';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const faculty=read('../app/src/ranjana-profile.json');
z.object({name:z.string().min(2),designation:z.string(),role:z.string(),department:z.string(),photo:z.string(),...facultyExtras}).strict().parse(faculty);
const hacktober=read('./data/hacktober-2026.json');
for(const key of ['rules','objectives','faqs'])eventExtras[key].parse(hacktober[key]);
const programme=eventExtras.faqs.parse(read('./data/code-sastra-programme.json'));
try{
 const result=await tx(async c=>{
  await c.query("SELECT pg_advisory_xact_lock(hashtext('publish-faculty-and-hacktober'))");
  const found=await c.query("SELECT id FROM club.faculty WHERE lower(name) IN ('mrs ranjna','mrs. ranjna','ranjana','mrs ranjana') FOR UPDATE");
  if(found.rowCount!==1)throw Error('Expected exactly one existing Ranjana faculty profile');
  const fields=Object.keys(faculty),values=fields.map(key=>faculty[key]);
  const updatedFaculty=(await c.query(`UPDATE club.faculty SET ${fields.map((key,i)=>`${key}=$${i+1}`).join(',')},is_active=true WHERE id=$${fields.length+1} RETURNING id,name,designation,photo,placeholder`,[...values,found.rows[0].id])).rows[0];
  const main=(await c.query(`UPDATE club.events SET team_size=10,faqs=$1::jsonb,presentation=COALESCE(presentation,'{}'::jsonb)||'{"display_order":0}'::jsonb WHERE slug='code-sastra-2026' RETURNING id,title,team_size`,[JSON.stringify(programme)])).rows[0];
  if(!main)throw Error('Code Sastra event not found');
  const hackFields=Object.keys(hacktober),hackValues=hackFields.map(key=>['faqs','rules','objectives'].includes(key)?JSON.stringify(hacktober[key]):hacktober[key]);
  const hack=(await c.query(`UPDATE club.events SET ${hackFields.map((key,i)=>`${key}=$${i+1}${['faqs','rules','objectives'].includes(key)?'::jsonb':''}`).join(',')},presentation=(COALESCE(presentation,'{}'::jsonb)-'registration_parent_slug')||'{"registration_url":"https://events.mlh.com/events/15026-hacktoberfest-hack-day-azamgarh-x-init-build-rec-azamgarh","display_order":1,"end_date":"2026-10-30","previous_slug":"code-sastra-bug-bounty-2026","schedule_pending":true}'::jsonb WHERE slug IN ('code-sastra-bug-bounty-2026','code-sastra-hacktober-2026') RETURNING id,title,slug,event_date,team_size`,hackValues)).rows;
  if(hack.length!==1)throw Error('Expected one Hacktober listing to update');
  await c.query(`UPDATE club.events SET team_size=10,presentation=COALESCE(presentation,'{}'::jsonb)||jsonb_build_object('display_order',CASE WHEN slug='code-sastra-the-debug-2026' THEN 2 ELSE 3 END) WHERE slug IN ('code-sastra-the-debug-2026','code-sastra-tech-quiz-2026') AND team_size>1`);
  for(const item of [updatedFaculty,main,...hack])await c.query("INSERT INTO club.audit_logs(actor_id,action,target_id,details) VALUES(NULL,'OPERATOR_UPDATED_FACULTY_AND_PROGRAMME',$1,$2::jsonb)",[item.id,JSON.stringify({source:'User-provided faculty biography, photograph and event instructions',team_size:10})]);
  return {faculty:updatedFaculty,events:[main,...hack]};
 });
 console.log(JSON.stringify(result));
}finally{await pool.end()}
