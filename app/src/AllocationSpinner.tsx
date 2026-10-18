import React from 'react';
import './allocation-spinner.css';
export default function AllocationSpinner({spinning,shown,picked,full,available}:any){
 const initials=(shown||'').split(/\s+/).slice(0,2).map((s:string)=>s[0]).join('').toUpperCase();
 return <div className={'allocation-reveal'+(spinning?' is-spinning':'')+(picked?' is-selected':'')+(full?' is-complete':'')}>
  <div className="allocation-dial" aria-hidden="true"><div className="allocation-orbit orbit-one"/><div className="allocation-orbit orbit-two"/><svg className="allocation-ticks" viewBox="0 0 240 240">{Array.from({length:32},(_,i)=><path key={i} d={i%4===0?'M120 12v13':'M120 15v5'} transform={'rotate('+i*11.25+' 120 120)'} stroke="currentColor" strokeWidth={i%4===0?2:1}/>)}</svg><div className="allocation-pointer"/><div className="allocation-core"><span key={spinning?shown:full?'complete':picked?.id||'ready'}>{spinning?initials:full?'✳':picked?'✓':'↗'}</span><small>{spinning?'IN THE MIX':full?'TEAM READY':picked?'MATCH FOUND':'NEXT UP'}</small></div>{picked&&<div className="allocation-confetti">{Array.from({length:16},(_,i)=><i key={i} style={{'--angle':i*22.5+'deg','--delay':i%4*.025+'s','--travel':(i%2?125:155)+'px'} as React.CSSProperties}/>)}</div>}</div>
  <div className="allocation-name"><span className="allocation-eyebrow">{spinning?'A LITTLE CHANCE. A GREAT TEAM.':full?'READY TO BUILD TOGETHER':picked?'YOUR NEW TEAMMATE':'MAKE ROOM FOR POSSIBILITY'}</span><h3 aria-hidden={spinning} key={shown||'ready'}>{full?'Your team is ready.':shown||'Who’s joining next?'}</h3><p>{spinning?'Finding your next collaborator…':picked?'One more curious mind. One stronger team.':available.length+' people. A world of possibilities.'}</p></div>
  <span className="sr-only" role="status" aria-live="polite">{spinning?'Selecting a teammate.':picked?picked.name+' selected.':full?'Team complete.':''}</span>
 </div>
}
