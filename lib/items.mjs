import { normalize, verifyEvidence } from './engine.mjs';

export function baselineItems(text) {
  return text.split(/\r?\n/).flatMap(line => {
    // Only explicit table rows or quantity/unit-price statements; never guess prose.
    const match = line.trim().match(/^(.+?)\s*:\s*(\d+(?:\.\d+)?)\s+units?\s+at\s+(?:INR|USD|EUR|GBP)?\s*([\d,]+(?:\.\d{1,2})?)(?:\s*=\s*([\d,]+(?:\.\d{1,2})?))?$/i)
      || line.trim().match(/^(.+?)\s{2,}(\d+(?:\.\d+)?)\s{2,}([\d,]+(?:\.\d{1,2})?)(?:\s{2,}([\d,]+(?:\.\d{1,2})?))?$/)
      || line.trim().match(/^(.+?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*([\d,]+(?:\.\d{1,2})?)\s*\|\s*([\d,]+(?:\.\d{1,2})?)$/);
    if (!match) return [];
    return [{ description: match[1].trim(), quantity: normalize(match[2],'number'), unit_price: normalize(match[3],'number'), amount: match[4] ? normalize(match[4],'number') : '', evidence: line.trim(), reviewed: false }];
  }).slice(0,100);
}
export function itemIssues(items, fields, text) {
  const issues = [];
  items.forEach((item,index) => {
    const field = `item_${index}`;
    if (!item.description.trim()) issues.push({field,severity:'error',message:`Item ${index+1}: description is required.`});
    for (const key of ['quantity','unit_price','amount']) {
      const v = String(item[key] ?? '').trim();
      if (v && (!/^\d+(\.\d+)?$/.test(v) || !Number.isFinite(Number(v)))) issues.push({field,severity:'error',message:`Item ${index+1}: ${key} must be a non-negative decimal.`});
    }
    if (!String(item.quantity ?? '').trim() || !String(item.unit_price ?? '').trim()) issues.push({field,severity:'warning',message:`Item ${index+1}: quantity or unit price is missing; verify manually.`});
    if (!verifyEvidence(text,item.evidence) && !item.reviewed) issues.push({field,severity:'warning',message:`Item ${index+1}: no exact source quote.`});
    if (['quantity','unit_price','amount'].every(k=>String(item[k] ?? '').trim() && Number.isFinite(Number(item[k]))) && Math.abs(Number(item.quantity)*Number(item.unit_price)-Number(item.amount))>.011) issues.push({field,severity:'error',message:`Item ${index+1}: quantity × unit price differs from stated amount.`});
  });
  const subtotal = fields.find(f=>f.key==='subtotal')?.value;
  if(items.length && String(subtotal ?? '').trim() && Number.isFinite(Number(subtotal)) && items.every(i=>['quantity','unit_price'].every(k=>String(i[k] ?? '').trim() && Number.isFinite(Number(i[k]))))) {
    const sum=items.reduce((s,i)=>s+Number(i.quantity)*Number(i.unit_price),0);
    if(Math.abs(sum-Number(subtotal))>.011) issues.push({field:'items',severity:'error',message:`Calculated line-item sum ${sum.toFixed(2)} differs from subtotal ${subtotal}. Check discounts, omitted items or source errors.`});
  }
  return issues;
}
