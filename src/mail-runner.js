export function startMailRunner({deliver,intervalMs=15000,onError=console.error}) {
 let stopped=false,timer,current;
 async function run(){
  try { await deliver(10); } catch(error) { onError('Email queue processing failed:',error.message); }
  if(!stopped){timer=setTimeout(()=>{current=run();},intervalMs);timer.unref();}
 }
 current=run();
 return async()=>{stopped=true;clearTimeout(timer);await current;};
}
