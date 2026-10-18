/** Scroll-driven floating event rails, adapted to the club's own content. */
export function installEventGalleries(container:HTMLElement,gsap:any,ScrollTrigger:any,lenis:any){
 const media=gsap.matchMedia();
 media.add('(min-width: 1000px) and (min-height: 650px) and (prefers-reduced-motion: no-preference)',()=>{
  const cleanups:Array<()=>void>=[];
  container.querySelectorAll<HTMLElement>('[data-event-gallery]').forEach(gallery=>{
   const rail=gallery.querySelector<HTMLElement>('.gallery-rail')!,cards=Array.from(gallery.querySelectorAll<HTMLElement>('.gallery-card'));
   if(cards.length<2)return;
   const counter=gallery.querySelector<HTMLElement>('[data-gallery-current]')!,previous=gallery.querySelector<HTMLButtonElement>('[data-gallery-step="-1"]')!,next=gallery.querySelector<HTMLButtonElement>('[data-gallery-step="1"]')!;
   const pixel=1/Math.max(1,Math.min(devicePixelRatio||1,2));
   const sharp=(value:number)=>Math.round(value/pixel)*pixel;
   let distance=0,step=0,current=-1,progress=0;
   gallery.classList.add('is-kinetic');
   const startX=()=>innerWidth*(cards.length===2?.32:.1);
   const endX=()=>innerWidth*.5-(cards[cards.length-1].offsetLeft+cards[cards.length-1].offsetWidth*.5);
   const size=()=>{step=Math.min(68,innerHeight*.075);distance=Math.max((startX()-endX()),innerHeight*.7);gallery.style.height=(innerHeight+distance+70)+'px'};
   const paint=(value:number)=>{progress=value;const featured=value*(cards.length-1),index=Math.round(featured);cards.forEach((card,i)=>{const difference=Math.min(2,Math.abs(i-featured)),angle=[-2.2,1.6,-1.4,2.4][i%4];card.style.transform=`translate(0,${sharp(i*step)}px)`;const artwork=card.querySelector<HTMLElement>('.gallery-art-motion');if(artwork){artwork.style.transform=`perspective(1400px) translateZ(${60-difference*90}px) rotate(${angle}deg) rotateY(${angle*.6}deg) scale(${1-difference*.045})`;artwork.style.opacity=String(1-difference*.22)};card.classList.toggle('is-featured',i===index)});if(index!==current){current=index;counter.textContent=String(index+1).padStart(2,'0');previous.disabled=index===0;next.disabled=index===cards.length-1}};
   size();paint(0);
   const tween=gsap.fromTo(rail,{x:startX,y:()=>innerHeight*.07,force3D:false},{x:endX,y:()=>innerHeight*.07-(cards.length-1)*step,force3D:false,snap:{x:pixel,y:pixel},ease:'none',scrollTrigger:{trigger:gallery,start:'top top',end:()=>'+='+distance,scrub:true,invalidateOnRefresh:true,onUpdate:(self:any)=>paint(self.progress),onToggle:(self:any)=>gallery.classList.toggle('gallery-is-near',self.isActive)}});
   const go=(index:number)=>{const phase=Math.max(0,Math.min(cards.length-1,index))/(cards.length-1),trigger=tween.scrollTrigger;lenis.scrollTo(trigger.start+phase*distance,{immediate:true})};
   const previousClick=()=>go(current-1),nextClick=()=>go(current+1);
   const focus=(event:FocusEvent)=>{if(!(event.target as Element).matches(':focus-visible'))return;const card=(event.target as Element).closest<HTMLElement>('.gallery-card');if(!card)return;const index=cards.indexOf(card);if(index>=0&&Math.abs(index-progress*(cards.length-1))>.45)go(index)};
   const refresh=()=>{size();paint(progress)};
   previous.addEventListener('click',previousClick);next.addEventListener('click',nextClick);gallery.addEventListener('focusin',focus);ScrollTrigger.addEventListener('refreshInit',refresh);
   cleanups.push(()=>{previous.removeEventListener('click',previousClick);next.removeEventListener('click',nextClick);gallery.removeEventListener('focusin',focus);ScrollTrigger.removeEventListener('refreshInit',refresh);gallery.classList.remove('is-kinetic','gallery-is-near');gallery.style.removeProperty('height');cards.forEach(card=>{card.style.removeProperty('transform');card.style.removeProperty('opacity');const artwork=card.querySelector<HTMLElement>('.gallery-art-motion');artwork?.style.removeProperty('transform');artwork?.style.removeProperty('opacity');card.classList.remove('is-featured')});previous.disabled=false;next.disabled=false});
  });
  return()=>cleanups.forEach(cleanup=>cleanup());
 });
 return()=>media.revert();
}
