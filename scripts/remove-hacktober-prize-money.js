import 'dotenv/config';
import {tx,pool} from '../src/db.js';
const clean=value=>value.replace(/ and prize money/g,'').replace(/ The prize amount will be announced by the organizers\./g,'').replace(/ The organizers will announce the prize amount\./g,'');
try{
 const result=await tx(async c=>{
  const {rows}=await c.query("SELECT id,slug,description,prizes,faqs FROM club.events WHERE slug IN ('code-sastra-hacktober-2026','code-sastra-2026') FOR UPDATE");
  if(!rows.some(row=>row.slug==='code-sastra-hacktober-2026'))throw Error('Hacktober event not found');
  for(const row of rows){
   const description=clean(row.description||''),prizes=clean(row.prizes||''),faqs=(row.faqs||[]).map(faq=>({...faq,a:clean(faq.a)}));
   await c.query('UPDATE club.events SET description=$1,prizes=$2,faqs=$3::jsonb WHERE id=$4',[description,prizes,JSON.stringify(faqs),row.id]);
  }
  const verified=await c.query("SELECT slug,description,prizes,faqs FROM club.events WHERE slug IN ('code-sastra-hacktober-2026','code-sastra-2026')");
  if(verified.rows.some(row=>/prize money|prize amount/i.test(JSON.stringify(row))))throw Error('Prize copy remains');
  return verified.rows.map(row=>({slug:row.slug,prizeMoneyRemoved:true}));
 });
 console.log(JSON.stringify(result));
}finally{await pool.end()}
