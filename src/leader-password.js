import {randomBytes,randomInt} from 'node:crypto';

const words=['Cedar','Orbit','Maple','River','Falcon','Comet','Amber','Cloud','Birch','Coral','Summit','Meadow','Willow','Harbor','Flint','Grove'];
export function generateLeaderPassword(){
 const first=words[randomInt(words.length)],second=words[randomInt(words.length)].toLowerCase();
 const token=randomBytes(12).toString('base64url');
 const digits=String(randomInt(1000,10000));
 switch(randomInt(4)){
  case 0:return `${first}!${token}.${second}${digits}`;
  case 1:return `${digits}-${second}@${first}-${token}`;
  case 2:return `${token}#${first}_${digits}_${second}`;
  default:return `${second}.${first}+${token}!${digits}`;
 }
}
