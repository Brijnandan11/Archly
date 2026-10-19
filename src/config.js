import 'dotenv/config';
export const config={port:Number(process.env.PORT||4000),env:process.env.NODE_ENV||'development',databaseUrl:process.env.DATABASE_URL||'',jwtSecret:process.env.JWT_SECRET||'',corsOrigins:(process.env.CORS_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean)};
export function assertConfig(){if(!config.databaseUrl)throw Error('DATABASE_URL missing');if(config.env==='production'&&!config.corsOrigins.length)throw Error('CORS_ORIGINS required in production');if(config.jwtSecret.length<32)throw Error('JWT_SECRET must have at least 32 characters');}
