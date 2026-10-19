// Retry reads during a cold start. Mutations are never replayed automatically.
export async function backendFetch(url:string,options:RequestInit={}){
 const read=(options.method||'GET')==='GET';
 for(let attempt=0;;attempt++){
  options.signal?.throwIfAborted();
  const signal=read?AbortSignal.any([...(options.signal?[options.signal]:[]),AbortSignal.timeout(25000)]):options.signal;
  try{
   const response=await fetch(url,{...options,signal});
   if(!read||attempt===3||![502,503,504].includes(response.status))return response;
   await response.body?.cancel();
  }catch(error){
   if(options.signal?.aborted||!read||attempt===3)throw error;
  }
  await new Promise<void>((resolve,reject)=>{
   const abort=()=>{clearTimeout(timer);reject(options.signal?.reason);};
   const timer=setTimeout(()=>{options.signal?.removeEventListener('abort',abort);resolve();},3000);
   options.signal?.addEventListener('abort',abort,{once:true});
  });
 }
}
