// Offline migration utility. The connected website never imports demo data.
import {defaults,sampleEvents,sampleProfiles} from './data';
import {officialFaculty} from './facultyData';
import {committeeMembers} from './committeeMembers';
import type {Store} from './model';
export const legacyInitial:Store={events:sampleEvents,profiles:sampleProfiles,registrations:[],leaders:[],teams:[],messages:[],settings:defaults,teamRevealDemoVersion:1,facultyDirectoryVersion:3,committeeDirectoryVersion:2,collegeIdentityVersion:1,editorialCopyVersion:1};
export function readStore():Store{
 try{
  const saved=localStorage.getItem('cc-frontend-v1');if(!saved)return structuredClone(legacyInitial);
  const parsed=JSON.parse(saved);const next:Store={...legacyInitial,...parsed,profiles:Array.isArray(parsed.profiles)?parsed.profiles:structuredClone(sampleProfiles)};let changed=false;
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
  if(!parsed.committeeDirectoryVersion){
   next.profiles=[...next.profiles.filter(person=>person.kind!=='student'),...structuredClone(committeeMembers)];
   next.committeeDirectoryVersion=1;changed=true;
  }
  if((parsed.committeeDirectoryVersion||0)<2){
   next.profiles=next.profiles.map(person=>person.id==='committee-brijnandan'?{...person,role:'Technical Team'}:person);
   next.committeeDirectoryVersion=2;changed=true;
  }
  if((parsed.facultyDirectoryVersion||0)<2){
   const changedIds=['faculty-0','faculty-1','faculty-2','faculty-3','faculty-4','faculty-5'];
   next.profiles=next.profiles.map(person=>{
    if(person.kind!=='faculty'||!changedIds.includes(person.id))return person;
    const update=officialFaculty.find(faculty=>faculty.id===person.id);
    return person.id==='faculty-4'?structuredClone(update):{...person,order:update?.order};
   });
   if(!next.profiles.some(person=>person.id==='faculty-ranjna'))next.profiles.push(structuredClone(officialFaculty.find(person=>person.id==='faculty-ranjna')));
   next.facultyDirectoryVersion=2;changed=true;
  }
  if(!parsed.collegeIdentityVersion){
   next.settings={...next.settings,college:defaults.college};
   next.collegeIdentityVersion=1;changed=true;
  }
  if((parsed.facultyDirectoryVersion||0)<3){
   next.profiles=next.profiles.map(person=>{
    if(person.id==='faculty-1')return {...person,order:1};
    if(person.id==='faculty-2')return {...person,order:2,role:'Event Coordinator',designation:'Event Coordinator'};
    return person;
   });
   next.facultyDirectoryVersion=3;changed=true;
  }
  if(!parsed.editorialCopyVersion){
   next.events=next.events.map(event=>{
    if(!event.demo)return event;
    const source=sampleEvents.find(item=>item.id===event.id);
    const description=event.description?.includes('Replace this example')||event.description?.includes('Add verified participation')?source?.description||event.description:event.description;
    return {...event,description,winners:(event.winners||[]).filter((winner:any)=>winner.name!=='Add the actual winner or contributor')};
   });next.editorialCopyVersion=1;changed=true;
  }
  if(changed)try{localStorage.setItem('cc-frontend-v1',JSON.stringify(next))}catch{}
  return next;
 }catch{return structuredClone(legacyInitial)}
}
