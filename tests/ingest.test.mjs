import test from 'node:test';
import assert from 'node:assert/strict';
import {readDocument} from '../lib/ingest.mjs';
test('text ingestion preserves the exact uploaded source',async()=>{
 const text='Merchant: Demo\nTotal: 118\n';
 const result=await readDocument(new File([text],'receipt.txt'));
 assert.equal(result.text,text);assert.equal(result.ingestion,'Text file');
});
test('unsupported files and oversize inputs return actionable errors',async()=>{
 await assert.rejects(readDocument(new File(['data'],'unsupported.zip')),/Use PDF/);
 await assert.rejects(readDocument(new File([new Uint8Array(3*1024*1024+1)],'huge.txt')),/smaller than 3 MB/);
});
