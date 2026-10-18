import crypto from 'node:crypto';import jwt from 'jsonwebtoken';import {config} from './config.js';import {query} from './db.js';
export class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
export const fail=(status,message)=>{throw new HttpError(status,message)};
export const handler=fn=>(req,res,next)=>Promise.resolve().then(()=>fn(req,res,next)).catch(next);
export const validate=(schema,field='body')=>(req,res,next)=>{const result=schema.safeParse(req[field]);if(!result.success)return res.status(400).json({error:'Validation failed',details:result.error.issues.map(x=>({path:x.path.join('.'),message:x.message}))});req[field]=result.data;next()};
export const id=()=>crypto.randomUUID();
export const sign=user=>jwt.sign({sub:user.id,role:user.role,ver:user.token_version},config.jwtSecret,{expiresIn:'8h',issuer:'coding-club',audience:'coding-club-api'});
export const auth=handler(async(req,res,next)=>{const token=/^Bearer (.+)$/i.exec(req.headers.authorization||'')?.[1];if(!token)fail(401,'Authentication required');let claim;try{claim=jwt.verify(token,config.jwtSecret,{issuer:'coding-club',audience:'coding-club-api'});}catch{fail(401,'Invalid or expired token')}const r=await query('SELECT id,role,email,token_version FROM club.users WHERE id=$1 AND is_active=true',[claim.sub]);if(!r.rows[0]||claim.ver!==undefined&&claim.ver!==r.rows[0].token_version)fail(401,'Session invalid');req.user=r.rows[0];req.token=token;next()});
export const role=(...roles)=>(req,res,next)=>roles.includes(req.user?.role)?next():next(new HttpError(403,'Forbidden'));
export const pagination=q=>{const limit=q.limit===undefined?20:Number(q.limit),offset=q.offset===undefined?0:Number(q.offset);if(!Number.isSafeInteger(limit)||limit<1||!Number.isSafeInteger(offset)||offset<0)fail(400,'Invalid pagination');return {limit:Math.min(100,limit),offset};};
export const audit=async(c,actor,action,target,details={})=>c.query('INSERT INTO club.audit_logs(actor_id,action,target_id,details) VALUES($1,$2,$3,$4)',[actor||null,action,target||null,JSON.stringify(details)]);
