import {query,tx,pool} from '../src/db.js';
import {audit} from '../src/utils.js';
const email=process.argv[2]?.trim().toLowerCase();
try{
 if(!email||!/^\S+@\S+\.\S+$/.test(email))throw Error('Usage: npm run admin:promote -- registered-email@example.com');
 await tx(async c=>{const user=(await c.query('SELECT id,role FROM club.users WHERE email=$1 AND is_active=true FOR UPDATE',[email])).rows[0];if(!user)throw Error('Register this account through the website first.');if(user.role==='ADMIN')return;await c.query("UPDATE club.users SET role='ADMIN',token_version=token_version+1 WHERE id=$1",[user.id]);await audit(c,null,'OPERATOR_PROMOTED_ADMIN',user.id)});
 console.log('Administrator access enabled. Sign out and sign in again.');
}catch(e){console.error(e.message);process.exitCode=1}finally{await pool.end()}
