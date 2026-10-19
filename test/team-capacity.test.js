import test from 'node:test';
import assert from 'node:assert/strict';
import {memberCapacity,remainingSlots} from '../src/team-capacity.js';
test('a ten-person team supports its leader and nine other students',()=>{
 assert.equal(memberCapacity(10),9);
 assert.equal(remainingSlots(10,0),9);
 assert.equal(remainingSlots(10,8),1);
 assert.equal(remainingSlots(10,9),0);
});
test('a three-person team reserves one place for its leader',()=>{
 assert.equal(memberCapacity(3),2);
 assert.equal(remainingSlots(3,0),2);
 assert.equal(remainingSlots(3,1),1);
 assert.equal(remainingSlots(3,2),0);
 assert.equal(remainingSlots(3,3),0);
 assert.equal(memberCapacity(1),0);
});
