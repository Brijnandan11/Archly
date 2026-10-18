import {defaults,sampleEvents,sampleProfiles} from './data';
import {officialFaculty} from './facultyData';
export type Store={events:any[];profiles:any[];registrations:any[];leaders:any[];teams:any[];messages:any[];settings:any;teamRevealDemoVersion?:number;facultyDirectoryVersion?:number};
export const initial:Store={events:sampleEvents,profiles:sampleProfiles,registrations:[],leaders:[],teams:[],messages:[],settings:defaults,teamRevealDemoVersion:1,facultyDirectoryVersion:1};
export function readStore():Store{
 try{
  const saved=localStorage.getItem('cc-frontend-v1');if(!saved)return structuredClone(initial);
  const parsed=JSON.parse(saved);const next:Store={...initial,...parsed,profiles:Array.isArray(parsed.profiles)?parsed.profiles:structuredClone(sampleProfiles)};let changed=false;
  if(!parsed.teamRevealDemoVersion){
   next.profiles=next.profiles.map((profile:any)=>{const demo=sampleProfiles.find(person=>person.id===profile.id&&person.kind==='student');if(!demo||!profile.placeholder||profile.name!=='Member name')return profile;return {...profile,name:demo.name,bio:profile.bio==='Meet the student behind this role. Profile details will be added by the club.'?demo.bio:profile.bio,photo:profile.photo||demo.photo}});
   for(const demo of sampleProfiles.filter(person=>person.kind==='student'&&person.order>=9))if(!next.profiles.some(profile=>profile.id===demo.id))next.profiles.push(structuredClone(demo));
   next.teamRevealDemoVersion=1;changed=true;
  }
  if(!parsed.facultyDirectoryVersion){
   next.profiles=next.profiles.map(profile=>{const faculty=officialFaculty.find(person=>person.id===profile.id);return faculty&&profile.kind==='faculty'&&(profile.placeholder||profile.name==='Faculty name')?structuredClone(faculty):profile});
   for(const faculty of officialFaculty)if(!next.profiles.some(profile=>profile.id===faculty.id))next.profiles.push(structuredClone(faculty));
   next.facultyDirectoryVersion=1;changed=true;
  }
  if(changed)try{localStorage.setItem('cc-frontend-v1',JSON.stringify(next))}catch{}
  return next;
 }catch{return structuredClone(initial)}
}
export const uid=(prefix='CC')=>prefix+'-'+crypto.randomUUID().slice(0,8).toUpperCase();
export const fmt=(value:string)=>value?new Date(value+'T12:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'To be announced';
export const money=(value:number)=>value?new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value):'Free';
export const canRegister=(e:any)=>e&&e.status==='upcoming'&&e.registrationOpen&&new Date(e.deadline||e.date).getTime()>Date.now();
export function csvDownload(rows:any[],name:string){if(!rows.length)return;const keys=Object.keys(rows[0]);const safe=(v:any)=>{let s=String(v??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};download([keys.map(safe).join(','),...rows.map(r=>keys.map(k=>safe(typeof r[k]==='object'?JSON.stringify(r[k]):r[k])).join(','))].join('\r\n'),name,'text/csv;charset=utf-8')}
export function download(content:string,name:string,type='text/html'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
export function receipt(reg:any,event:any){const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));download(`<!doctype html><html><head><meta charset="utf-8"><title>Demo receipt ${esc(reg.id)}</title><style>body{font:16px Arial;max-width:700px;margin:60px auto;padding:20px;line-height:1.8}small{color:#777}h1{font-size:42px}table{width:100%;border-collapse:collapse}td{border-bottom:1px solid #ddd;padding:12px}button{padding:12px}</style></head><body><small>CODING CLUB · FRONTEND DEMO · NOT A PAYMENT RECEIPT</small><h1>Registration confirmation</h1><table>${[['Registration ID',reg.id],['Participant',reg.name],['Event',event?.name],['Date',fmt(event?.date)],['Status',reg.status],['Demo amount',money(reg.amount||0)]].map(([a,b])=>`<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table><p>This is a browser-local demonstration. No money was collected and no place in a real event has been reserved.</p><button onclick="window.print()">Print / Save PDF</button></body></html>`,`${reg.id}-demo-receipt.html`)}
export const navItems=[['Events','/events'],['Our Aim','/about'],['Faculty','/faculty'],['Student team','/team'],['Credits','/contact']];
export const categories=['All','Upcoming','Past','Hackathons','Coding competitions','Workshops','Seminars','Other'];
export const activityItems=[['Workshops','Learn it. Then build it.','Hands-on sessions that turn new concepts into something you can actually use.','⌘'],['Coding competitions','A good problem changes you.','Practice clear thinking, algorithms, and the satisfying art of making things work.','{ }'],['Hackathons','Big ideas. Short deadlines.','Find your people and build a first version of something useful.','↗'],['Projects','Make something that matters.','Collaborate on practical projects, review each other’s work, and share what you learn.','◈'],['Technical sessions','Stay curious. Go deeper.','Explore emerging tools and technologies with peers and guest mentors.','✳'],['Mentorship','Nobody builds alone.','Learn from faculty, experienced students, and thoughtful feedback.','◎'],['Peer learning','Teach what you just learned.','Ask questions, share resources, and learn alongside people at every level.','↔'],['Community','Better, together.','An inclusive place to experiment, contribute, and make lasting connections.','✺']];
export function participants(store:Store,eventId?:string){return store.registrations.filter(r=>r.status==='confirmed'&&(!eventId||r.eventId===eventId)).flatMap(r=>[{...r,members:undefined},...(r.members||[]).map((m:any,i:number)=>({...m,id:r.id+'-M'+(i+2),eventId:r.eventId,status:r.status,teamName:r.teamName,created:r.created}))])}
