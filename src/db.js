import pg from 'pg';import {readFileSync} from 'node:fs';import {config} from './config.js';
const databaseHost=config.databaseUrl?new URL(config.databaseUrl).hostname:'';
const isSupabase=databaseHost.endsWith('.supabase.co')||databaseHost.endsWith('.pooler.supabase.com');
const ssl=isSupabase?{rejectUnauthorized:true,ca:readFileSync(new URL('../certs/supabase-ca.crt',import.meta.url),'utf8')}:config.env==='production'?{rejectUnauthorized:true}:undefined;
export const pool=new pg.Pool({connectionString:config.databaseUrl,max:5,connectionTimeoutMillis:15000,idleTimeoutMillis:30000,ssl});
export const query=(s,p=[])=>pool.query(s,p);
export async function tx(fn){const c=await pool.connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
