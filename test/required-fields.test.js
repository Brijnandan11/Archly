import test from 'node:test';
import assert from 'node:assert/strict';
import {loginPassword,newPassword,profileName} from '../src/input-validation.js';
import {participantUpdate,settingsSchema} from '../src/feature-schemas.js';
test('required credentials reject empty and whitespace-only values without trimming real passwords',()=>{
 for(const input of ['', ' ', '\t\n', '          ']){assert.equal(loginPassword.safeParse(input).success,false);assert.equal(newPassword.safeParse(input).success,false)}
 const password='  Valid secret phrase  ';assert.equal(newPassword.parse(password),password);assert.equal(loginPassword.parse('x'),'x');
});
test('required profile names cannot be cleared while optional profile fields remain optional',()=>{
 for(const name of ['', '   ', '\t']){assert.equal(profileName.safeParse(name).success,false);assert.equal(participantUpdate.safeParse({full_name:name}).success,false)}
 assert.equal(profileName.parse('  Ranjana  '),'Ranjana');
 assert.equal(participantUpdate.safeParse({phone:'',department:'',college:'',academic_year:null}).success,true);
 assert.equal(settingsSchema.safeParse({clubName:'   '}).success,false);
 assert.equal(settingsSchema.safeParse({clubName:'Coding Club',email:'',phone:'',address:''}).success,true);
});

test('optional event lists may be omitted but added rows cannot be blank',async()=>{
 const {eventExtras}=await import('../src/feature-schemas.js');
 for(const field of ['rules','objectives','guidelines','highlights','photos']){
  assert.equal(eventExtras[field].safeParse(undefined).success,true);
  assert.equal(eventExtras[field].safeParse([]).success,true);
  assert.equal(eventExtras[field].safeParse(['   ']).success,false);
 }
});
