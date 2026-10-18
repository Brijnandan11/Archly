const fs=require('node:fs');
const esbuild=require('esbuild');
const http=require('node:http');
const proxy=require('./proxy.cjs');
(async()=>{
fs.mkdirSync('dist',{recursive:true});fs.cpSync('public/assets','dist/assets',{recursive:true});fs.copyFileSync('index.html','dist/index.html');
const ctx=await esbuild.context({entryPoints:['src/main.tsx'],bundle:true,outfile:'dist/assets/app.js',jsx:'automatic',sourcemap:true,define:{'process.env.NODE_ENV':'"development"','__API_BASE__':JSON.stringify(process.env.API_BASE_URL||'/api')},loader:{'.css':'css'}});
await ctx.rebuild();await ctx.watch();const server=await ctx.serve({servedir:'dist',host:'127.0.0.1',port:0});
const frontend=http.createServer((req,res)=>{if(req.url==='/api'||req.url.startsWith('/api/'))return proxy(req,res);const upstream=http.request({host:'127.0.0.1',port:server.port,path:req.url,method:req.method,headers:req.headers},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res)});upstream.on('error',()=>{res.writeHead(502);res.end('Frontend unavailable')});req.pipe(upstream)});
await new Promise((resolve,reject)=>{frontend.once('error',reject);frontend.listen(Number(process.env.PORT||5173),'127.0.0.1',resolve)});
console.log(`Coding Club: http://localhost:${frontend.address().port}`);
console.log('Source edits rebuild automatically. Refresh the browser to see changes.');
const stop=async()=>{frontend.close();await ctx.dispose();process.exit(0)};process.on('SIGINT',stop);process.on('SIGTERM',stop);
})().catch(e=>{console.error(e);process.exit(1)});
