import { z } from 'zod';
import { validateFields, verifyEvidence, TEMPLATES } from './engine.mjs';
import { itemIssues } from './items.mjs';

export function workspaceInsights(docs) {
  const totals = new Map(), identities = new Map();
  let populated = 0, supported = 0;
  const queue = docs.map(doc => {
    const values = Object.fromEntries(doc.fields.map(f => [f.key, f.value]));
    const issues = [...validateFields(doc.fields, doc.text), ...itemIssues(doc.items || [], doc.fields, doc.text)];
    for (const f of doc.fields) if (f.value.trim()) { populated++; if (verifyEvidence(doc.text, f.evidence)) supported++; }
    if (doc.type === 'invoice' && values.vendor?.trim() && values.document_id?.trim()) {
      const key = JSON.stringify([values.vendor.trim().toLowerCase(), values.document_id.trim().toLowerCase()]);
      identities.set(key, [...(identities.get(key) || []), doc]);
    }
    // Purchase orders and receipts are excluded to avoid counting the same transaction twice.
    if (doc.type === 'invoice' && values.currency?.trim() && values.total?.trim() && Number.isFinite(Number(values.total)) && Number(values.total) >= 0) {
      const currency = values.currency.trim().toUpperCase();
      const total = totals.get(currency) || { currency, amount: 0, approved: 0, count: 0 };
      total.amount += Number(values.total); total.count++;
      if (doc.status === 'approved') total.approved += Number(values.total);
      totals.set(currency, total);
    }
    const errors = issues.filter(i => i.severity === 'error').length;
    const pending = doc.fields.filter(f => !f.reviewed).length + (doc.items || []).filter(i => !i.reviewed).length;
    return { id: doc.id, name: doc.name, type: doc.type, status: doc.status, issues, errors, pending,
      reason: !doc.fields.length ? 'Awaiting extraction' : errors ? `${errors} validation errors` : pending ? `${pending} checks awaiting review` : doc.status === 'approved' ? 'Approved' : 'Ready for approval' };
  }).sort((a,b) => b.errors-a.errors || b.pending-a.pending);
  return { totals: [...totals.values()], queue, populated, supported,
    duplicates: [...identities.values()].filter(group => group.length > 1).map(group => ({ names: group.map(d => d.name), ids: group.map(d => d.id) })),
    errorDocuments: queue.filter(q => q.errors).length };
}

const field = z.object({ key:z.string().min(1).max(40), label:z.string().max(80), type:z.enum(['text','number','date','email']), required:z.boolean(), value:z.string().max(40000), evidence:z.string().max(40000), reviewed:z.boolean(), originalValue:z.string().optional() });
const item = z.object({ description:z.string(), quantity:z.string(), unit_price:z.string(), amount:z.string(), evidence:z.string(), reviewed:z.boolean() });
const document = z.object({ id:z.string().min(1).max(100), name:z.string().min(1).max(200), type:z.enum(Object.keys(TEMPLATES)), text:z.string().max(40000), fields:z.array(field).max(20), items:z.array(item).max(100).default([]), audit:z.array(z.object({time:z.string().datetime(),action:z.string().max(2000)})).max(10000), status:z.enum(['unprocessed','review','approved']), engine:z.enum(['ai','baseline']).optional(), model:z.string().optional(), duration:z.number().nonnegative().optional(), extractedAt:z.string().optional(), ingestion:z.string().optional() });
export function restoreWorkspace(raw) {
  if (raw.length > 5000000) throw new Error('Backup exceeds the 5 MB limit.');
  const parsed = z.object({format:z.literal('traceledger-workspace'),version:z.literal(1),documents:z.array(document).min(1).max(100)}).safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error('Invalid TraceLedger backup. Choose a workspace backup exported by this app.');
  if (new Set(parsed.data.documents.map(d=>d.id)).size !== parsed.data.documents.length) throw new Error('Backup contains duplicate document identifiers.');
  // Imported approvals are untrusted claims; require a fresh review on this device.
  return parsed.data.documents.map(d => ({...d,status:d.fields.length?'review':'unprocessed',fields:d.fields.map(f=>({...f,reviewed:false})),items:d.items.map(i=>({...i,reviewed:false})),audit:[...d.audit,{time:new Date().toISOString(),action:'Imported backup; prior approvals cleared for fresh review'}]}));
}
