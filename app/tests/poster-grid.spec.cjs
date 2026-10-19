const {test,expect}=require('@playwright/test');
test.use({reducedMotion:'no-preference'});
const posters=['code-sastra','bug-bounty','the-debug','tech-quiz'];
test('poster frames fit while desktop scroll animation and mobile navigation remain active',async({page})=>{
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  return route.fulfill({json:path==='/api/events'?posters.map((poster,i)=>({id:String(i),title:poster,slug:poster,event_date:'2099-01-01',start_time:'00:00:00',end_time:'23:59:00',status:'CLOSED',registration_fee:0,team_size:3,max_participants:1,banner:'/assets/events/'+poster+'-2026.webp',presentation:{poster_format:'portrait',schedule_pending:true,registration_pending:true,capacity_pending:true}})):path==='/api/settings'?{}:[]});
 });
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/#/section/events');
 await expect(page.locator('.gallery-posters .gallery-card')).toHaveCount(4);
 await page.locator('#club-preloader').waitFor({state:'hidden'});
 await expect(page.locator('.gallery-posters')).toHaveClass(/is-kinetic/);
 await page.evaluate(()=>{window.__ccLenis.scrollTo(document.querySelector('.gallery-posters'),{immediate:true});window.ScrollTrigger.update();});
 expect(await page.locator('.gallery-posters').evaluate(el=>el.offsetHeight)).toBeGreaterThan(900*4);
 const before=await page.locator('.gallery-posters .gallery-rail').evaluate(el=>getComputedStyle(el).transform);
 await page.getByRole('button',{name:'Next event',exact:true}).click();
 await expect(page.locator('.gallery-posters [data-gallery-current]')).toHaveText('02');
 const after=await page.locator('.gallery-posters .gallery-rail').evaluate(el=>getComputedStyle(el).transform);
 expect(after).not.toBe(before);
 await page.getByRole('button',{name:'Next event',exact:true}).click();
 await expect(page.locator('.gallery-posters [data-gallery-current]')).toHaveText('03');
 await page.getByRole('button',{name:'Next event',exact:true}).click();
 await expect(page.locator('.gallery-posters [data-gallery-current]')).toHaveText('04');
 await expect(page.getByRole('button',{name:'Next event',exact:true})).toBeDisabled();
 for(const width of [1440,900,390]){
  await page.setViewportSize({width,height:900});
  const frames=await page.locator('.gallery-posters .gallery-card-image').evaluateAll(nodes=>nodes.map(el=>{const img=el.querySelector('img');return {ratio:el.offsetWidth/el.offsetHeight,width:el.clientWidth,imageWidth:img.clientWidth,imageHeight:img.clientHeight,height:el.clientHeight,loaded:img.complete&&img.naturalWidth>0};}));
  for(const frame of frames){
   expect(frame.loaded).toBe(true);expect(Math.abs(frame.ratio-2/3)).toBeLessThan(.01);
   expect(Math.abs(frame.width-frame.imageWidth)).toBeLessThan(3);
   expect(Math.abs(frame.height-frame.imageHeight)).toBeLessThan(3);
  }
  if(width<1000)await expect(page.locator('.gallery-posters')).not.toHaveClass(/is-kinetic/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 await page.setViewportSize({width:1440,height:900});
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.locator('.gallery-posters')).not.toHaveClass(/is-kinetic/);
});

// Browser toolbars and laptop display scaling often reduce CSS viewport height.
test('short laptop viewports retain the floating gallery and working controls',async({page})=>{
 await page.route('**/api/**',route=>route.fulfill({json:new URL(route.request().url()).pathname==='/api/events'?posters.map((poster,i)=>({id:String(i),title:poster,slug:poster,event_date:'2099-01-01',status:'CLOSED',team_size:10,banner:'/assets/events/'+poster+'-2026.webp',presentation:{poster_format:'portrait'}})):[]}));
 await page.route('**/assets/vendor/ScrollTrigger.min.js',async route=>{await new Promise(resolve=>setTimeout(resolve,4500));await route.continue()});
 await page.setViewportSize({width:1366,height:600});
 await page.goto('/#/section/events');
 await page.locator('#club-preloader').waitFor({state:'hidden'});
 const gallery=page.locator('.gallery-posters');
 await expect(gallery).toHaveClass(/is-kinetic/,{timeout:15000});
 await page.evaluate(()=>{window.__ccLenis.scrollTo(document.querySelector('.gallery-posters'),{immediate:true});window.ScrollTrigger.update()});
 await expect.poll(()=>gallery.locator('.gallery-stage').evaluate(el=>el.getBoundingClientRect().height)).toBe(600);
 await page.getByRole('button',{name:'Next event',exact:true}).click();
 await expect(gallery.locator('[data-gallery-current]')).toHaveText('02');
 await page.getByRole('button',{name:'Next event',exact:true}).click();
 await expect(gallery.locator('[data-gallery-current]')).toHaveText('03');
 await page.getByRole('button',{name:'Next event',exact:true}).click();
 await expect(gallery.locator('[data-gallery-current]')).toHaveText('04');
 await expect(gallery.locator('.gallery-card-actions').last()).toBeInViewport();
 await page.setViewportSize({width:1280,height:540});
 await expect(gallery).toHaveClass(/is-kinetic/,{timeout:15000});
 await expect.poll(()=>gallery.locator('.gallery-stage').evaluate(el=>el.getBoundingClientRect().height)).toBe(540);
});

test('tablet logo retains its artwork and assembly animation without fragment clips',async({page})=>{
 await page.setViewportSize({width:820,height:1180});
 await page.route('**/api/**',route=>route.fulfill({json:[]}));
 await page.goto('/');
 await page.locator('#club-preloader').waitFor({state:'hidden'});
 const brand=page.locator('.brand');
 await expect(brand).toBeVisible();
 await expect.poll(()=>brand.locator('img').evaluate(img=>img.complete&&img.naturalWidth===907)).toBe(true);
 const parts=await brand.locator('.brand-sequence image').evaluateAll(nodes=>nodes.map(el=>({clip:getComputedStyle(el).clipPath,animation:getComputedStyle(el.parentElement).animationName,href:el.getAttribute('href')})));
 expect(parts).toHaveLength(3);
 for(const part of parts){expect(part.clip).toMatch(/^polygon/);expect(part.clip).not.toContain('url(');expect(part.animation).toMatch(/logo-.*-assemble/);expect(part.href).toBe('/assets/club-logo.png')}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
