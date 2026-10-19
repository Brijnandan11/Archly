import React,{useEffect,useState} from 'react';
import {eventView,get} from './api';
import {EventDetails,Registration} from './PublicPages';
import {Empty,Notice} from './ui';
export default function EventRoute({event,eventId,register,...props}:any){const [fresh,setFresh]=useState<any>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);const slug=event?.slug||eventId;
 useEffect(()=>{const controller=new AbortController();setFresh(null);setError('');setLoading(true);if(!slug){setLoading(false);return()=>controller.abort()}get('/events/'+encodeURIComponent(slug),{signal:controller.signal}).then(row=>setFresh(eventView(row))).catch(e=>{if(e.name!=='AbortError')setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[slug,retry]);
 if(error)return <Notice type="error">{error} <button onClick={()=>setRetry(x=>x+1)}>Retry</button></Notice>;
 if(register)return <Registration {...props} event={fresh||event} checking={loading||!fresh}/>;
 if(loading&&!event)return <Notice>Loading event details…</Notice>;
 if(loading&&event)return <EventDetails {...props} event={event}/>;
 if(!fresh)return <Empty title="Event not found" copy="This event may be unavailable or archived."/>;
 return <EventDetails {...props} event={fresh}/>;
}
