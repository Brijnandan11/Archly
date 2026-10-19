import {API_BASE} from './api';
import {publicImageUrl} from './public-images';
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
const preloaded=new Set<string>();
const pendingImages=new Map<string,HTMLImageElement>();
export function preloadPublicImages(content:PublicContent){
 const urls=[...(content.events||[]).map(e=>e.banner||e.photos?.[0]),...(content.faculty||[]).map(p=>p.photo),...(content.team||[]).map(p=>p.photo)].filter(Boolean).map(publicImageUrl);
 for(const url of new Set(urls)){
  if(preloaded.has(url))continue;
  preloaded.add(url);
  const image=new Image();pendingImages.set(url,image);
  image.decoding='async';image.loading='eager';image.fetchPriority='low';
  image.onload=()=>{pendingImages.delete(url)};
  image.onerror=()=>{pendingImages.delete(url);preloaded.delete(url)};
  image.src=url;
 }
}
