/** Scroll-driven floating event rails, adapted to the club's own content. */
export function installEventGalleries(container:HTMLElement,gsap:any,ScrollTrigger:any,lenis:any){
 const media=gsap.matchMedia();
 media.add('(min-width: 1000px) and (min-height: 480px) and (prefers-reduced-motion: no-preference)',()=>{
  const cleanups:Array<()=>void>=[];
  container.querySelectorAll<HTMLElement>('[data-event-gallery]').forEach(gallery=>{
   const rail=gallery.querySelector<HTMLElement>('.gallery-rail')!,cards=Array.from(gallery.querySelectorAll<HTMLElement>('.gallery-card'));
   if(cards.length<2)return;
   const counter=gallery.querySelector<HTMLElement>('[data-gallery-current]')!,previous=gallery.querySelector<HTMLButtonElement>('[data-gallery-step="-1"]')!,next=gallery.querySelector<HTMLButtonElement>('[data-gallery-step="1"]')!;
   const portrait=gallery.classList.contains('gallery-posters');
   const pixel=1/Math.max(1,Math.min(devicePixelRatio||1,2));
   const sharp=(value:number)=>Math.round(value/pixel)*pixel;
   let distance=0,step=0,current=-1,progress=0,railY=0;
   gallery.classList.add('is-kinetic');
   const startX=()=>portrait?innerWidth*.5-(cards[0].offsetLeft+cards[0].offsetWidth*.5):innerWidth*(cards.length===2?.32:.14);
   const endX=()=>innerWidth*.5-(cards[cards.length-1].offsetLeft+cards[cards.length-1].offsetWidth*.5);
   const size=()=>{if(portrait){const head=gallery.querySelector<HTMLElement>('.gallery-head')!,hud=gallery.querySelector<HTMLElement>('.gallery-hud')!;railY=head.offsetTop+head.offsetHeight+24;const info=Math.max(...cards.map(card=>card.querySelector<HTMLElement>('.gallery-card-info')!.offsetHeight));const width=Math.max(100,Math.min(360,(hud.offsetTop-railY-info-48)/1.5));cards.forEach(card=>{card.style.width=width+'px';card.style.flexBasis=width+'px'})}else railY=innerHeight*.14;step=portrait?0:Math.min(72,innerHeight*.147);distance=Math.max((startX()-endX()),innerHeight*(cards.length-1));gallery.style.height=(innerHeight+distance+70)+'px'};
   const paint=(value:number)=>{progress=value;const x=startX()+(endX()-startX())*value;let nearest=0,delta=Infinity;cards.forEach((card,i)=>{const d=Math.abs(x+card.offsetLeft+card.offsetWidth*.5-innerWidth*.5);if(d<delta){delta=d;nearest=i}});const featured=portrait?nearest:value*(cards.length-1),index=Math.round(featured);cards.forEach((card,i)=>{const difference=Math.min(2,Math.abs(i-featured)),angle=[-1.4,1.1,-.8,1.5][i%4];card.style.transform=`translate(0,${sharp(i*step)}px)`;const artwork=card.querySelector<HTMLElement>('.gallery-art-motion');if(artwork){artwork.style.transform=`perspective(1400px) translateZ(${80-difference*105}px) rotate(${angle}deg) rotateY(${angle*.6}deg) scale(${1-difference*.055})`;artwork.style.opacity=String(1-difference*.12)};card.classList.toggle('is-featured',i===index)});if(index!==current){current=index;counter.textContent=String(index+1).padStart(2,'0');previous.disabled=index===0;next.disabled=index===cards.length-1}};
   size();paint(0);
   const tween=gsap.fromTo(rail,{x:startX,y:()=>railY,force3D:false},{x:endX,y:()=>railY-(cards.length-1)*step,force3D:false,snap:{x:pixel,y:pixel},ease:'none',scrollTrigger:{trigger:gallery,start:'top top',end:()=>'+='+distance,scrub:true,invalidateOnRefresh:true,onUpdate:(self:any)=>paint(self.progress),onToggle:(self:any)=>gallery.classList.toggle('gallery-is-near',self.isActive)}});
   const go=(index:number)=>{const target=Math.max(0,Math.min(cards.length-1,index)),trigger=tween.scrollTrigger;const targetX=innerWidth*.5-(cards[target].offsetLeft+cards[target].offsetWidth*.5);const phase=Math.max(0,Math.min(1,(startX()-targetX)/(startX()-endX())));lenis.scrollTo(trigger.start+phase*distance,{immediate:true})};
   const previousClick=()=>go(current-1),nextClick=()=>go(current+1);
   const focus=(event:FocusEvent)=>{if(!(event.target as Element).matches(':focus-visible'))return;const card=(event.target as Element).closest<HTMLElement>('.gallery-card');if(!card)return;const index=cards.indexOf(card);if(index>=0&&index!==current)go(index)};
   const refresh=()=>{size();paint(progress)};
   previous.addEventListener('click',previousClick);next.addEventListener('click',nextClick);gallery.addEventListener('focusin',focus);ScrollTrigger.addEventListener('refreshInit',refresh);
   cleanups.push(()=>{previous.removeEventListener('click',previousClick);next.removeEventListener('click',nextClick);gallery.removeEventListener('focusin',focus);ScrollTrigger.removeEventListener('refreshInit',refresh);gallery.classList.remove('is-kinetic','gallery-is-near');gallery.style.removeProperty('height');cards.forEach(card=>{card.style.removeProperty('transform');card.style.removeProperty('opacity');card.style.removeProperty('width');card.style.removeProperty('flex-basis');const artwork=card.querySelector<HTMLElement>('.gallery-art-motion');artwork?.style.removeProperty('transform');artwork?.style.removeProperty('opacity');card.classList.remove('is-featured')});previous.disabled=false;next.disabled=false});
  });
  return()=>cleanups.forEach(cleanup=>cleanup());
 });
 return()=>media.revert();
}
