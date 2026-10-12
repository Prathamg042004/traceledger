import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {baselineItems,itemIssues} from '../lib/items.mjs';
import {createWorkbook} from '../lib/workbook.mjs';
import {baselineExtract,validateFields,csvExport,TEMPLATES,SAMPLES} from '../lib/engine.mjs';

test('whitespace-only required fields cannot pass review validation',()=>{
 for(const type of ['text','number'])assert.ok(validateFields([{key:'x',label:'X',type,required:true,value:'   ',reviewed:true}],'').some(i=>i.severity==='error'));
});
test('line extraction preserves stated amounts and leaves unstated amounts blank',()=>{
 const items=baselineItems('Desk | 2 | 100 | 250\nChair: 3 units at INR 50');
 assert.equal(items.length,2);assert.equal(items[0].amount,'250');assert.equal(items[1].amount,'');
 assert.ok(itemIssues(items,[],'').some(i=>i.severity==='error'));
});
test('sample item arithmetic matches subtotal, while invoice total remains incorrect',()=>{
 const sample=SAMPLES[0];const fields=baselineExtract(sample.text,TEMPLATES.invoice);const items=baselineItems(sample.text);
 assert.equal(items.length,2);assert.equal(itemIssues(items,fields,sample.text).filter(i=>i.severity==='error').length,0);
 assert.ok(validateFields(fields,sample.text).some(i=>i.field==='total'));
});
test('receipt schema supports merchant labels',()=>{
 const fields=baselineExtract('Receipt number: R-10\nMerchant: Cedar Store\nDate: 2026-10-01\nCurrency: INR\nTotal: 50',TEMPLATES.receipt);
 assert.equal(fields.find(f=>f.key==='vendor').value,'Cedar Store');assert.equal(validateFields(fields,'').filter(i=>i.severity==='error').length,0);
});
test('CSV carries review status',()=>assert.ok(csvExport([{key:'total',value:'10',evidence:'Total: 10',reviewed:true}],'approved').includes('"approved"')));
test('Excel roundtrip preserves typed numbers, source, status, items and literal formula-like text',async()=>{
 const doc={name:'Synthetic receipt',type:'receipt',status:'review',engine:'baseline',text:'Total: 120',fields:[{key:'total',label:'Total',type:'number',value:'120',evidence:'Total: 120',reviewed:false},{key:'vendor',label:'Vendor',type:'text',value:'=HYPERLINK("bad")',evidence:'',reviewed:false}],items:[{description:'Pens',quantity:'2',unit_price:'60',amount:'120',evidence:'',reviewed:false}],audit:[]};
 const bytes=await createWorkbook(doc);const wb=new ExcelJS.Workbook();await wb.xlsx.load(bytes);
 assert.equal(wb.worksheets.length,6);assert.equal(wb.getWorksheet('Fields').getCell('B2').value,120);
 assert.equal(wb.getWorksheet('Fields').getCell('B3').value,'=HYPERLINK("bad")');
 assert.equal(wb.getWorksheet('Line items').getCell('E2').value,120);
 assert.equal(wb.getWorksheet('Document').getCell('B4').value,'review');
 assert.equal(wb.getWorksheet('Source text').getCell('B2').value,'Total: 120');
});
