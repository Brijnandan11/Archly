const fs=require('fs');
const {createHash}=require('node:crypto');
async function snapshot(){
 const base=process.env.API_BASE_URL?.replace(/\/$/,'');
 if(!base)return null;
 const data={};
 await Promise.all(['events','faculty','team','settings'].map(async group=>{
  try{
   const rows=[];
   for(let offset=0;;offset+=100){
    const response=await fetch(base+'/'+group+(group==='events'?'?limit=100&offset='+offset:''),{signal:AbortSignal.timeout(90000)});
    if(!response.ok)throw Error('HTTP '+response.status);
    const value=await response.json();
    if(group!=='events'){if(group==='settings'?(!value||typeof value!=='object'||Array.isArray(value)):!Array.isArray(value))throw Error('Invalid public content');data[group]=value;break;}
    if(!Array.isArray(value))throw Error('Invalid event list');
    rows.push(...value);
    if(value.length<100){data.events=rows;break;}
   }
  }catch(error){console.warn('Public snapshot unavailable for '+group+': '+error.message);}
 }));
 console.log('Bundled public content: '+Object.keys(data).join(', '));
 return {at:Date.now(),data};
}
async function build(){
 const publicSnapshot=await snapshot();
 fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync('dist',{recursive:true});
 fs.cpSync('public/assets','dist/assets',{recursive:true});fs.copyFileSync('index.html','dist/index.html');
 require('esbuild').buildSync({entryPoints:['src/main.tsx'],bundle:true,outfile:'dist/assets/app.js',minify:true,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','__API_BASE__':JSON.stringify(process.env.API_BASE_URL||'/api'),'__PUBLIC_SNAPSHOT__':JSON.stringify(publicSnapshot)},loader:{'.css':'css'}});
 let html=fs.readFileSync('dist/index.html','utf8');
 for(const asset of ['app.js','app.css']){
  const digest=createHash('sha256').update(fs.readFileSync('dist/assets/'+asset)).digest('hex').slice(0,16);
  html=html.replace(new RegExp('/assets/'+asset.replace('.','\\.')+'\\?v=[^"\\s]+','g'),'/assets/'+asset+'?v='+digest);
 }
 fs.writeFileSync('dist/index.html',html);
}
build().catch(error=>{console.error(error);process.exitCode=1;});
