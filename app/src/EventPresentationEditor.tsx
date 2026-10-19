
import {Field} from './ui';
export default function EventPresentationEditor({event,onChange}:any){
 const details=event.presentation||{};
 const set=(key:string,value:any)=>onChange({...event,presentation:{...details,[key]:value}});
 return <fieldset className="form-card"><legend>Poster and published event details</legend>
  <div className="form-grid">
   <Field label="Event end date" type="date" required={false} min={event.event_date?.slice(0,10)} value={details.end_date||''} onChange={(e:any)=>set('end_date',e.target.value||undefined)}/>
   <Field label="Poster format" required={false} value={details.poster_format||'landscape'} options={['landscape','portrait']} onChange={(e:any)=>set('poster_format',e.target.value)}/>
   {[['organiser','Organiser','text'],['website','Event website','url'],['instagram','Event Instagram','url'],['email','Event email','email']].map(([key,label,type])=><Field key={key} label={label} type={type} required={false} value={details[key]||''} onChange={(e:any)=>set(key,e.target.value)}/>)}
  </div>
  {[['schedule_pending','Session timings to be announced'],['registration_pending','Registration details to be announced'],['capacity_pending','Participant capacity to be announced']].map(([key,label])=><label className="check-label" key={key}><input type="checkbox" checked={!!details[key]} onChange={e=>set(key,e.target.checked)}/>{label}</label>)}
 </fieldset>;
}
