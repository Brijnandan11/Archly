const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'club-render-'));
try {
 const entry = path.join(temporary, 'check.cjs');
 esbuild.buildSync({stdin:{contents:`
 import React from 'react';
 import {renderToStaticMarkup} from 'react-dom/server';
 import assert from 'node:assert/strict';
 import App from './src/App';
 import {Events} from './src/PublicPages';
 import {initial,canRegister} from './src/model';
 globalThis.location={hash:'#/'};
 const home=renderToStaticMarkup(<App/>);
 const events=renderToStaticMarkup(<Events store={initial}/>);
 assert(!home.includes('SAMPLE EVENT'));
 assert(home.includes('Loading club information'));
 for(const html of [events]){
  assert(html.includes('UPCOMING.'));
  assert(html.includes('PAST.'));
  assert.equal((html.match(/class="gallery-card gallery-shape-/g)||[]).length,initial.events.filter(e=>e.status==='upcoming').length);
  assert.equal((html.match(/class="archive-story"/g)||[]).length,initial.events.filter(e=>e.status==='past').length);
  for(const event of initial.events.filter(e=>e.status==='past'))assert(html.includes('href="#/event/'+event.id+'"'));
  for(const event of initial.events.filter(canRegister))assert(html.includes('href="#/register/'+event.id+'"'));
 }
 console.log('Homepage and events finish rendering; all event cards and registration links are present.');
 `,resolveDir:root,loader:'tsx'},bundle:true,platform:'node',outfile:entry,jsx:'automatic',loader:{'.css':'empty'}});
 const result=spawnSync(process.execPath,['--max-old-space-size=256',entry],{timeout:8000,encoding:'utf8'});
 if(result.error||result.status!==0)throw new Error(result.error?.message||result.stderr||'Rendering failed.');
 process.stdout.write(result.stdout);
} finally {fs.rmSync(temporary,{recursive:true,force:true});}
