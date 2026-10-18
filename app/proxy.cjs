const http=require('node:http');
const https=require('node:https');
const target=new URL(process.env.API_TARGET||'http://127.0.0.1:4000');
module.exports=function proxy(req,res){
 const client=target.protocol==='https:'?https:http;
 const upstream=client.request(new URL(req.url,target),{method:req.method,headers:{...req.headers,host:target.host}},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res)});
 upstream.setTimeout(30000,()=>upstream.destroy(new Error('API timeout')));
 upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Backend unavailable. Start the API server on port 4000 or set API_TARGET.'}))});
 req.on('aborted',()=>upstream.destroy());req.pipe(upstream);
};
