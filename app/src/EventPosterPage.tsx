import React from 'react';
import {EventArt,Label,Notice,Button} from './ui';
import {canRegister} from './model';
import {eventDates,eventTime,eventPrice,externalRegistrationUrl} from './event-presentation';
import './event-posters.css';

export default function EventPosterPage({event}:any){
 const details=event.presentation||{};
 const registrationUrl=externalRegistrationUrl(event);
 const facts=[['Dates',eventDates(event)],['Session timings',eventTime(event)],['Venue',event.venue],['Organiser',details.organiser||'Coding Club'],['Registration fee',eventPrice(event)],['Team size',event.teamSize===1?'Individual':`Up to ${event.teamSize} people, including the leader`],['Participant capacity',details.capacity_pending?'To be announced':event.capacity]];
 return <section className="section event-poster-page">
  <a className="back-link" href="#/section/events">← ALL EVENTS</a>
  <div className="event-poster-full"><EventArt event={event} large/></div>
  <div className="event-poster-information">
   <Label>CODE SASTRA / {event.category}</Label><h1>{event.name}</h1>
   <p className="lead">{event.description}</p>
   <dl className="event-poster-facts">{facts.map(([label,value])=><div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
   {registrationUrl?<><Notice>Hacktober registration is handled on the official MLH event page.</Notice><Button href={registrationUrl}>Register for Hacktober</Button></>:details.registration_parent_slug?<><Notice>This event is included in Code Sastra. Register once for the programme.</Notice><Button href={'/event/'+details.registration_parent_slug}>Register for Code Sastra</Button></>:details.registration_pending?<Notice>Registration details will be announced soon.</Notice>:canRegister(event)?<Button href={'/register/'+event.id}>Register for this event</Button>:<Notice>Registration is currently closed.</Notice>}
   {event.faqs?.length>0&&<section className="event-programme" aria-labelledby="event-programme-heading">
    <h2 id="event-programme-heading">{event.slug==='code-sastra-2026'?'The Code Sastra programme':'Event details'}</h2>
    {event.faqs.map((item:any,index:number)=><article key={item.q}><span className="event-programme-number">{String(index+1).padStart(2,'0')}</span><div><h3>{item.q}</h3><p>{item.a}</p></div></article>)}
   </section>}
   <div className="event-poster-contact">
    <h2>Stay connected.</h2>
    {details.website&&<a href={details.website} target="_blank" rel="noreferrer">codingclub.live ↗</a>}
    {details.instagram&&<a href={details.instagram} target="_blank" rel="noreferrer">@codingclub_recazm ↗</a>}
    {details.email&&<a href={'mailto:'+details.email}>{details.email}</a>}
   </div>
  </div>
 </section>;
}
