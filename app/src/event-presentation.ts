import {fmt,money} from './model';
export function orderEvents(events:any[]){
 return [...events].sort((a,b)=>{
  const order=(event:any)=>event.presentation?.display_order??(event.slug==='code-sastra-2026'?0:['code-sastra-hacktober-2026','code-sastra-bug-bounty-2026'].includes(event.slug)?1:1000);
  return order(a)-order(b);
 });
}
export function eventDates(event:any){
 const start=event.date||String(event.event_date||'').slice(0,10);
 const end=event.presentation?.end_date;
 return end&&end!==start?`${fmt(start)} – ${fmt(end)}`:fmt(start);
}
export const eventTime=(event:any)=>event.presentation?.schedule_pending?'To be announced':event.time||event.start_time?.slice(0,5)||'To be announced';
export const eventPrice=(event:any)=>event.presentation?.registration_pending?'To be announced':money(event.fee??event.registration_fee/100);
