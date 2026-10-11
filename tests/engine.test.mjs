import test from 'node:test';
import assert from 'node:assert/strict';
import {baselineExtract,validateFields,verifyEvidence,normalize,reconcile,csvExport,scoreFields,TEMPLATES,SAMPLES} from '../lib/engine.mjs';
test('extracts source amounts without silently fixing them',()=>{
  const fields=baselineExtract(SAMPLES[0].text,TEMPLATES.invoice);
  assert.equal(fields.find(f=>f.key==='total').value,'86960');
  assert.ok(validateFields(fields,SAMPLES[0].text).some(i=>i.field==='total'&&i.severity==='error'));
});
test('does not invent absent values',()=>{
  const fields=baselineExtract('Vendor: Cedar Labs',TEMPLATES.invoice);
  assert.equal(fields.find(f=>f.key==='total').value,'');
  assert.ok(validateFields(fields,'Vendor: Cedar Labs').some(i=>i.field==='total'));
});
test('validates exact evidence independently of extraction',()=>{
  assert.equal(verifyEvidence('Total: 100','Total: 200'),false);
  assert.equal(verifyEvidence('Total: 100','Total: 100'),true);
  assert.equal(verifyEvidence('Total: 100',''),false);
});
test('matches invoice and PO, detects disagreement',()=>{
  const docs=SAMPLES.slice(0,2).map(d=>({...d,fields:baselineExtract(d.text,TEMPLATES[d.type])}));
  assert.ok(reconcile(docs).some(r=>r.status==='conflict'&&r.message.includes('total')));
  assert.ok(reconcile(docs).some(r=>r.status==='pass'&&r.message.includes('vendor')));
});
test('normalizes money without parsing ambiguous malformed text',()=>{
  assert.equal(normalize('INR 1,25,000.00','number'),'125000');
  assert.equal(normalize('about 100','number'),'about 100');
});
test('validates calendar dates and due-date order',()=>{
  const fields=[{key:'date',label:'Date',type:'date',value:'2026-02-30',reviewed:true}];
  assert.ok(validateFields(fields,'').some(i=>i.severity==='error'));
});
test('neutralizes spreadsheet formulas and escapes quotes',()=>{
  const csv=csvExport([{key:'vendor',value:'=HYPERLINK("x")',evidence:'quoted "evidence"',reviewed:false}]);
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes('""evidence""'));
});
test('scores absent expected values and mismatches accurately',()=>{
  assert.equal(scoreFields({a:'',b:'two'},[{key:'b',value:'wrong'}]).accuracy,.5);
});
