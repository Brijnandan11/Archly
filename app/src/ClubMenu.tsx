import React,{useEffect} from 'react';
import {chapters} from './navigation';
import './club-menu.css';
const routes=['/section/home','/events','/about','/faculty','/team','/contact'];
const imagePairs=[[0,2],[1,4],[2,0],[3,1],[4,5],[5,0]];
export const clubMenuItems=chapters.map(([id,name],index)=>({id,name,num:String(index+1).padStart(2,'0'),images:imagePairs[index].map(image=>'/assets/menu/chapter-'+image+'.jpg'),route:routes[index]}));
/** Two-image reveal adapted from the user's RevealImageList example. */
export function RevealMenuItem({member,index,onNavigate}:{member:typeof clubMenuItems[number];index:number;onNavigate:(path:string)=>void}){return <li style={{'--menu-index':index} as React.CSSProperties}><a className="stack-menu-link" href={'#'+member.route} onClick={event=>{event.preventDefault();onNavigate(member.route)}}><span className="stack-menu-number">{member.num}</span><span className="stack-menu-label"><span className="stack-menu-name">{member.name}</span><span className="menu-reveal-images" aria-hidden="true"><span className="menu-reveal-position reveal-back"><span className="menu-reveal-photo"><img src={member.images[1]} alt="" width="160" height="200" decoding="async" draggable={false}/></span></span><span className="menu-reveal-position reveal-front"><span className="menu-reveal-photo"><img src={member.images[0]} alt="" width="160" height="200" decoding="async" draggable={false}/></span></span></span></span><span className="stack-menu-arrow" aria-hidden="true">↗</span></a></li>}
export default function ClubMenu({onNavigate,onClose}:{onNavigate:(path:string)=>void;onClose:()=>void}){
 useEffect(()=>{const lenis=(window as any).__ccLenis,wasStopped=lenis?.isStopped;lenis?.stop();return()=>{if(lenis&&!wasStopped)lenis.start()}},[]);
 return <div className="stack-menu-content">
 <div className="stack-menu-top"><a href="#/section/home" className="stack-menu-brand" aria-label="Coding Club home" onClick={event=>{event.preventDefault();onNavigate('/section/home')}}><img src="/assets/club-symbol.svg" alt="Coding Club"/></a><span>EXPLORE THE CLUB</span><button type="button" className="stack-menu-close" onClick={onClose} aria-label="Close navigation">CLOSE <b aria-hidden="true">×</b></button></div>
 <div className="stack-menu-layout"><nav aria-label="Main navigation"><ol className="stack-menu-list">{clubMenuItems.map((member,index)=><RevealMenuItem member={member} index={index} onNavigate={onNavigate} key={member.id}/>)}</ol></nav></div>
 <div className="stack-menu-bottom"><span>CREATE. CODE. CONQUER.</span><a href="#/leader" onClick={event=>{event.preventDefault();onNavigate('/leader')}}>Leader portal <span aria-hidden="true">↗</span></a><span>SELECT A CHAPTER ↗</span></div>
 </div>
}
