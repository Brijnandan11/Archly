import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {recognizePaymentScreenshot,stopPaymentOCR} from '../src/payment-ocr.js';

// Real raster images + bundled Tesseract model, with no mocked recognition.
test('extracts UTR from receipt image pixels using the bundled offline model',{timeout:90000},async t=>{
 t.after(stopPaymentOCR);
 for(const [label,reference,dark] of [['UTR No.','612345678901',false],['UPI transaction ID','734567890123',true],['Bank Reference Number','856789012345',false]]){
  await t.test(label,async()=>{
   const background=dark?'#171717':'#ffffff',ink=dark?'#ffffff':'#171717';
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100"><rect width="900" height="1100" fill="${background}"/><g fill="${ink}" font-family="DejaVu Sans" font-size="36"><text x="60" y="100">TEST PAYMENT RECEIPT</text><text x="60" y="210">Payment successful</text><text x="60" y="310">Amount Rs. 9.00</text><text x="60" y="460">${label}</text><text x="60" y="530">${reference}</text><text x="60" y="710">Paid to test@upi</text></g></svg>`;
   const image=await sharp(Buffer.from(svg)).png().toBuffer();
   const result=await recognizePaymentScreenshot(image);
   assert.equal(result.extraction_error,undefined);
   assert.equal(result.candidates[0]?.reference,reference,JSON.stringify(result));
   const repeated=await recognizePaymentScreenshot(image);assert.strictEqual(repeated,result);
  });
 }
});
