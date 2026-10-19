import test from 'node:test';
import assert from 'node:assert/strict';
import {startMailRunner} from '../src/mail-runner.js';

test('mail runner waits for active delivery and stops without overlapping batches',async()=>{
 let finish,calls=0;
 const stop=startMailRunner({deliver:()=>{calls++;return new Promise(resolve=>{finish=resolve;});},intervalMs:1});
 await new Promise(resolve=>setTimeout(resolve,10));
 assert.equal(calls,1);
 let stopped=false;
 const stopping=stop().then(()=>{stopped=true;});
 await Promise.resolve();assert.equal(stopped,false);
 finish();await stopping;
 await new Promise(resolve=>setTimeout(resolve,10));assert.equal(calls,1);
});

test('mail runner retries after an unexpected delivery error',async()=>{
 let calls=0,errors=0,ready;
 const retried=new Promise(resolve=>{ready=resolve;});
 const stop=startMailRunner({deliver:async()=>{calls++;if(calls===1)throw Error('database unavailable');ready();},intervalMs:1,onError:()=>{errors++;}});
 const keepAlive=setTimeout(()=>{},1000);
 try{await retried;await stop();assert.equal(errors,1);assert.equal(calls,2);}finally{clearTimeout(keepAlive);await stop();}
});
