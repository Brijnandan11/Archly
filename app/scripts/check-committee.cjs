const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'club-committee-'));
try{
 const file=path.join(temp,'check.cjs');
 esbuild.buildSync({stdin:{contents:`
 import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import assert from 'node:assert/strict';
 import {readStore,legacyInitial as initial} from './src/legacy-store';import {committeeMembers} from './src/committeeMembers';import TeamSection from './src/TeamSection';import CreatorCredits from './src/CreatorCredits';
 assert.equal(committeeMembers.length,13);
 assert.deepEqual(committeeMembers.map(p=>p.name),['Peeyush Yadav', 'Utkarsh Upadhyay', 'Brijnandan', 'Saloni', 'Sadaf', 'Aryan Vishwakarma', 'Prince Kumar Keshri', 'Deepa Singh', 'Aditi Chaubey', 'Akash Singh', 'Priyanshu Awasthi', 'Atul Prakash Verma', 'Disha Prajapati']);
 let saved=JSON.stringify({...initial,committeeDirectoryVersion:undefined,profiles:[...initial.profiles.filter(p=>p.kind==='faculty'),{id:'student-0',kind:'student',name:'Old demo',placeholder:true}],registrations:[{id:'KEEP-ME'}]});
 globalThis.localStorage={getItem:()=>saved,setItem:(key,value)=>{saved=value}};
 const migrated=readStore();assert.equal(migrated.profiles.filter(p=>p.kind==='student').length,13);assert.equal(migrated.profiles.filter(p=>p.kind==='faculty').length,7);assert.equal(migrated.registrations[0].id,'KEEP-ME');
 const html=renderToStaticMarkup(<TeamSection store={migrated}/>),credits=renderToStaticMarkup(<CreatorCredits/>);
 assert(!html.includes('LinkedIn'));assert(!html.includes('Jitesh'));assert(!html.includes('Demo portrait'));assert(html.includes('href="https://thebrij.xyz"'));assert(html.includes('href="https://github.com/Brijnandan11"'));
 assert(!credits.includes('Jitesh'));assert(credits.includes('src="/assets/creators/portrait-sticker.png"'));assert(!credits.includes('Explore my work'));assert(!credits.includes('<a '));assert.equal(migrated.profiles.find(p=>p.id==='committee-brijnandan').role,'Technical Team');
 const persisted=JSON.parse(saved);persisted.profiles=persisted.profiles.filter(p=>p.name!=='Saloni');saved=JSON.stringify(persisted);assert(!readStore().profiles.some(p=>p.name==='Saloni'),'Migration must not overwrite later admin changes');
 console.log('13 sourced members, requested order, GitHub/portfolio links, single credit, and one-time data migration: passed');
 `,resolveDir:root,loader:'tsx'},bundle:true,platform:'node',outfile:file,jsx:'automatic',loader:{'.css':'empty'}});
 const r=spawnSync(process.execPath,[file],{timeout:8000,encoding:'utf8'});if(r.error||r.status!==0)throw new Error(r.error?.message||r.stderr);process.stdout.write(r.stdout);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
