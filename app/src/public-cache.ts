import {API_BASE} from './api';
declare const __PUBLIC_SNAPSHOT__: any;
export type PublicContent={events?:any[];faculty?:any[];team?:any[];settings?:Record<string,any>};
const cacheKey='cc-public-content-v1:'+API_BASE;
const groups=['events','faculty','team','settings'] as const;
function valid(value:any):PublicContent{
 const result:PublicContent={};
 for(const group of groups){
  if(group==='settings'){if(value?.settings&&typeof value.settings==='object'&&!Array.isArray(value.settings))result.settings=value.settings;}
  else if(Array.isArray(value?.[group]))result[group]=value[group];
 }
 return result;
}
export function readPublicContent():PublicContent{
 const snapshot=typeof __PUBLIC_SNAPSHOT__==='object'?__PUBLIC_SNAPSHOT__:null;
 let saved:any;
 try{saved=JSON.parse(localStorage.getItem(cacheKey)||'null');}catch{}
 const latest=saved?.at>=(snapshot?.at||0)&&Date.now()-saved.at<7*86400000?saved:null;
 return {...valid(snapshot?.data),...valid(latest?.data)};
}
export function savePublicContent(content:PublicContent){
 try{localStorage.setItem(cacheKey,JSON.stringify({at:Date.now(),data:valid(content)}));}catch{}
}
export function preloadPublicImages(content:PublicContent){
 const urls=[...(content.events||[]).slice(0,4).map(e=>e.banner||e.photos?.[0]),...(content.faculty||[]).slice(0,3).map(p=>p.photo)].filter(Boolean);
 for(const url of new Set(urls)){const image=new Image();image.decoding='async';image.src=url;}
}
