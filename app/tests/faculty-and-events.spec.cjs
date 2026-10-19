const {test,expect}=require('@playwright/test');
const ranjana=require('../src/ranjana-profile.json');
const hacktober=require('../../scripts/data/hacktober-2026.json');
const common={event_date:'2099-10-29',start_time:'00:00:00',end_time:'23:59:00',venue:'Rajkiya Engineering College, Azamgarh',registration_start:'2020-01-01',registration_deadline:'2099-10-28',registration_fee:900,team_size:10,max_participants:200};
const main={...common,id:'code-id',title:'Code Sastra',slug:'code-sastra-2026',status:'OPEN',banner:'/assets/events/code-sastra-2026.webp',presentation:{poster_format:'portrait',display_order:0,schedule_pending:true}};
const hack={...common,...hacktober,id:'hack-id',event_date:'2099-10-30',status:'CLOSED',presentation:{poster_format:'portrait',display_order:1,end_date:'2099-10-30',registration_parent_slug:'code-sastra-2026',schedule_pending:true}};
const other={...common,id:'debug-id',title:'The Debug',slug:'code-sastra-the-debug-2026',status:'CLOSED',presentation:{display_order:2}};
test.beforeEach(async({page})=>{
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  const event=path.startsWith('/api/events/')?[main,hack,other].find(e=>path.endsWith('/'+e.id)||path.endsWith('/'+e.slug)):null;
  return route.fulfill({json:event|| (path==='/api/events'?[hack,other,main]:path==='/api/faculty'?[{...ranjana,id:'ranjana',hierarchy_level:6}]:path==='/api/settings'?{clubName:'Coding Club'}:[])});
 });
});
test('Ranjana has her supplied photograph and full expandable professional profile',async({page})=>{
 await page.goto('/#/faculty');
 await expect(page.getByRole('heading',{name:'Ranjana',exact:true})).toBeVisible();
 await expect.poll(()=>page.getByAltText('Ranjana',{exact:true}).evaluate(image=>image.complete&&image.naturalWidth>0)).toBe(true);
 await page.getByText('Profile details',{exact:false}).click();
 const details=page.locator('.faculty-profile-body');
 for(const text of ['BBD Group of Institutions','RR Group of Institutions','Indian Employment Card Project','IIT Kanpur','CGPA: 8.17','10/01/1998'])await expect(details).toContainText(text);
 await expect(details.getByRole('link',{name:'Email'})).toHaveAttribute('href','mailto:ranjanarao25@gmail.com');
 await expect(page.getByText('Mrs Ranjna',{exact:true})).toHaveCount(0);
});
test('Code Sastra is first, Hacktober second, with its complete programme below the poster',async({page})=>{
 await page.goto('/#/events');
 await expect(page.locator('.gallery-event-title h3')).toHaveText(['Code Sastra','Hacktober 2026','The Debug']);
 await page.locator('.gallery-card-image').nth(1).click();
 await expect(page.getByRole('heading',{name:'Hacktober 2026',exact:true})).toBeVisible();
 const details=page.locator('.event-poster-information');
 for(const text of ['Up to 10 people, including the leader','nine-hour','highest cumulative score','championship title','₹9 per participant'])await expect(details).toContainText(text);
 await expect(details).not.toContainText('Bug Bounty');
 await expect(details.getByRole('link',{name:'Register for Code Sastra'})).toHaveAttribute('href','#/event/code-sastra-2026');
});
