import test from 'node:test';
import assert from 'node:assert/strict';
import {documentQuality} from '../lib/quality.mjs';
test('unprocessed documents have no fabricated quality percentages',()=>{const q=documentQuality({id:'1',text:'',fields:[]});assert.equal(q.status,'unprocessed');assert.equal(q.completeness,null);assert.equal(q.provenance,null);});
test('human review cannot override a required missing value',()=>{const q=documentQuality({id:'1',text:'',fields:[{key:'vendor',label:'Vendor',required:true,type:'text',value:'',reviewed:true}],status:'approved'});assert.equal(q.status,'blocked');assert.equal(q.completeness,0);assert.equal(q.review,100);});
test('source coverage counts populated fields independently from completeness',()=>{const q=documentQuality({id:'1',text:'Total: 10',fields:[{key:'total',label:'Total',required:true,type:'number',value:'10',evidence:'Total: 10',reviewed:false},{key:'vendor',label:'Vendor',required:false,type:'text',value:'Shop',evidence:'absent',reviewed:false}]});assert.equal(q.completeness,100);assert.equal(q.provenance,50);assert.equal(q.status,'review');});
