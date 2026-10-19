const {test,expect}=require('@playwright/test');
test.use({reducedMotion:'no-preference'});
const posters=['code-sastra','bug-bounty','the-debug','tech-quiz'];
test('posters fill matching frames across desktop, tablet and mobile',async({page})=>{
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  return route.fulfill({json:path==='/api/events'?posters.map((poster,i)=>({id:String(i),title:poster,slug:poster,event_date:'2099-01-01',start_time:'00:00:00',end_time:'23:59:00',status:'CLOSED',registration_fee:0,team_size:3,max_participants:1,banner:'/assets/events/'+poster+'-2026.webp',presentation:{poster_format:'portrait',schedule_pending:true,registration_pending:true,capacity_pending:true}})):path==='/api/settings'?{}:[]});
 });
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/#/section/events');
 await expect(page.locator('.gallery-posters .gallery-card')).toHaveCount(4);
 await page.locator('#club-preloader').waitFor({state:'hidden'});
 for(const [width,columns] of [[1440,4],[900,2],[390,1]]){
  await page.setViewportSize({width,height:900});
  await expect.poll(()=>page.locator('.gallery-posters .gallery-rail').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(columns);
  const frames=await page.locator('.gallery-posters .gallery-card-image').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect(),img=el.querySelector('img'),image=img.getBoundingClientRect();return {ratio:r.width/r.height,width:r.width,imageWidth:image.width,imageHeight:image.height,height:r.height,loaded:img.complete&&img.naturalWidth>0};}));
  for(const frame of frames){
   expect(frame.loaded).toBe(true);expect(Math.abs(frame.ratio-2/3)).toBeLessThan(.01);
   expect(Math.abs(frame.width-frame.imageWidth)).toBeLessThan(3);
   expect(Math.abs(frame.height-frame.imageHeight)).toBeLessThan(3);
  }
  await expect(page.locator('.gallery-posters')).not.toHaveClass(/is-kinetic/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 await page.locator('.gallery-posters').screenshot({path:'/tmp/codingclub-poster-grid-mobile.png'});
});
