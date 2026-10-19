/** Validate the live form, including programmatic submit events, before any handler runs. */
export function validateFormSubmission(event:any){
 const form=event.target;
 if(!(form instanceof HTMLFormElement))return;
 for(const control of Array.from(form.elements)){
  if(!(control instanceof HTMLInputElement||control instanceof HTMLTextAreaElement||control instanceof HTMLSelectElement)||control.disabled||!control.required)continue;
  if(control instanceof HTMLInputElement&&['checkbox','radio','file','hidden','submit','button'].includes(control.type))continue;
  control.setCustomValidity(!control.value.trim()?'Please fill out this required field.':'');
 }
 if(!form.reportValidity()){event.preventDefault();event.stopPropagation()}
}
