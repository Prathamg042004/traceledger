import {validateFields,verifyEvidence} from './engine.mjs';
import {itemIssues} from './items.mjs';

// Explainable checklist metrics. None is a model confidence or accuracy score.
export function documentQuality(doc) {
 const fields=doc.fields||[], items=doc.items||[];
 const required=fields.filter(f=>f.required);
 const populated=fields.filter(f=>String(f.value??'').trim());
 const issues=[...validateFields(fields,doc.text),...itemIssues(items,fields,doc.text)];
 const errors=issues.filter(i=>i.severity==='error');
 const pending=fields.filter(f=>!f.reviewed).length+items.filter(i=>!i.reviewed).length;
 const percent=(n,d)=>d?Math.round(n/d*100):null;
 return {id:doc.id,name:doc.name,type:doc.type,status:!fields.length?'unprocessed':errors.length?'blocked':pending?'review':doc.status==='approved'?'approved':'ready',
 completeness:percent(required.filter(f=>String(f.value??'').trim()).length,required.length),
 provenance:percent(populated.filter(f=>verifyEvidence(doc.text,f.evidence)).length,populated.length),
 review:percent(fields.filter(f=>f.reviewed).length+items.filter(i=>i.reviewed).length,fields.length+items.length),
 pending,errors:errors.length,issues};
}
