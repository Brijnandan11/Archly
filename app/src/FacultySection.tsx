import ProfileDetails from './ProfileDetails';
import React from 'react';
import ResilientImage from './ResilientImage';
import {ChapterHeader,Notice} from './ui';
import type {Store} from './model';
import {facultyCollege} from './facultyData';
import './faculty.css';
type FacultyProfile={id:string;name:string;role:string;designation?:string;department?:string;photo?:string;linkedin?:string;placeholder?:boolean;order:number;kind:string;qualification?:string;interests?:string;email?:string;phone?:string;cv?:string;sourceUrl?:string;bio?:string;year?:string;github?:string;portfolio?:string;source_url?:string};
export function FacultyCircleCard({person,index}:{person:FacultyProfile;index:number}){
 return <article className={'faculty-circle-card reveal tilt faculty-tone-'+index%3} aria-labelledby={'faculty-name-'+person.id}>
 <div className="faculty-portrait-shell"><span className="faculty-orbit" aria-hidden="true"/><div className="faculty-portrait"><ResilientImage src={person.photo} alt={person.name} fetchPriority="low" fallback={<svg className="faculty-placeholder" viewBox="0 0 240 240" aria-hidden="true"><circle className="faculty-placeholder-halo" cx="120" cy="115" r="82"/><circle cx="120" cy="88" r="34"/><path d="M36 244v-16c0-91 168-91 168 0v16z"/></svg>}/><span className="faculty-portrait-shine" aria-hidden="true"/></div></div>
 <div className="faculty-circle-copy"><h3 id={'faculty-name-'+person.id}>{person.name}</h3><p className="faculty-circle-role">{person.designation||person.role}</p>{person.department&&<p className="faculty-circle-department">{person.department}</p>}
 <ProfileDetails person={person}/></div></article>
}
export default function FacultySection({store}:{store:Store}){const people=(store.profiles as FacultyProfile[]).filter(person=>person.kind==='faculty').sort((a,b)=>a.order-b.order);return <><ChapterHeader label="03 / FACULTY" lines={['GOOD','GUIDANCE.']} copy={'Meet the Information Technology faculty at '+facultyCollege+'.'} tone="paper" strip="ASK MORE. GO FURTHER."/><section className="faculty-roster" aria-label="Information Technology faculty"><div className="faculty-roster-caption reveal"><span>DEPARTMENT OF INFORMATION TECHNOLOGY</span><span>{String(people.length).padStart(2,'0')} / FACULTY</span></div><div className="faculty-lead-row" aria-label="Department faculty">{people.slice(0,3).map((person,index)=><FacultyCircleCard person={person} index={index} key={person.id}/>)}</div><div className="faculty-roster-divider" aria-hidden="true"><span/></div><div className="faculty-mentor-row" aria-label="Teaching faculty">{people.slice(3).map((person,index)=><FacultyCircleCard person={person} index={index+3} key={person.id}/>)}</div>{people.some(person=>person.placeholder)&&<div className="faculty-demo-note"><Notice>Mrs Ranjna’s photograph and profile details will be added soon.</Notice></div>}{!people.length&&<p className="faculty-empty">Faculty profiles will be added soon.</p>}</section></>}
