import 'dotenv/config';
import {readFileSync} from 'node:fs';
import {tx,pool} from '../src/db.js';
const url='https://events.mlh.com/events/15026-hacktoberfest-hack-day-azamgarh-x-init-build-rec-azamgarh';
const profile=JSON.parse(readFileSync(new URL('../app/src/ranjana-profile.json',import.meta.url),'utf8'));
const hacktober=JSON.parse(readFileSync(new URL('./data/hacktober-2026.json',import.meta.url),'utf8'));
try{
 const result=await tx(async c=>{
  const event=(await c.query(`UPDATE club.events SET presentation=(COALESCE(presentation,'{}'::jsonb)-'registration_parent_slug')||jsonb_build_object('registration_url',$1::text),faqs=$2::jsonb WHERE slug='code-sastra-hacktober-2026' RETURNING id,title,presentation->>'registration_url' registration_url`,[url,JSON.stringify(hacktober.faqs)])).rows[0];
  if(!event)throw Error('Hacktober listing not found');
  const faculty=(await c.query('UPDATE club.faculty SET bio=$1,qualification=$2,interests=$3 WHERE name=$4 AND email=$5 RETURNING id,name',[profile.bio,profile.qualification,profile.interests,profile.name,profile.email])).rows[0];
  if(!faculty)throw Error('Ranjana profile not found');
  for(const row of [event,faculty])await c.query("INSERT INTO club.audit_logs(actor_id,action,target_id,details) VALUES(NULL,'OPERATOR_UPDATED_REGISTRATION_AND_PROFILE_SUMMARY',$1,$2::jsonb)",[row.id,JSON.stringify({source:'User requested MLH registration and a concise faculty profile'})]);
  return {event,faculty};
 });
 console.log(JSON.stringify(result));
}finally{await pool.end()}
