export type NavigationPosition={top:number;section?:string;offset?:number};
export function readNavigationPosition():NavigationPosition|null{
 const value=history.state?.clubScroll;
 return value&&Number.isFinite(value.top)&&value.top>=0?value:null;
}
export function saveNavigationPosition(){
 const top=Math.max(0,window.scrollY);
 let section:HTMLElement|undefined;
 document.querySelectorAll<HTMLElement>('[data-chapter][id]').forEach(element=>{if(element.getBoundingClientRect().top<=1)section=element});
 const position:NavigationPosition={top,...(section?{section:section.id.replace('section-',''),offset:-section.getBoundingClientRect().top}:{})};
 history.replaceState({...history.state,clubScroll:position},'');
 return position;
}
