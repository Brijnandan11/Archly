import React from 'react';
export default function AimScene({store}:any){
 const panels=[
  {label:'THE VISION',title:'Create without fear.',copy:store.settings.vision,tone:'noir'},
  {label:'THE MISSION',title:'Learn by building.',copy:store.settings.mission,tone:'cobalt'},
  {label:'THE OBJECTIVES',title:'Code with purpose.',copy:'Make technical learning accessible. Build useful projects with peers. Grow through feedback, mentorship, and inclusive teamwork.',tone:'paper'},
  {label:'THE COMMUNITY',title:'Conquer together.',copy:'Workshops. Coding competitions. Hackathons. Projects. Technical sessions. Mentorship. Peer learning. Community and collaboration.',tone:'lime'}
 ];
 return <section className="scroll-chapter aim-stack-chapter" id="section-aim" data-chapter="aim"><div className="aim-stack-scene"><div className="aim-sticky-stage"><div className="aim-scene-opening"><h2 className="aim-scene-title">OUR<br/>AIM</h2><div className="aim-scene-bottom"><p>{store.settings.about}</p></div></div><div className="aim-panel-layer">{panels.map((panel,i)=><article className={'aim-scroll-panel panel-'+panel.tone} key={panel.label}><div className="aim-panel-inner"><div className="aim-panel-top"><span>{String(i+1).padStart(2,'0')} / {panel.label}</span><span className="aim-panel-mark" aria-hidden="true">&lt;C&gt;</span></div><h3 className="aim-panel-title">{panel.title}</h3><div className="aim-panel-bottom"><span className="aim-panel-signature">CREATE. CODE. CONQUER.</span><p>{panel.copy}</p></div></div></article>)}</div></div></div><div className="chapter-bottom"><a className="chapter-next" href="#/section/faculty"><span>NEXT / FACULTY</span><strong>Meet the people who guide us.</strong><b>↓</b></a></div></section>
}
