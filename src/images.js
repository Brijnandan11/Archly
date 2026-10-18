import {Router} from 'express';
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'node:crypto';
import {auth,role,handler,fail,audit} from './utils.js';
import {tx} from './db.js';
const r=Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:1,fields:0},fileFilter:(_req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp','image/avif'].includes(file.mimetype))});
const bucket='coding-club-media';
function settings(){const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SECRET_KEY;if(!url||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!key)fail(503,'Storage provider not configured');return {url,key};}
export function imagePath(kind,id){if(!['events','faculty','team'].includes(kind)||!/^[-0-9a-f]{36}$/i.test(id))fail(400,'Invalid image target');return `${kind}/${id}/${crypto.randomUUID()}.webp`;}
const uploader=upload.single('image');
r.post('/admin/images/:kind/:id',auth,role('ADMIN'),(req,res,next)=>uploader(req,res,err=>err?next(err):next()),handler(async(req,res)=>{
 if(!req.file)fail(400,'A JPEG, PNG, AVIF or WebP image is required');
 const kind=req.params.kind,id=req.params.id,path=imagePath(kind,id);const table=kind==='events'?'events':kind==='faculty'?'faculty':'student_team';const column=kind==='events'?'banner':'photo';
 let output;try{output=await sharp(req.file.buffer,{limitInputPixels:25_000_000,failOn:'error'}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:4}).toBuffer();}catch{fail(400,'Invalid image data');}
 const {url,key}=settings();const uploadUrl=`${url}/storage/v1/object/${bucket}/${path}`;
 // Make sure the target belongs to a valid database record before uploading.
 const result=await tx(async c=>{const record=await c.query(`SELECT id FROM club.${table} WHERE id=$1 FOR UPDATE`,[id]);if(!record.rowCount)fail(404,'Record not found');return true;});
 if(!result)fail(404,'Record not found');
 const response=await fetch(uploadUrl,{method:'POST',headers:{apikey:key,'Content-Type':'image/webp','x-upsert':'false','Cache-Control':'public, max-age=31536000'},body:output});
 if(!response.ok)fail(502,'Image storage upload failed');
 const publicUrl=`${url}/storage/v1/object/public/${bucket}/${path}`;
 try{await tx(async c=>{const updated=await c.query(`UPDATE club.${table} SET ${column}=$1 WHERE id=$2 RETURNING id`,[publicUrl,id]);if(!updated.rowCount)fail(404,'Record not found');await audit(c,req.user.id,'ADMIN_UPLOADED_IMAGE',id,{kind,path,bytes:output.length});});}
 catch(e){await fetch(uploadUrl,{method:'DELETE',headers:{apikey:key}}).catch(()=>{});throw e;}
 res.status(201).json({url:publicUrl,kind,record_id:id,content_type:'image/webp',bytes:output.length});
}));
export default r;
