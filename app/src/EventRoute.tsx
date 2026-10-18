import React,{useEffect,useState} from 'react';
import {eventView,get} from './api';
import {EventDetails,Registration} from './PublicPages';
import {Empty,Notice} from './ui';
export default function EventRoute({event,register,...props}:any){const [fresh,setFresh]=useState<any>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);const slug=event?.slug;
 useEffect(()=>{const controller=new AbortController();setFresh(null);setError('');setLoading(true);if(!slug){setLoading(false);return()=>controller.abort()}get('/events/'+encodeURIComponent(slug),{signal:controller.signal}).then(row=>setFresh(eventView(row))).catch(e=>{if(e.name!=='AbortError')setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[slug,retry]);
 if(error)return <Notice type="error">{error} <button onClick={()=>setRetry(x=>x+1)}>Retry</button></Notice>;
 if(loading)return <Notice>Loading event details…</Notice>;
 if(!fresh)return <Empty title="Event not found" copy="This event may be unavailable or archived."/>;
 return register?<Registration {...props} event={fresh}/>:<EventDetails {...props} event={fresh}/>;
}
