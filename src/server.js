import app from './app.js';import {assertConfig,config} from './config.js';import {pool} from './db.js';
assertConfig();await pool.query('SELECT 1');const server=app.listen(config.port,()=>console.log(`Coding Club API on port ${config.port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await pool.end();process.exit(0)}));
