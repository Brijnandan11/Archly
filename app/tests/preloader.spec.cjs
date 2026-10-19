const {test,expect}=require('@playwright/test');
test.use({reducedMotion:'no-preference'});

test.beforeEach(async({page})=>{
 await page.route('**/api/**',route=>route.fulfill({json:route.request().url().includes('/settings')?{}:[]}));
});

test('refresh returns an internal route and scroll position to the beginning',async({page})=>{
 await page.goto('/#/events');
 await page.getByRole('button',{name:'SKIP INTRO'}).click();
 await expect(page).toHaveURL(/#\/events$/);
 await page.evaluate(()=>scrollTo(0,500));
 await page.reload();
 await expect(page).toHaveURL(/#\/$/);
 await page.getByRole('button',{name:'SKIP INTRO'}).click();
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
});

test('hover waits for decoded artwork set and draws a varied trail',async({page})=>{
 await page.route('**/stickers/sticker-06.svg',async route=>{
  await new Promise(resolve=>setTimeout(resolve,650));await route.continue();
 });
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.mouse.move(150,200);
 await expect(page.locator('.loader-sticker')).toHaveCount(0);
 await page.waitForTimeout(750);
 await page.mouse.move(700,400,{steps:24});
 await expect.poll(()=>page.locator('.loader-sticker').count()).toBeGreaterThan(1);
 const images=await page.locator('.loader-sticker').evaluateAll(nodes=>nodes.map(n=>({src:n.src,ready:n.complete&&n.naturalWidth>0})));
 expect(images.every(n=>n.ready)).toBeTruthy();
 expect(new Set(images.map(n=>n.src)).size).toBeGreaterThan(1);
 await page.getByRole('button',{name:'SKIP INTRO'}).click();
 await expect(page.locator('#club-preloader')).toHaveCount(0);
 await expect(page.locator('#root')).not.toHaveAttribute('inert','');
});

test('faculty has two leaders above one centered leader, with remaining profiles below',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.route('**/api/faculty',route=>route.fulfill({json:Array.from({length:7},(_,i)=>({id:String(i),name:'Faculty '+i,hierarchy_level:i,designation:'Faculty'}))}));
 await page.goto('/#/faculty');
 await expect(page.locator('.faculty-circle-card')).toHaveCount(7);
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:900});
  const boxes=await page.locator('.faculty-lead-row>.faculty-circle-card').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,bottom:r.bottom};}));
  expect(Math.abs(boxes[0].y-boxes[1].y)).toBeLessThan(2);
  expect(boxes[2].y).toBeGreaterThan(Math.max(boxes[0].bottom,boxes[1].bottom));
  expect(Math.abs(boxes[2].x+boxes[2].w/2-width/2)).toBeLessThan(3);
  expect(await page.locator('.faculty-mentor-row>.faculty-circle-card').count()).toBe(4);
 }
});

test('hero reveals with its local font and keeps Create Code Conquer unchanged',async({page})=>{
 await page.route('https://fonts.googleapis.com/**',route=>route.abort());
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('#club-preloader').waitFor({state:'hidden',timeout:6000});
 await expect(page.locator('.kxr-name h2')).toHaveText(['Create','Code','Conquer']);
 expect(await page.evaluate(()=>document.documentElement.classList.contains('club-hero-font-ready'))).toBe(true);
 const font=await page.locator('.kxr-name h2').first().evaluate(el=>getComputedStyle(el).fontFamily);
 expect(font).toContain('Club Hero');
});

test('a font arriving after the intro cannot change the visible hero lettering',async({page})=>{
 let release;
 const hold=new Promise(resolve=>{release=resolve;});
 await page.route('**/fonts/barlow-condensed-800.ttf',async route=>{await hold;await route.continue();});
 await page.goto('/',{waitUntil:'commit'});
 await page.locator('#club-preloader').waitFor({state:'hidden',timeout:6000});
 const measure=()=>page.locator('.kxr-name h2').evaluateAll(nodes=>nodes.map(el=>{const range=document.createRange();range.selectNodeContents(el);return {text:el.textContent,font:getComputedStyle(el).fontFamily,width:range.getBoundingClientRect().width};}));
 const before=await measure();
 release();
 await page.evaluate(()=>document.fonts.load('800 32px "Club Hero"'));
 await page.waitForTimeout(200);
 const after=await measure();
 expect(after).toEqual(before);
 expect(await page.evaluate(()=>document.documentElement.classList.contains('club-hero-font-ready'))).toBe(false);
});
