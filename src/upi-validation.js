export function normalizeReference(value){return String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,64)}

export function extractPaymentDetails(input){
 const text=String(input||'').replace(/\s+/g,' ').slice(0,12000),candidates=[],seen=new Set();
 const label=/(?:UTR|RRN|UPI\s*(?:REF(?:ERENCE)?|TXN|TRANSACTION)?\s*(?:ID|NO|NUMBER|REF)?|TRANSACTION\s*(?:ID|NO|NUMBER|REF(?:ERENCE)?))\s*[:#\-]?\s*([A-Z0-9][A-Z0-9\-]{5,34})/ig;
 for(const match of text.matchAll(label)){
  const reference=normalizeReference(match[1]);if(!reference||seen.has(reference))continue;seen.add(reference);
  const surrounding=text.slice(Math.max(0,match.index-40),Math.min(text.length,match.index+match[0].length+32));
  candidates.push({reference,confidence:/\b(?:UTR|RRN)\b/i.test(match[0])?.98:/\b(?:transaction|txn|ref(?:erence)?)\b/i.test(match[0])?.92:.82,context:surrounding.slice(0,120)});
 }
 const amountMatch=text.match(/(?:₹|INR|Rs\.?\s*)\s*([0-9]+(?:[,.][0-9]{1,2})?)/i);
 const dateMatch=text.match(/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}(?:[, ]+\d{1,2}:\d{2}(?:\s*[AP]M)?)?|\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?)\b/i);
 const recipientMatch=text.match(/[A-Z0-9._+-]+@[A-Z0-9.-]+/i);
 return {text,candidates:candidates.slice(0,8),fields:{amount_rupees:amountMatch?Number(amountMatch[1].replace(',','.')):null,transaction_date_text:dateMatch?.[1]||null,recipient_upi:recipientMatch?.[0]?.replace(/[.,;:]$/,'')||null,success_text_detected:/\b(success(?:ful(?:ly)?)?|paid|completed)\b/i.test(text)}};
}
