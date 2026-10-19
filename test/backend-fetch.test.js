import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../app/package.json',import.meta.url));
const {code}=require('esbuild').transformSync(readFileSync(new URL('../app/src/backend-fetch.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'});
const {backendFetch}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));

test('cold start reads retry a temporary unavailable response and recover',async t=>{
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>++calls===1?new Response('Starting',{status:503}):Response.json({ready:true}));
 const response=await backendFetch('https://api.example.invalid/events');
 assert.equal(calls,2);assert.deepEqual(await response.json(),{ready:true});
});

test('payments and registrations are never automatically replayed',async t=>{
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;throw new TypeError('Network disconnected');});
 await assert.rejects(backendFetch('https://api.example.invalid/register',{method:'POST',body:'{}'}),/Network disconnected/);
 assert.equal(calls,1);
});

test('cancelled reads do not restart',async t=>{
 const controller=new AbortController();let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;controller.abort();throw controller.signal.reason;});
 await assert.rejects(backendFetch('https://api.example.invalid/events',{signal:controller.signal}),{name:'AbortError'});
 assert.equal(calls,1);
});
