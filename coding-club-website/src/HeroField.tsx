import React,{useEffect,useRef} from 'react';
/** A generative signal surface integrated behind the original hero typography. */
export default function HeroField(){const ref=useRef<HTMLCanvasElement>(null);useEffect(()=>{
 const canvas=ref.current!,ctx=canvas.getContext('2d');if(!ctx)return;
 const host=canvas.closest('.kxr-root')!,surface=canvas.parentElement!;
 const media=matchMedia('(prefers-reduced-motion: reduce)');
 let width=1,height=1,frame=0,visible=false,previous=0,time=0,destroyed=false,light=0;
 let pointer={x:.5,y:.5},current={x:.5,y:.5};
 const sample=(u:number,v:number)=>{const edge=Math.pow(Math.min(1,Math.abs(u-.5)*2),.8),wave=Math.sin(u*5.8-time*.13);let x=u*width+Math.sin(v*1.9+u*4.6+time*.06)*width*.014,y=height*(.48+wave*.095)+v*height*(.045+edge*.19)*Math.cos(u*2.8+time*.045)+Math.sin(v*2.6+u*5)*height*.015;const dx=x-current.x*width,dy=y-current.y*height,radius=width*.2,force=Math.exp(-(dx*dx+dy*dy)/(radius*radius))*.12;x+=dx*force;y+=dy*force;return [x,y]};
 const paint=()=>{ctx.clearRect(0,0,width,height);ctx.lineWidth=.7;
  const glow=ctx.createRadialGradient(width*.16,height*.48,0,width*.16,height*.48,width*.32);glow.addColorStop(0,'rgba(165,23,34,.11)');glow.addColorStop(1,'rgba(165,23,34,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
  const gradient=ctx.createLinearGradient(0,0,width,0);[[0,.1],[.12,.54],[.29,.19],[.43,.025],[.57,.025],[.73,.19],[.9,.5],[1,.09]].forEach(([stop,alpha])=>gradient.addColorStop(stop,`rgba(255,${76+light*10},${65+light*8},${alpha})`));ctx.strokeStyle=gradient;
  const rows=width<650?9:14,segments=width<650?28:42;
  for(let row=0;row<rows;row++){const v=(row/(rows-1)-.5)*2;ctx.beginPath();for(let i=0;i<=segments;i++){const [x,y]=sample(i/segments*1.16-.08,v);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.globalAlpha=.5+Math.abs(v)*.4;ctx.stroke()}
  ctx.globalAlpha=.23;ctx.lineWidth=.55;for(let col=0;col<17;col++){const u=col/16;ctx.beginPath();for(let row=0;row<=16;row++){const [x,y]=sample(u,row/16*2-1);row?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}
  ctx.globalAlpha=1;const head=(time*.025+.12)%1.3-.15;
  if(head<.36||head>.66){ctx.beginPath();for(let i=0;i<=20;i++){const [x,y]=sample(head-i*.003,.92);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.lineWidth=1.2;ctx.strokeStyle='rgba(255,119,98,.65)';ctx.shadowBlur=9;ctx.shadowColor='#ff4e3c';ctx.stroke();ctx.shadowBlur=0}
 };
 const loop=(now:number)=>{if(destroyed||!visible||document.hidden||media.matches||document.documentElement.classList.contains('club-is-loading')){frame=0;return}frame=requestAnimationFrame(loop);if(now-previous<60)return;const delta=Math.min(.08,(now-previous)/1000);previous=now;time+=delta;current.x+=(pointer.x-current.x)*.065;current.y+=(pointer.y-current.y)*.065;paint()};
 const run=()=>{cancelAnimationFrame(frame);frame=0;previous=performance.now();paint();if(visible&&!document.hidden&&!media.matches&&!document.documentElement.classList.contains('club-is-loading'))frame=requestAnimationFrame(loop)};
 const resize=()=>{const rect=surface.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);const scale=Math.min(devicePixelRatio||1,1.25);canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);ctx.setTransform(scale,0,0,scale,0,0);run()};
 const move=(e:Event)=>{const p=e as PointerEvent;if(p.pointerType==='touch'||media.matches)return;const rect=surface.getBoundingClientRect();pointer={x:(p.clientX-rect.left)/width,y:(p.clientY-rect.top)/height};light=(p.target as Element).closest('.kxr-service')?1:0};
 const leave=()=>{pointer={x:.5,y:.5};light=0};
 const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;run()},{rootMargin:'40px'}),resizeObserver=new ResizeObserver(resize);intersection.observe(surface);resizeObserver.observe(surface);host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerleave',leave);document.addEventListener('visibilitychange',run);window.addEventListener('club:loaded',run);media.addEventListener('change',run);resize();
 return()=>{destroyed=true;cancelAnimationFrame(frame);intersection.disconnect();resizeObserver.disconnect();host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',run);window.removeEventListener('club:loaded',run);media.removeEventListener('change',run)};
 },[]);return <div className="hero-signal-field" aria-hidden="true"><canvas ref={ref}/><div className="hero-field-vignette"/></div>}
