import app from './app.js';import {assertConfig,config} from './config.js';import {pool} from './db.js';
import {deliverNotifications} from './notifications.js';
import {startMailRunner} from './mail-runner.js';
assertConfig();await pool.query('SELECT 1');const server=app.listen(config.port,()=>console.log(`Coding Club API on port ${config.port}`));
const stopMail=process.env.RESEND_API_KEY&&process.env.MAIL_FROM?startMailRunner({deliver:deliverNotifications}):async()=>{};
let closing=false;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{
 if(closing)return;closing=true;
 const mailStopped=stopMail();
 server.close(async()=>{await mailStopped;await pool.end();process.exit(0)});
});
