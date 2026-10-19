const {test,expect}=require('@playwright/test');
const ranjana=require('../src/ranjana-profile.json');
const hacktober=require('../../scripts/data/hacktober-2026.json');
const registrationUrl='https://events.mlh.com/events/15026-hacktoberfest-hack-day-azamgarh-x-init-build-rec-azamgarh';
const common={event_date:'2099-10-29',start_time:'00:00:00',end_time:'23:59:00',venue:'Rajkiya Engineering College, Azamgarh',registration_start:'2020-01-01',registration_deadline:'2099-10-28',registration_fee:900,team_size:10,max_participants:200};
const main={...common,id:'code-id',title:'Code Sastra',slug:'code-sastra-2026',status:'OPEN',banner:'/assets/events/code-sastra-2026.webp',presentation:{poster_format:'portrait',display_order:0,schedule_pending:true}};
const hack={...common,...hacktober,id:'hack-id',event_date:'2099-10-30',status:'CLOSED',presentation:{poster_format:'portrait',display_order:1,end_date:'2099-10-30',registration_url:registrationUrl,registration_parent_slug:'code-sastra-2026',schedule_pending:true}};
const other={...common,id:'debug-id',title:'The Debug',slug:'code-sastra-the-debug-2026',status:'CLOSED',presentation:{display_order:2}};
test.beforeEach(async({page})=>{
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  const event=path.startsWith('/api/events/')?[main,hack,other].find(e=>path.endsWith('/'+e.id)||path.endsWith('/'+e.slug)):null;
  return route.fulfill({json:event|| (path==='/api/events'?[hack,other,main]:path==='/api/faculty'?[{...ranjana,id:'ranjana',hierarchy_level:6}]:path==='/api/settings'?{clubName:'Coding Club'}:[])});
 });
});
test('Ranjana has her supplied photograph and a concise profile matching the other faculty',async({page})=>{
 await page.goto('/#/faculty');
 await expect(page.getByRole('heading',{name:'Ranjana',exact:true})).toBeVisible();
 await expect.poll(()=>page.getByAltText('Ranjana',{exact:true}).evaluate(image=>image.complete&&image.naturalWidth>0)).toBe(true);
 await page.getByText('Profile details',{exact:false}).click();
 const details=page.locator('.faculty-profile-body');
 for(const text of ['M.Tech','M.Sc.','B.Tech','C programming','student mentoring'])await expect(details).toContainText(text);
 expect((await details.innerText()).length).toBeLessThan(600);
 await expect(details.getByRole('link',{name:'Email'})).toHaveAttribute('href','mailto:ranjanarao25@gmail.com');
 await expect(page.getByText('Mrs Ranjna',{exact:true})).toHaveCount(0);
});
test('Code Sastra is first, Hacktober second, with its complete programme below the poster',async({page})=>{
 await page.goto('/#/events');
 await expect(page.locator('.gallery-event-title h3')).toHaveText(['Code Sastra','Hacktober 2026','The Debug']);
 await page.locator('.gallery-card-image').nth(1).click();
 await expect(page.getByRole('heading',{name:'Hacktober 2026',exact:true})).toBeVisible();
 const details=page.locator('.event-poster-information');
 for(const text of ['Up to 10 people, including the leader','nine-hour','highest cumulative score','championship title','official MLH event page'])await expect(details).toContainText(text);
 await expect(details).not.toContainText('Bug Bounty');
 const button=details.getByRole('link',{name:'Register for Hacktober'});
 await expect(button).toHaveAttribute('href',registrationUrl);
 await expect(details.getByRole('link',{name:'Register for Code Sastra'})).toHaveCount(0);
 await expect(details).not.toContainText('₹9');
 await page.route(registrationUrl,route=>route.fulfill({contentType:'text/html',body:'<h1>MLH event registration</h1>'}));
 await button.click();await expect(page).toHaveURL(registrationUrl);
});
test('the gallery registration button and old local register route both open MLH',async({page})=>{
 await page.goto('/#/events');
 const button=page.locator('.gallery-card').nth(1).getByRole('link',{name:'Register',exact:false});
 await expect(button).toHaveAttribute('href',registrationUrl);
 await page.route(registrationUrl,route=>route.fulfill({contentType:'text/html',body:'<h1>MLH event registration</h1>'}));
 await button.click();await expect(page).toHaveURL(registrationUrl);
 await page.goto('/#/register/hack-id');await expect(page).toHaveURL(registrationUrl);
});
