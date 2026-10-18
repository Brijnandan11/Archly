/** Cancel leftover smooth-wheel momentum before native event scrolling takes over. */
export function createScrollHandoff(getLenis:()=>{reset:()=>void},getEvents:()=>HTMLElement|null){
 let wasNative=false;
 return ({event}: {event:Event})=>{
  const section=getEvents(),box=section?.getBoundingClientRect();
  // Use one viewport landmark, rather than the element under the pointer, so
  // crossing a poster or a gap cannot repeatedly switch scroll controllers.
  const center=window.innerHeight*.5;
  const inEvents=!!box&&box.top<=center&&box.bottom>center;
  const target=event.target instanceof Element?event.target:null;
  const native=inEvents||!!target?.closest('dialog,textarea,select,.table-scroll,[data-native-scroll]');
  if(native||wasNative)getLenis().reset();
  wasNative=native;
  return !native;
 };
}
