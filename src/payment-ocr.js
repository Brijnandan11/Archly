import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createWorker,PSM} from 'tesseract.js';
import sharp from 'sharp';
import {extractPaymentDetails} from './upi-validation.js';

// Ship the model with the application: receipt uploads must not depend on a CDN.
const langPath=fileURLToPath(new URL('../node_modules/@tesseract.js-data/eng/4.0.0_best_int/',import.meta.url));
let workerPromise,queue=Promise.resolve(),pending=0;
const cache=new Map(),inFlight=new Map();
function deadline(promise,ms){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('OCR_TIMEOUT')),ms)})]).finally(()=>clearTimeout(timer))}
export function initializePaymentOCR(){
 workerPromise??=createWorker('eng',1,{langPath,cacheMethod:'none',gzip:true,errorHandler:()=>{}}).catch(error=>{workerPromise=undefined;throw error});
 return workerPromise;
}
export async function stopPaymentOCR(){const current=workerPromise;workerPromise=undefined;if(current)await current.then(worker=>worker.terminate()).catch(()=>{})}
const failure=reason=>({...extractPaymentDetails(''),confidence:0,extraction_error:reason});
export function recognizePaymentScreenshot(buffer){
 const key=crypto.createHash('sha256').update(buffer).digest('hex'),cached=cache.get(key);
 if(cached&&cached.expires>Date.now())return Promise.resolve(cached.result);
 if(inFlight.has(key))return inFlight.get(key);
 if(pending>=2)return Promise.resolve(failure('busy'));
 pending++;
 const task=queue.then(async()=>{
  try{
   const result=await deadline((async()=>{
    const worker=await initializePaymentOCR();
    // Preserve small reference digits; flatten transparent images onto white.
    const image=await sharp(buffer,{limitInputPixels:12_000_000,failOn:'error'}).rotate().flatten({background:'#ffffff'}).resize({width:1600,height:2600,fit:'inside',withoutEnlargement:true}).grayscale().normalize().png().toBuffer();
    await worker.setParameters({tessedit_pageseg_mode:PSM.AUTO,preserve_interword_spaces:'1'});
    let recognition=await worker.recognize(image),details=extractPaymentDetails(recognition.data.text);
    if(!details.candidates.length){
     await worker.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT});
     const alternate=await worker.recognize(image),parsed=extractPaymentDetails(alternate.data.text);
     if(parsed.candidates.length||alternate.data.confidence>recognition.data.confidence){recognition=alternate;details=parsed}
    }
    return {...details,confidence:Math.max(0,Math.min(1,Number(recognition.data.confidence||0)/100))};
   })(),35000);
   if(cache.size>=100)cache.delete(cache.keys().next().value);
   cache.set(key,{result,expires:Date.now()+10*60_000});return result;
  }catch(error){
   console.error('Payment OCR failed:',error?.message==='OCR_TIMEOUT'?'recognition timed out':'recognition engine unavailable');
   await stopPaymentOCR();return failure(error?.message==='OCR_TIMEOUT'?'timeout':'unavailable');
  }
 });
 queue=task.catch(()=>{}).finally(()=>{pending--});
 const response=deadline(task,45000).catch(()=>failure('busy')).finally(()=>inFlight.delete(key));
 inFlight.set(key,response);return response;
}
