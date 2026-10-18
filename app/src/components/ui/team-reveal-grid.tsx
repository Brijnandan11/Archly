"use client";
// Adapted from Ashutoshx7 / VengeanceUI TeamRevealGrid (MIT).
// Copyright (c) 2025-2026 Ashutoshx7. License: /assets/licenses/vengeance-ui-MIT.txt
import React,{useCallback,useEffect,useMemo,useRef,useState,useId} from 'react';
import './team-reveal-grid.css';
export interface TeamRevealMember {id:string;name:string;role:string;expertise:string;image?:string;imageAlt?:string;imagePosition?:string;accent?:string;github?:string;portfolio?:string;details?:React.ReactNode}
export interface TeamRevealGridProps extends Omit<React.ComponentPropsWithoutRef<'section'>,'title'> {eyebrow?:string;title?:string;description?:string;members:readonly TeamRevealMember[];activeMemberId?:string|null;defaultActiveMemberId?:string|null;onActiveMemberChange?:(id:string|null)=>void;autoPlay?:boolean;rotationInterval?:number}
function Portrait({member}:{member:TeamRevealMember}){const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[member.image]);return <div className="trg-portrait">{member.image&&!failed?<img src={member.image} alt={member.imageAlt??member.name} loading="lazy" decoding="async" width="480" height="600" draggable={false} onError={()=>setFailed(true)} style={{objectPosition:member.imagePosition??'center 30%'}}/>:<div className="trg-fallback" aria-label={member.name}>{member.name.split(/\s+/).slice(0,2).map(part=>part[0]).join('')}</div>}<span className="trg-shade" aria-hidden="true"/></div>}
export function TeamRevealGrid({eyebrow='THE PEOPLE BEHIND THE CLUB',title='Meet the team',description='Different strengths. One shared direction.',members,activeMemberId,defaultActiveMemberId,onActiveMemberChange,autoPlay=true,rotationInterval=3200,className='',...props}:TeamRevealGridProps){
 const firstMemberId=members[0]?.id??null;
 const [internalActiveId,setInternalActiveId]=useState<string|null>(defaultActiveMemberId===undefined?firstMemberId:defaultActiveMemberId);
 const [pointerInside,setPointerInside]=useState(false),[focusInside,setFocusInside]=useState(false),[visible,setVisible]=useState(false),[paused,setPaused]=useState(false);
 const root=useRef<HTMLElement>(null),instance=useId();
 const [hoveredId,setHoveredId]=useState<string|null>(null);
 const pointerType=useRef('mouse');
 const isControlled=activeMemberId!==undefined;
 const memberIds=useMemo(()=>new Set(members.map(member=>member.id)),[members]);
 const requestedActiveId=hoveredId??(isControlled?activeMemberId:internalActiveId);
 const resolvedActiveId=requestedActiveId===null?null:requestedActiveId&&memberIds.has(requestedActiveId)?requestedActiveId:firstMemberId;
 const selectMember=useCallback((id:string|null)=>{if(!isControlled)setInternalActiveId(id);onActiveMemberChange?.(id)},[isControlled,onActiveMemberChange]);
 useEffect(()=>{if(!root.current)return;const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting),{threshold:.08});observer.observe(root.current);return()=>observer.disconnect()},[]);
 useEffect(()=>{if(!autoPlay||paused||pointerInside||focusInside||!visible||members.length<2)return;const media=window.matchMedia('(prefers-reduced-motion: reduce)');let timer:number|undefined;function stop(){window.clearInterval(timer)}function sync(){stop();if(media.matches||document.hidden)return;timer=window.setInterval(()=>{const index=members.findIndex(member=>member.id===resolvedActiveId);selectMember(members[(index+1)%members.length]?.id??null)},Math.max(rotationInterval,1200))}sync();media.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);return()=>{stop();media.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync)}},[autoPlay,paused,pointerInside,focusInside,visible,members,resolvedActiveId,rotationInterval,selectMember]);
 return <section ref={root} className={'team-reveal-section '+className} {...props}>
 <div className="trg-inner"><header className="trg-header reveal"><div><p className="trg-eyebrow">{eyebrow}</p><h2>{title}<span aria-hidden="true">.</span></h2><p className="trg-description">{description}</p></div><div className="trg-controls"><span>{String(members.length).padStart(2,'0')} MEMBERS</span>{autoPlay&&members.length>1&&<button type="button" onClick={()=>setPaused(value=>!value)} aria-pressed={paused}>{paused?'Resume reveal ↗':'Pause reveal Ⅱ'}</button>}</div></header>
 <p className="trg-hint">HOVER TO DISCOVER <span aria-hidden="true">/</span> TAP TO MEET</p>
 {members.length?<ul className="trg-grid" onPointerEnter={event=>{if(event.pointerType==='mouse')setPointerInside(true)}} onPointerLeave={()=>{setPointerInside(false);setHoveredId(null)}} onFocusCapture={()=>setFocusInside(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null)){setFocusInside(false);selectMember(null)}}}>{members.map((member,index)=>{const active=member.id===resolvedActiveId,detailsId=`${instance}-${member.id}-details`;return <li key={member.id} className={'trg-member reveal'+(active?' is-active':'')} style={{'--team-accent':member.accent??'#fb4f43'} as React.CSSProperties}>
 <button type="button" className="trg-select" aria-label={`${member.name}, ${member.role}`} aria-expanded={active} aria-controls={detailsId} onPointerDown={event=>{pointerType.current=event.pointerType}} onClick={event=>{if(event.detail===0||pointerType.current!=='mouse')selectMember(internalActiveId===member.id?null:member.id)}} onPointerEnter={event=>{if(event.pointerType==='mouse')setHoveredId(member.id)}} onPointerLeave={()=>setHoveredId(null)} onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))selectMember(member.id)}} onBlur={()=>selectMember(null)}>
 <div className="trg-frame"><div className="trg-image-window"><Portrait member={member}/></div><span className="trg-index" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><div id={detailsId} className="trg-expertise" aria-hidden={!active}><p>{member.expertise}</p></div><span className="trg-arrow" aria-hidden="true">↗</span></div>
 <div className="trg-name"><h3>{member.name}</h3><p>{member.role}</p></div></button>
 {(member.github||member.portfolio)&&<div className="trg-socials">{member.github&&<a href={member.github} target="_blank" rel="noreferrer" aria-label={member.name+' on GitHub'}>GitHub ↗</a>}{member.portfolio&&<a href={member.portfolio} target="_blank" rel="noreferrer" aria-label={member.name+' portfolio'}>Portfolio ↗</a>}</div>}
 {member.details}</li>})}</ul>:<p className="trg-empty">Our next chapter is taking shape. Team profiles are coming soon.</p>}
 </div></section>
}
export default TeamRevealGrid;
