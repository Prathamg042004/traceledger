import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../app/api/extract/route.js';

test('live endpoint fails closed when it is not configured',async()=>{
  const previous=process.env.APP_ACCESS_CODE;
  delete process.env.APP_ACCESS_CODE;
  try {
    const response=await POST(new Request('http://localhost/api/extract',{method:'POST',body:'{}'}));
    assert.equal(response.status,503);
  }finally{if(previous!==undefined)process.env.APP_ACCESS_CODE=previous;}
});
test('live endpoint rejects wrong access codes before making model calls',async()=>{
  const previous=process.env.APP_ACCESS_CODE;process.env.APP_ACCESS_CODE='test-only-access-code';
  try {
    const response=await POST(new Request('http://localhost/api/extract',{method:'POST',headers:{'x-access-code':'wrong'},body:'{}'}));
    assert.equal(response.status,401);
  }finally{if(previous===undefined)delete process.env.APP_ACCESS_CODE;else process.env.APP_ACCESS_CODE=previous;}
});
test('live endpoint rejects invalid schemas without contacting the provider',async()=>{
  const previous=process.env.APP_ACCESS_CODE;process.env.APP_ACCESS_CODE='test-only-access-code';
  try {
    const response=await POST(new Request('http://localhost/api/extract',{method:'POST',headers:{'x-access-code':'test-only-access-code'},body:JSON.stringify({text:'A business document',schema:[['invalid key','Label','text',true]]})}));
    assert.equal(response.status,400);
  }finally{if(previous===undefined)delete process.env.APP_ACCESS_CODE;else process.env.APP_ACCESS_CODE=previous;}
});
test('live endpoint rejects oversized payloads',async()=>{
  const previous=process.env.APP_ACCESS_CODE;process.env.APP_ACCESS_CODE='test-only-access-code';
  try {
    const response=await POST(new Request('http://localhost/api/extract',{method:'POST',headers:{'x-access-code':'test-only-access-code','content-length':'100001'},body:'{}'}));
    assert.equal(response.status,413);
  }finally{if(previous===undefined)delete process.env.APP_ACCESS_CODE;else process.env.APP_ACCESS_CODE=previous;}
});
