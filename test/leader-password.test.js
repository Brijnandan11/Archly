import test from 'node:test';
import assert from 'node:assert/strict';
import {generateLeaderPassword} from '../src/leader-password.js';

test('generated leader credentials are unique, varied and contain mixed characters',()=>{
 const passwords=Array.from({length:256},()=>generateLeaderPassword());
 assert.equal(new Set(passwords).size,passwords.length);
 for(const password of passwords){
  assert.ok(password.length>=28&&password.length<=128);
  assert.match(password,/[A-Z]/);assert.match(password,/[a-z]/);
  assert.match(password,/\d/);assert.match(password,/[!@#+]/);
  assert.doesNotMatch(password,/\s/);
 }
 const patterns=new Set(passwords.map(password=>password.replace(/[a-zA-Z0-9_-]+/g,'x')));
 assert.ok(patterns.size>1);
});
