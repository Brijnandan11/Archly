const {test,expect}=require('@playwright/test');
const event={id:'image-event',title:'Image loading workshop',slug:'image-workshop',banner:'https://codingclub.live/assets/events/code-sastra-2026.webp',event_date:'2099-01-01',start_time:'10:00:00',registration_start:'2020-01-01',registration_deadline:'2098-01-01',registration_fee:0,team_size:1,max_participants:30,status:'OPEN'};
const faculty=Array.from({length:5},(_,i)=>({id:'faculty-'+i,name:'Faculty '+i,designation:'Professor',photo:'/assets/faculty/tauseef-ahmad.jpg',hierarchy_level:i}));
const team=Array.from({length:13},(_,i)=>({id:'team-'+i,name:'Student '+i,position:'Technical Team',photo:'/assets/team/sadaf.jpg',hierarchy_level:i}));
async function content(page){
 let offline=false;
 await page.route('**/api/**',route=>{
  if(offline)return route.abort();
  const path=new URL(route.request().url()).pathname;
  return route.fulfill({json:path==='/api/events'?[event]:path==='/api/faculty'?faculty:path==='/api/team'?team:{clubName:'Image Test Club'}});
 });
 return ()=>{offline=true};
}
async function portraitsReady(page){
 await expect(page.locator('.faculty-portrait img')).toHaveCount(5);
 await expect(page.locator('.trg-portrait img')).toHaveCount(13);
 await expect.poll(()=>page.locator('.faculty-portrait img,.trg-portrait img,.gallery-event-photo').evaluateAll(images=>images.length===19&&images.every(image=>image.complete&&image.naturalWidth>0))).toBe(true);
}
test('public images load before scrolling, retry failures, and survive refresh with the API unavailable',async({page})=>{
 const disconnect=await content(page);let failures=0,foreignAssetRequests=0;
 page.on('request',request=>{if(request.url().startsWith('https://codingclub.live/assets/'))foreignAssetRequests++});
 await page.route('**/assets/faculty/tauseef-ahmad.jpg*',route=>++failures<=2?route.fulfill({status:503,headers:{'Cache-Control':'no-store'},body:'Temporary failure'}):route.continue());
 await page.goto('/');
 await portraitsReady(page);
 expect(failures).toBeGreaterThan(2);
 expect(foreignAssetRequests).toBe(0);
 await expect(page.locator('.trg-portrait img').first()).toHaveAttribute('loading','eager');
 await expect.poll(()=>page.evaluate(()=>Object.keys(localStorage).some(key=>key.startsWith('cc-public-content-v1:')))).toBe(true);
 disconnect();await page.reload({waitUntil:'domcontentloaded'});
 await portraitsReady(page);
});
test('portraits recover when the connection returns after all initial attempts fail',async({page})=>{
 await content(page);let restored=false;
 await page.route('**/assets/team/sadaf.jpg*',route=>restored?route.continue():route.fulfill({status:503,headers:{'Cache-Control':'no-store'},body:'Offline'}));
 await page.goto('/');
 await expect(page.locator('.trg-fallback')).toHaveCount(13,{timeout:12000});
 restored=true;await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 await portraitsReady(page);
});
