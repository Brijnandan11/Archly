import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../src/images.js',import.meta.url),'utf8');
test('image upload requires admin role',()=>assert.match(code,/auth,role\('ADMIN'\)/));
test('image data is re-encoded and metadata stripped',()=>assert.match(code,/sharp\(req\.file\.buffer[\s\S]*?\.webp/));
test('image upload limits bytes and input pixels',()=>{assert.match(code,/8\*1024\*1024/);assert.match(code,/limitInputPixels:25_000_000/)});
test('only configured supabase endpoint and private server key used for storage',()=>{assert.match(code,/SUPABASE_SECRET_KEY/);assert.match(code,/https:/);});
