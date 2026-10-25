import test from 'node:test';
import assert from 'node:assert/strict';
import { readJsonBody } from '../lib/request.mjs';
test('body limits count UTF-8 bytes without trusting Content-Length',async()=>{
  const request=new Request('https://example.test',{method:'POST',body:JSON.stringify({text:'é'.repeat(20)})});
  await assert.rejects(readJsonBody(request,30),{status:413});
});
test('reader stops and cancels an oversized stream',async()=>{
  let reads=0,cancelled=false;
  const stream=new ReadableStream({pull(controller){reads++;controller.enqueue(new Uint8Array(20));},cancel(){cancelled=true;}});
  await assert.rejects(readJsonBody(new Request('https://example.test',{method:'POST',body:stream,duplex:'half'}),25),{status:413});
  assert.ok(reads<=3);assert.equal(cancelled,true);
});
test('invalid JSON and malformed UTF-8 return a client error',async()=>{
  for(const body of ['{bad',new Uint8Array([0xff])]) await assert.rejects(readJsonBody(new Request('https://example.test',{method:'POST',body})),{status:400});
  assert.deepEqual(await readJsonBody(new Request('https://example.test',{method:'POST',body:'{"valid":true}'})),{valid:true});
});
