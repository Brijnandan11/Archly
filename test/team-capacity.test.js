import test from 'node:test';
import assert from 'node:assert/strict';
import {memberCapacity,remainingSlots} from '../src/team-capacity.js';
test('a three-person team reserves one place for its leader',()=>{
 assert.equal(memberCapacity(3),2);
 assert.equal(remainingSlots(3,0),2);
 assert.equal(remainingSlots(3,1),1);
 assert.equal(remainingSlots(3,2),0);
 assert.equal(remainingSlots(3,3),0);
 assert.equal(memberCapacity(1),0);
});
