import {createScrollHandoff} from './scrollHandoff';
import {installEventGalleries} from './galleryMotion';
let loading:Promise<void>|null=null;
function script(src:string){return new Promise<void>((resolve,reject)=>{const element=document.createElement('script');const timer=setTimeout(()=>{element.remove();reject(new Error('Motion asset timed out'))},30000);element.src=src;element.onload=()=>{clearTimeout(timer);resolve()};element.onerror=()=>{clearTimeout(timer);element.remove();reject(new Error('Motion asset unavailable'))};document.head.appendChild(element)})}
export function motionLibraries(){const w=window as any;if(w.gsap&&w.ScrollTrigger&&w.Lenis)return Promise.resolve();return loading ||= Promise.all([w.gsap?Promise.resolve():script('/assets/vendor/gsap.min.js'),w.Lenis?Promise.resolve():script('/assets/vendor/lenis.min.js')]).then(()=>w.ScrollTrigger?undefined:script('/assets/vendor/ScrollTrigger.min.js')).catch(error=>{loading=null;throw error})}
function introFinished(signal?:AbortSignal){if(signal?.aborted||!document.documentElement.classList.contains('club-is-loading'))return Promise.resolve();return new Promise<void>(resolve=>{const done=()=>{clearTimeout(timer);window.removeEventListener('club:loaded',done);signal?.removeEventListener('abort',done);resolve()};const timer=setTimeout(done,7500);window.addEventListener('club:loaded',done,{once:true});signal?.addEventListener('abort',done,{once:true})})}
export async function setupMotion(container:HTMLElement,signal?:AbortSignal){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||signal?.aborted)return()=>{};
 await Promise.all([motionLibraries(),introFinished(signal)]);
 if(signal?.aborted||!container.isConnected)return()=>{};
 const w=window as any,gsap=w.gsap,ScrollTrigger=w.ScrollTrigger;
 gsap.registerPlugin(ScrollTrigger);ScrollTrigger.config({ignoreMobileResize:true});
 const handoff=createScrollHandoff(()=>lenis,()=>container.querySelector<HTMLElement>('.event-showcase'));
 const lenis=new w.Lenis({lerp:.16,smoothWheel:true,syncTouch:false,anchors:false,virtualScroll:handoff,prevent:(node:HTMLElement)=>!!node.closest('dialog,textarea,select,.table-scroll')});
 w.__ccLenis=lenis;lenis.on('scroll',ScrollTrigger.update);
 const tick=(time:number)=>lenis.raf(time*1000);gsap.ticker.add(tick);gsap.ticker.lagSmoothing(0);
 const initialized=new WeakSet<Element>();let disposed=false,refreshTimer:any;
 const refresh=()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{if(!disposed){lenis.resize();ScrollTrigger.refresh();window.dispatchEvent(new Event('club:motion-ready'))}},100)};
 const ctx=gsap.context(()=>{},container);
 function addMotion(){ctx.add(()=>{
  container.querySelectorAll('.aim-stack-scene').forEach((scene:any)=>{
   if(initialized.has(scene))return;initialized.add(scene);scene.classList.add('is-animated');
   const panels=scene.querySelectorAll('.aim-scroll-panel');
   const timeline=gsap.timeline({scrollTrigger:{trigger:scene,start:'top top',end:'bottom bottom',scrub:.2,invalidateOnRefresh:true}});
   timeline.to(scene.querySelector('.aim-scene-title'),{y:-90,opacity:.58,duration:1.4,ease:'none'},0);
   timeline.to(scene.querySelector('.aim-scene-bottom'),{y:-40,opacity:0,duration:.8,ease:'none'},0);
   panels.forEach((panel:any,index:number)=>{
    timeline.fromTo(panel,{xPercent:10,yPercent:112,rotation:-7.5,scale:1.05,opacity:0},{xPercent:0,yPercent:0,rotation:0,scale:1,opacity:1,duration:1.1,ease:'power3.out'},.65+index*1.5);
   });
   timeline.to({hold:0},{hold:1,duration:.55});
  });
  container.querySelectorAll('.chapter-display').forEach((heading:any)=>{if(initialized.has(heading))return;initialized.add(heading);gsap.from(heading.querySelectorAll('.chapter-word'),{yPercent:110,rotation:3,stagger:.08,duration:.75,ease:'power4.out',scrollTrigger:{trigger:heading,start:'top 90%',once:true}})});
  container.querySelectorAll('.chapter-glyph').forEach((glyph:any)=>{if(initialized.has(glyph))return;initialized.add(glyph);gsap.to(glyph,{rotation:90,y:-35,ease:'none',scrollTrigger:{trigger:glyph.closest('.chapter-header'),start:'top bottom',end:'bottom top',scrub:.4}})});
  container.querySelectorAll<HTMLElement>('.archive-story').forEach(story=>{
   if(initialized.has(story))return;initialized.add(story);
   const art=story.querySelector('.archive-art'),photo=story.querySelector('.archive-photo-motion'),progress=story.querySelector('.archive-progress>span');
   gsap.fromTo(art,{clipPath:'inset(12% 0 12% 0 round 5px)'},{clipPath:'inset(0% 0 0% 0 round 5px)',ease:'power3.out',duration:1.1,scrollTrigger:{trigger:story,start:'top 88%',once:true}});
   gsap.fromTo(photo,{yPercent:-5},{yPercent:5,ease:'none',scrollTrigger:{trigger:story,start:'top bottom',end:'bottom top',scrub:true}});
   gsap.fromTo(progress,{scaleX:0},{scaleX:1,ease:'none',scrollTrigger:{trigger:story,start:'top 78%',end:'bottom 45%',scrub:true}});
  });
  const cards='.event-card,.person-card,.faculty-circle-card,.activity-tile,.metric,.recap-card,.team-slot';
  container.querySelectorAll('.reveal,'+cards+',.form-card,.form-summary,.detail-aside,.contact-facts>div,.footer-cta,.footer-columns>div,.chapter-next,.admin-top,.list-item').forEach((el:any)=>{
   if(initialized.has(el)||el.closest('dialog')||el.closest('.kxr-root'))return;initialized.add(el);
   if(el.parentElement?.closest('.reveal,.event-card,.person-card,.faculty-circle-card,.form-card'))return;
   const card=el.matches(cards),siblings=Array.from(el.parentElement?.children||[]),i=siblings.indexOf(el);
   gsap.from(el,{y:card?35:24,opacity:0,scale:card?.97:1,rotationX:card?4:0,transformPerspective:1000,duration:card?.6:.65,delay:card?(i%4)*.04:0,ease:'power3.out',clearProps:'opacity,visibility,scale,rotationX,transformPerspective',scrollTrigger:{trigger:el,start:'top 94%',once:true}});
  });
  container.querySelectorAll('.faculty-orbit').forEach((orbit:any)=>{if(initialized.has(orbit))return;initialized.add(orbit);gsap.fromTo(orbit,{rotation:-65},{rotation:65,ease:'none',scrollTrigger:{trigger:orbit.closest('.faculty-circle-card'),start:'top bottom',end:'bottom top',scrub:.35}})});
  container.querySelectorAll('.scroll-words').forEach((el:any)=>{if(initialized.has(el))return;initialized.add(el);gsap.fromTo(el.querySelectorAll('.scroll-word'),{opacity:.16},{opacity:1,stagger:.075,ease:'none',scrollTrigger:{trigger:el,start:'top 87%',end:'bottom 48%',scrub:.2}})});
  container.querySelectorAll('.parallax-symbol,.aim-club-logo,.title-flower').forEach((el:any)=>{if(initialized.has(el))return;initialized.add(el);gsap.to(el,{y:el.matches('.aim-club-logo')?-22:-50,ease:'none',scrollTrigger:{trigger:el.parentElement,start:'top bottom',end:'bottom top',scrub:.35}})});
  container.querySelectorAll('.event-card .art-orbit').forEach((el:any)=>{if(initialized.has(el))return;initialized.add(el);gsap.to(el,{rotation:45,ease:'none',scrollTrigger:{trigger:el.closest('.event-card'),start:'top bottom',end:'bottom top',scrub:.35}})});
  container.querySelectorAll('.word-reveal').forEach((el:any)=>{if(initialized.has(el))return;initialized.add(el);gsap.from(el.children,{y:40,opacity:.15,stagger:.06,duration:.8,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 88%'}})});
  container.querySelectorAll('.scroll-line').forEach((el:any)=>{if(initialized.has(el))return;initialized.add(el);gsap.from(el,{scaleX:0,transformOrigin:'left',scrollTrigger:{trigger:el,start:'top 95%',end:'top 40%',scrub:.2}})});
  container.querySelectorAll('.scroll-chapter').forEach((el:any)=>{if(initialized.has(el))return;initialized.add(el);ScrollTrigger.create({trigger:el,start:'top 65%',end:'bottom 25%',toggleClass:'chapter-in-view'})});
 })}
 addMotion();
 let disposeGalleries:()=>void=()=>{};ctx.add(()=>{disposeGalleries=installEventGalleries(container,gsap,ScrollTrigger,lenis)});
 let mutationFrame=0,tiltFrame=0,pendingPointer:PointerEvent|null=null;
 const touched=new Set<HTMLElement>();
 const observer=new MutationObserver(records=>{
  const changed=records.some(record=>{const target=record.target as Element;if(target.closest?.('.kxr-root,.toast,.cursor-ring,.cursor-dot,dialog'))return false;return [...Array.from(record.addedNodes),...Array.from(record.removedNodes)].some(node=>node.nodeType===1)});
  if(!changed||mutationFrame)return;
  mutationFrame=requestAnimationFrame(()=>{mutationFrame=0;if(!disposed){addMotion();refresh()}});
 });observer.observe(container,{childList:true,subtree:true});
 const updateTilt=()=>{tiltFrame=0;const event=pendingPointer;if(!event||disposed)return;const card=(event.target as Element).closest('.tilt') as HTMLElement;if(!card||!card.isConnected)return;const box=card.getBoundingClientRect();if(!box.width||!box.height)return;touched.add(card);card.style.setProperty('--pointer-x',((event.clientX-box.left)/box.width*100)+'%');card.style.setProperty('--pointer-y',((event.clientY-box.top)/box.height*100)+'%');gsap.to(card,{rotateX:-(event.clientY-box.top-box.height/2)/box.height*2.5,rotateY:(event.clientX-box.left-box.width/2)/box.width*2.5,transformPerspective:1000,duration:.22,ease:'power2.out',overwrite:'auto'})};
 const onMove=(event:PointerEvent)=>{if(event.pointerType==='touch'||!(event.target as Element).closest('.tilt'))return;pendingPointer=event;if(!tiltFrame)tiltFrame=requestAnimationFrame(updateTilt)};
 const onOut=(event:PointerEvent)=>{const card=(event.target as Element).closest('.tilt') as HTMLElement;if(card&&!card.contains(event.relatedTarget as Node)){pendingPointer=null;gsap.to(card,{rotateX:0,rotateY:0,duration:.3,overwrite:'auto'})}};
 container.addEventListener('pointermove',onMove,{passive:true});container.addEventListener('pointerout',onOut);document.fonts?.ready.then(()=>{if(!disposed)refresh()});refresh();
 return()=>{disposed=true;observer.disconnect();disposeGalleries();clearTimeout(refreshTimer);cancelAnimationFrame(mutationFrame);cancelAnimationFrame(tiltFrame);container.removeEventListener('pointermove',onMove);container.removeEventListener('pointerout',onOut);touched.forEach(card=>gsap.killTweensOf(card));ctx.revert();container.querySelectorAll('.aim-stack-scene').forEach(el=>el.classList.remove('is-animated'));gsap.ticker.remove(tick);lenis.destroy();if(w.__ccLenis===lenis)w.__ccLenis=null}
}
