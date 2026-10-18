import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

test('frontend proxy preserves methods, auth, multipart bytes, CSV and backend errors',async()=>{
 const upstream=http.createServer(async(req,res)=>{const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);if(req.url==='/api/export'){res.writeHead(200,{'Content-Type':'text/csv','Content-Disposition':'attachment; filename="registrations.csv"'});res.end('code\r\nCC26-00001');return}if(req.url==='/api/failure'){res.writeHead(409,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Team full'}));return}res.setHeader('Content-Type','application/json');res.end(JSON.stringify({method:req.method,url:req.url,authorization:req.headers.authorization,type:req.headers['content-type'],body:body.toString('base64')}))});
 await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
 const oldTarget=process.env.API_TARGET;process.env.API_TARGET='http://127.0.0.1:'+upstream.address().port;
 const proxy=require('../app/proxy.cjs');const frontend=http.createServer(proxy);await new Promise(resolve=>frontend.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+frontend.address().port;
 try{
  const response=await fetch(base+'/api/admin/events?limit=100',{method:'PATCH',headers:{Authorization:'Bearer test-token','Content-Type':'application/json'},body:JSON.stringify({title:'Event'})});const data=await response.json();assert.equal(data.method,'PATCH');assert.equal(data.authorization,'Bearer test-token');assert.equal(data.url,'/api/admin/events?limit=100');assert.deepEqual(JSON.parse(Buffer.from(data.body,'base64').toString()),{title:'Event'});
  const form=new FormData();const bytes=new Uint8Array([0,255,1,2]);form.append('image',new Blob([bytes],{type:'image/png'}),'image.png');const upload=await(await fetch(base+'/api/admin/images/events/id',{method:'POST',body:form})).json();assert.match(upload.type,/multipart\/form-data; boundary=/);assert.ok(Buffer.from(upload.body,'base64').includes(Buffer.from(bytes)));
  const csv=await fetch(base+'/api/export');assert.match(csv.headers.get('content-disposition'),/registrations.csv/);assert.match(await csv.text(),/CC26-00001/);
  const failure=await fetch(base+'/api/failure');assert.equal(failure.status,409);assert.deepEqual(await failure.json(),{error:'Team full'});
  await new Promise(resolve=>upstream.close(resolve));const unavailable=await fetch(base+'/api/health');assert.equal(unavailable.status,502);assert.match((await unavailable.json()).error,/Backend unavailable/);
 }finally{await new Promise(resolve=>frontend.close(resolve));if(upstream.listening)await new Promise(resolve=>upstream.close(resolve));if(oldTarget===undefined)delete process.env.API_TARGET;else process.env.API_TARGET=oldTarget}
});
