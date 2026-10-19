// Club assets exist in every deployment; use its own CDN rather than another
// deployment's hostname. Leave private, signed and third-party URLs untouched.
export function publicImageUrl(source:string|undefined){
 if(!source)return '';
 try{
  const url=new URL(source,'https://codingclub.live');
  if(['codingclub.live','www.codingclub.live','codingclub-app.vercel.app'].includes(url.hostname)&&url.pathname.startsWith('/assets/'))return url.pathname+url.search;
 }catch{}
 return source;
}

export function retryImageUrl(source:string,attempt:number){
 if(!attempt)return source;
 // Changing signed URLs can invalidate their signature. Only bypass the cache
 // for the app's own static assets after an actual load failure.
 if(!source.startsWith('/assets/'))return source;
 const url=new URL(source,'https://codingclub.live');
 url.searchParams.set('__image_retry',String(attempt));
 return url.pathname+url.search;
}
