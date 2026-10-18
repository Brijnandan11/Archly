(()=>{
  const overlay=document.getElementById('club-preloader'),root=document.getElementById('root');
  if(!overlay)return;
  const reels=overlay.querySelectorAll('.loader-reel'),counter=overlay.querySelector('.loader-counter'),stickers=overlay.querySelector('.loader-stickers'),dot=overlay.querySelector('.loader-dot');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,started=performance.now(),minimum=1500;
  const icons=Array.from({length:12},(_,i)=>`/assets/stickers/sticker-${String(i+1).padStart(2,'0')}.svg`);
  let raf=0,removed=false,finishing=false,appReady=!!window.__clubAppReady||!!root?.firstElementChild,lastStep=-1,stickerIndex=0,lastPointer=-1000,lastPosition=null,pendingPosition=null,inside=false,stickersRequested=false;
  const timers=new Set(),nodes=[],readyIcons=[],preloaded=[];
  const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn()},ms);timers.add(id);return id};
  function cleanup(){if(removed)return;removed=true;cancelAnimationFrame(raf);timers.forEach(clearTimeout);timers.clear();overlay.remove();root?.removeAttribute('inert');root?.removeAttribute('aria-hidden');document.documentElement.classList.remove('club-is-loading');window.__clubIntroDone=true;document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('club:ready',ready);window.removeEventListener('pageshow',pageShow);overlay.removeEventListener('pointermove',pointer);overlay.removeEventListener('pointerenter',pointer);preloaded.forEach(image=>{image.onload=null;image.onerror=null});overlay.removeEventListener('pointerleave',clearTrail);window.dispatchEvent(new Event('club:loaded'))}
  function key(event){if(event.key==='Escape')cleanup()}
  function visibility(){if(document.hidden)cleanup()}
  function pageShow(event){if(event.persisted)cleanup()}
  function clearTrail(){inside=false;pendingPosition=null;lastPosition=null;lastPointer=-1000;nodes.splice(0).forEach(image=>{image.getAnimations?.().forEach(animation=>animation.cancel());image.remove()})}
  function showSticker(position){
    if(removed||finishing||!inside||!readyIcons.length)return;
    const index=stickerIndex++,image=readyIcons[index%readyIcons.length],existing=nodes.indexOf(image),angle=(index*31)%44-22;
    if(existing>=0)nodes.splice(existing,1);
    image.getAnimations?.().forEach(animation=>animation.cancel());image.className='loader-sticker';image.style.animation='none';image.style.left=position.x+'px';image.style.top=position.y+'px';image.style.setProperty('--turn',angle+'deg');image.style.transform=`translate(-50%,-50%) rotate(${angle}deg) scale(1)`;image.style.opacity='1';stickers.appendChild(image);nodes.push(image);
    if(image.animate)image.animate([{transform:`translate(-50%,-50%) rotate(${angle-8}deg) scale(.65)`,opacity:0},{transform:`translate(-50%,-50%) rotate(${angle}deg) scale(1)`,opacity:1}],{duration:260,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
    if(nodes.length>6)nodes.shift().remove();
  }
  function requestStickers(){if(stickersRequested||reduced)return;stickersRequested=true;icons.slice(0,6).forEach(src=>{const image=document.createElement('img');image.alt='';image.draggable=false;image.decoding='async';preloaded.push(image);image.onload=()=>{Promise.resolve(image.decode?.()).catch(()=>{}).then(()=>{if(removed||readyIcons.includes(image))return;readyIcons.push(image);if(pendingPosition&&inside){const position=pendingPosition;pendingPosition=null;showSticker(position)}})};image.onerror=()=>{};image.src=src})}
  function pointer(event){if(removed||finishing||reduced||event.pointerType==='touch'||!stickers)return;inside=true;requestStickers();const now=performance.now();if(nodes.length&&now-lastPointer<130)return;if(lastPosition&&Math.hypot(event.clientX-lastPosition.x,event.clientY-lastPosition.y)<65)return;lastPointer=now;lastPosition={x:event.clientX,y:event.clientY};if(readyIcons.length)showSticker(lastPosition);else pendingPosition=lastPosition}
  // Use the decoded image elements themselves, so a cold-cache hover never
  // inserts an empty image or waits for a second request. Failed assets are skipped.
  function setStep(step){if(step===lastStep)return;lastStep=step;reels.forEach(reel=>{reel.style.transform=`translateY(-${step*10}%)`})}
  function finish(){if(finishing||removed)return;finishing=true;cancelAnimationFrame(raf);setStep(9);if(!counter||!dot||reduced){cleanup();return}const box=counter.getBoundingClientRect();dot.style.left=(box.left+box.width/2-6)+'px';dot.style.top=(box.top+box.height/2-6)+'px';overlay.classList.add('is-finishing');later(()=>{dot.style.opacity='1';overlay.classList.add('is-leaving')},120);later(cleanup,280)}
  function tick(now){if(removed||finishing)return;if(window.__clubIntroDone){cleanup();return}try{const elapsed=now-started;setStep(Math.min(appReady?9:8,Math.floor(elapsed/minimum*9)));if(appReady&&elapsed>=minimum){finish();return}raf=requestAnimationFrame(tick)}catch{cleanup()}}
  function ready(){appReady=true;if(reduced||performance.now()-started>=minimum)finish()}
  overlay.querySelector('button')?.addEventListener('click',cleanup);document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);window.addEventListener('pageshow',pageShow);overlay.addEventListener('pointermove',pointer,{passive:true});overlay.addEventListener('pointerenter',pointer,{passive:true});overlay.addEventListener('pointerleave',clearTrail);window.addEventListener('club:ready',ready);
  // Independent of fonts, image downloads, or the animation frame clock.
  later(cleanup,3000);
  if(reduced)cleanup();else raf=requestAnimationFrame(tick);
})();
