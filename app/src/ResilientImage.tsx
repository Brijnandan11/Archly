import React,{useEffect,useRef,useState} from 'react';
import {publicImageUrl,retryImageUrl} from './public-images';

type Props=React.ComponentPropsWithoutRef<'img'>&{fallback?:React.ReactNode};
export default function ResilientImage(props:Props){
 const src=publicImageUrl(props.src);
 return <ImageRequest key={src} {...props} src={src}/>;
}
function ImageRequest({src,alt='',fallback,loading='eager',decoding='async',onError,onLoad,...props}:Props){
 const [attempt,setAttempt]=useState(0),[failed,setFailed]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{
  const recover=()=>{if(timer.current)clearTimeout(timer.current);setFailed(false);setAttempt(0)};
  window.addEventListener('online',recover);
  return()=>{window.removeEventListener('online',recover);if(timer.current)clearTimeout(timer.current)};
 },[]);
 if(!src||failed)return <>{fallback??(alt?<span role="img" aria-label={alt}>{alt}</span>:null)}</>;
 return <img {...props} key={attempt} src={retryImageUrl(src,attempt)} alt={alt} loading={loading} decoding={decoding} onLoad={event=>{if(timer.current)clearTimeout(timer.current);onLoad?.(event)}} onError={event=>{
  if(timer.current)clearTimeout(timer.current);
  if(attempt<3)timer.current=setTimeout(()=>setAttempt(value=>value+1),[400,1200,2500][attempt]);
  else{setFailed(true);onError?.(event)}
 }}/>;
}
