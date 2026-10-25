import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceInsights,restoreWorkspace} from '../lib/insights.mjs';
const make=(id,currency='INR',type='invoice')=>({id,name:id,type,text:'Vendor: Acme',fields:Object.entries({vendor:'Acme',document_id:'INV-1',currency,total:'100'}).map(([key,value])=>({key,label:key,type:'text',required:false,value,evidence:'Vendor: Acme',reviewed:true})),items:[],audit:[],status:'approved'});
test('exposure keeps currencies separate and excludes purchase orders',()=>{const r=workspaceInsights([make('a'),make('b','USD'),make('c','INR','purchase_order')]);assert.equal(r.totals.length,2);assert.equal(r.totals[0].amount,100);assert.equal(r.duplicates.length,1);});
test('missing totals do not create zero-valued exposure',()=>{const d=make('a');d.fields=d.fields.filter(f=>f.key!=='total');assert.equal(workspaceInsights([d]).totals.length,0);});
test('backup imports reset approvals and field review',()=>{const docs=restoreWorkspace(JSON.stringify({format:'traceledger-workspace',version:1,documents:[make('a')]}));assert.equal(docs[0].status,'review');assert.ok(docs[0].fields.every(f=>!f.reviewed));assert.equal(docs[0].audit.length,1);});
test('malformed and duplicate-identity backups are rejected',()=>{assert.throws(()=>restoreWorkspace('{}'));assert.throws(()=>restoreWorkspace(JSON.stringify({format:'traceledger-workspace',version:1,documents:[make('a'),make('a')]})));});

test('backup rejects duplicate field keys and malformed field identifiers',()=>{
 const doc={id:'d',name:'d',type:'invoice',text:'Vendor: Shop',fields:[{key:'vendor',label:'Vendor',type:'text',required:true,value:'Shop',evidence:'Vendor: Shop',reviewed:false}],items:[],audit:[],status:'review'};
 const wrap=d=>JSON.stringify({format:'traceledger-workspace',version:1,documents:[d]});
 assert.throws(()=>restoreWorkspace(wrap({...doc,fields:[...doc.fields,...doc.fields]})),/duplicate field/);
 assert.throws(()=>restoreWorkspace(wrap({...doc,fields:[{...doc.fields[0],key:'invalid key'}]})),/Invalid/);
});
test('validated local session restore preserves reviews but rejects malformed documents',()=>{
 const doc={id:'d',name:'d',type:'receipt',text:'Total: 10',fields:[{key:'total',label:'Total',type:'number',required:true,value:'10',evidence:'Total: 10',reviewed:true}],items:[],audit:[],status:'approved'};
 const wrap=documents=>JSON.stringify({format:'traceledger-workspace',version:1,documents});
 assert.equal(restoreWorkspace(wrap([doc]),{resetReviews:false})[0].status,'approved');
 assert.throws(()=>restoreWorkspace(wrap([{text:'broken',fields:[],audit:[]}]),{resetReviews:false}),/Invalid/);
});
