import React,{useEffect,useId,useRef,useState} from 'react';
import {chapters} from './Journey';
export default function PageGuide({onNavigate}:{onNavigate:(path:string)=>void}){
 const [active,setActive]=useState('home'),[open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),panelId=useId();
 useEffect(()=>{const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)setActive((entry.target as HTMLElement).dataset.chapter||'home')},{rootMargin:'-20% 0px -70% 0px',threshold:0});document.querySelectorAll<HTMLElement>('[data-chapter]').forEach(section=>observer.observe(section));return()=>observer.disconnect()},[]);
 useEffect(()=>{if(!open)return;root.current?.querySelector<HTMLAnchorElement>('nav a')?.focus();const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus()}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key)}},[open]);
 const current=chapters.findIndex(([id])=>id===active);
 return <div ref={root} className={'page-guide'+(active==='home'&&!open?' guide-at-home':'')}>
 {open&&<nav id={panelId} className="page-guide-panel" data-lenis-prevent aria-label="Explore the club"><p className="guide-panel-label">FIND YOUR NEXT CHAPTER</p><ol>{chapters.map(([id,label],index)=><li key={id}><a href={'#/section/'+id} aria-current={active===id?'location':undefined} onClick={event=>{event.preventDefault();setOpen(false);trigger.current?.focus();onNavigate('/section/'+id)}}><span>{String(index).padStart(2,'0')}</span><strong>{label}</strong><b aria-hidden="true">{active===id?'●':'↗'}</b></a></li>)}</ol><a className="guide-registrations" href="#/registrations" onClick={()=>setOpen(false)}>My registrations <span aria-hidden="true">↗</span></a></nav>}
 <button ref={trigger} className="page-guide-trigger" aria-controls={open?panelId:undefined} aria-expanded={open} onClick={()=>setOpen(value=>!value)}><span className="guide-dot" aria-hidden="true"/><span className="guide-current">{chapters[current]?.[1]||'Home'}</span><span className="guide-divider" aria-hidden="true"/><span>{open?'Close':'Explore'}</span><span aria-hidden="true">{open?'×':'↗'}</span></button>
 </div>
}
