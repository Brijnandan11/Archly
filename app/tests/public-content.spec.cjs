const {test,expect}=require('@playwright/test');
const event={id:'11111111-1111-4111-8111-111111111111',title:'Cached workshop',slug:'cached-workshop',event_date:'2099-01-01',start_time:'10:00:00',registration_start:'2020-01-01',registration_deadline:'2098-01-01',registration_fee:0,team_size:1,max_participants:30,status:'OPEN'};
async function content(page,{slowFaculty=false}={}){
 let offline=false;
 await page.route('**/api/**',async route=>{
  if(offline||(slowFaculty&&route.request().url().endsWith('/faculty')))return route.abort();
  const path=new URL(route.request().url()).pathname;
  await route.fulfill({json:path==='/api/events'?[event]:path==='/api/settings'?{clubName:'Fast Club'}:[]});
 });
 return ()=>{offline=true;};
}

test('events appear without waiting for faculty requests',async({page})=>{
 await content(page,{slowFaculty:true});
 await page.goto('/#/events');
 await expect(page.getByRole('heading',{name:event.title,exact:true})).toBeVisible({timeout:3000});
 await expect(page.getByText('Connecting to the club',{exact:false})).toHaveCount(0);
});

test('refresh shows saved public events immediately while backend is unavailable',async({page})=>{
 const disconnect=await content(page);
 await page.goto('/#/events');
 await expect(page.getByRole('heading',{name:event.title,exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('cc-public-content-v1:')))).toBe(true);
 disconnect();
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page).toHaveURL(/#\/$/);
 await page.evaluate(()=>location.hash='/events');
 await expect(page.getByRole('heading',{name:event.title,exact:true})).toBeVisible({timeout:3000});
 await expect(page.getByText('Connecting to the club',{exact:false})).toHaveCount(0);
});

test('unavailable browser storage does not prevent live public data loading',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked')};Storage.prototype.setItem=()=>{throw Error('blocked')};});
 await content(page);
 await page.goto('/#/events');
 await expect(page.getByRole('heading',{name:event.title,exact:true})).toBeVisible();
});
