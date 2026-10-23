// Explainable routing hints, not a trained classifier or confidence estimate.
export function classifyDocument(text) {
 const rules={
  invoice:[[/^\s*(?:tax\s+)?invoice\s*$/im,6,'Invoice heading'],[/^\s*invoice\s*(?:number|no\.?|#)\s*:/im,5,'Invoice identifier label']],
  receipt:[[/^\s*(?:sales\s+)?receipt\s*$/im,6,'Receipt heading'],[/^\s*receipt\s*(?:number|no\.?)\s*:/im,5,'Receipt identifier label'],[/^\s*merchant\s*:/im,3,'Merchant label']],
  purchase_order:[[/^\s*purchase\s+order\s*$/im,6,'Purchase-order heading'],[/^\s*order\s*(?:number|no\.?)\s*:/im,4,'Order identifier label']],
  email:[[/^\s*from\s*:\s*[^\n]+@/im,4,'Email sender header'],[/^\s*subject\s*:/im,3,'Email subject header']]
 };
 const candidates=Object.entries(rules).map(([type,list])=>{const hits=list.filter(([regex])=>regex.test(text));return {type,score:hits.reduce((n,[,weight])=>n+weight,0),reasons:hits.map(([, ,reason])=>reason)};}).sort((a,b)=>b.score-a.score);
 const [first,second]=candidates;
 const type=first.score>=4&&first.score-second.score>=2?first.type:null;
 return {type,reasons:type?first.reasons:[],candidates:candidates.filter(c=>c.score),ambiguous:!type};
}
export function resolveDocumentType(text,requested) {
 if(requested!=='auto')return requested;
 const result=classifyDocument(text);
 if(!result.type)throw new Error('Document type is unclear. Select Invoice, Receipt, Purchase order or Business email manually.');
 return result.type;
}
