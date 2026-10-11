export const TEMPLATES = {
  invoice: [
    ['document_id', 'Invoice number', 'text', true],
    ['vendor', 'Vendor', 'text', true],
    ['purchase_order', 'Purchase order', 'text', false],
    ['date', 'Issue date', 'date', true],
    ['due_date', 'Due date', 'date', false],
    ['currency', 'Currency', 'text', true],
    ['subtotal', 'Subtotal', 'number', true],
    ['tax', 'Tax', 'number', true],
    ['total', 'Total', 'number', true],
    ['email', 'Contact email', 'email', false]
  ],
  purchase_order: [
    ['document_id', 'Order number', 'text', true],
    ['vendor', 'Vendor', 'text', true],
    ['date', 'Issue date', 'date', true],
    ['currency', 'Currency', 'text', true],
    ['subtotal', 'Subtotal', 'number', true],
    ['tax', 'Tax', 'number', true],
    ['total', 'Total', 'number', true],
    ['email', 'Contact email', 'email', false]
  ],
  email: [
    ['vendor', 'Company', 'text', true],
    ['email', 'Contact email', 'email', true],
    ['purchase_order', 'Order reference', 'text', false],
    ['date', 'Date', 'date', false],
    ['currency', 'Currency', 'text', false],
    ['total', 'Amount', 'number', false],
    ['due_date', 'Requested deadline', 'date', false]
  ]
};
TEMPLATES.receipt = [['document_id','Receipt number','text',false],['vendor','Merchant','text',true],['date','Date','date',true],['currency','Currency','text',true],['subtotal','Subtotal','number',false],['tax','Tax','number',false],['total','Total','number',true]];
export const SAMPLES = [
  { id: 'sample-invoice', name: 'Northstar · invoice.txt', type: 'invoice', text: `NORTHSTAR OFFICE SYSTEMS\nTAX INVOICE\nInvoice number: INV-2026-0842\nVendor: Northstar Office Systems\nPurchase order: PO-2026-0198\nIssue date: 2026-10-08\nDue date: 2026-11-07\nCurrency: INR\n\nDescription                         Qty     Unit price\nErgonomic task chair                 12      4,500.00\nMonitor arm                           8      2,250.00\n\nSubtotal: 72,000.00\nTax: 12,960.00\nTotal: 86,960.00\n\nContact: accounts@northstar.example\nPayment terms: Net 30\nThank you for your business.\n\nSYNTHETIC DEMO DOCUMENT — not a real invoice.` },
  { id: 'sample-po', name: 'Northstar · purchase order.txt', type: 'purchase_order', text: `PURCHASE ORDER\nOrder number: PO-2026-0198\nVendor: Northstar Office Systems\nIssue date: 2026-10-02\nCurrency: INR\n\nErgonomic task chair: 12 units at INR 4,500.00\nMonitor arm: 8 units at INR 2,250.00\nSubtotal: 72,000.00\nTax: 12,960.00\nTotal: 84,960.00\nContact: accounts@northstar.example\n\nApproved by: Procurement desk\nSYNTHETIC DEMO DOCUMENT — not a real purchase order.` },
  { id: 'sample-email', name: 'Northstar · supplier email.txt', type: 'email', text: `From: accounts@northstar.example\nDate: 2026-10-09\nSubject: Payment clarification for PO-2026-0198\n\nHello procurement team,\nCompany: Northstar Office Systems\nWe noticed a discrepancy on the invoice sent yesterday.\nOrder reference: PO-2026-0198\nCurrency: INR\nAmount: 84,960.00\nRequested deadline: 2026-11-07\nPlease use the purchase order total while we issue a corrected invoice.\n\nRegards,\nNorthstar accounts team\nSYNTHETIC DEMO EMAIL.` }
];
const labels = {
  document_id: ['invoice number', 'invoice no', 'invoice #', 'receipt number', 'receipt no', 'order number', 'order no'],
  vendor: ['vendor', 'supplier', 'company', 'merchant'], purchase_order: ['purchase order', 'order reference', 'po number', 'po'],
  date: ['issue date', 'invoice date', 'date'], due_date: ['due date', 'requested deadline', 'deadline'],
  currency: ['currency'], subtotal: ['subtotal', 'sub total'], tax: ['tax', 'gst', 'vat'], total: ['grand total', 'total', 'amount'], email: ['contact', 'email', 'from']
};
export function normalize(value, type) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (type === 'number') {
    const clean = text.replace(/(?:INR|USD|EUR|GBP|Rs\.?|₹|\$|€|£|,)/gi, '').trim();
    return /^-?\d+(\.\d+)?$/.test(clean) ? String(Number(clean)) : text;
  }
  return text;
}
export function baselineExtract(text, schema) {
  const lines = text.split(/\r?\n/);
  return schema.map(([key, label, type, required]) => {
    let evidence = '', value = '';
    for (const line of lines) {
      const alternatives = labels[key] || [label.toLowerCase(), key.replaceAll('_', ' ')];
      const colon = line.indexOf(':');
      if (colon >= 0 && alternatives.includes(line.slice(0, colon).trim().toLowerCase())) {
        evidence = line.trim(); value = line.slice(colon + 1).trim(); break;
      }
    }
    if (key === 'email') {
      const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      if (match) { value = match[0]; evidence = lines.find(line => line.includes(value)).trim(); }
    }
    return { key, label, type, required, value: normalize(value, type), evidence, reviewed: false };
  });
}
export function verifyEvidence(text, evidence) {
  return !!evidence?.trim() && text.includes(evidence.trim());
}
export function validateFields(fields, text) {
  const issues = [];
  for (const original of fields) {
    const f = {...original,value:String(original.value ?? '').trim()};
    if (!f.value && f.required) issues.push({ field: f.key, severity: 'error', message: `${f.label} is required but missing.` });
    if (!f.value) continue;
    if (!verifyEvidence(text, f.evidence) && !f.reviewed) issues.push({ field: f.key, severity: 'warning', message: `${f.label} has no exact source evidence. Review it manually.` });
    if (f.type === 'number' && (!Number.isFinite(Number(f.value)) || Number(f.value) < 0)) issues.push({ field: f.key, severity: 'error', message: `${f.label} must be a non-negative number.` });
    if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value)) issues.push({ field: f.key, severity: 'error', message: `${f.label} is not a valid email address.` });
    if (f.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(f.value) || !Number.isFinite(Date.parse(f.value)) || new Date(f.value).toISOString().slice(0,10) !== f.value)) issues.push({ field: f.key, severity: 'error', message: `${f.label} must be a valid date in YYYY-MM-DD format.` });
  }
  const vals = Object.fromEntries(fields.map(f => [f.key, f.value]));
  if (['subtotal', 'tax', 'total'].every(k => vals[k] !== '' && vals[k] != null && Number.isFinite(Number(vals[k])))) {
    const expected = Math.round((Number(vals.subtotal) + Number(vals.tax)) * 100) / 100;
    if (Math.abs(expected - Number(vals.total)) > .01) issues.push({ field: 'total', severity: 'error', message: `Total mismatch: subtotal + tax = ${expected.toFixed(2)}, but the document states ${Number(vals.total).toFixed(2)}.` });
  }
  if (vals.date && vals.due_date && /^\d{4}-\d{2}-\d{2}$/.test(vals.date) && /^\d{4}-\d{2}-\d{2}$/.test(vals.due_date) && vals.due_date < vals.date) issues.push({ field: 'due_date', severity: 'error', message: 'Due date is earlier than the issue date.' });
  return issues;
}
export function reconcile(documents) {
  const results = [];
  const value = (doc, key) => doc.fields?.find(f => f.key === key)?.value;
  for (const invoice of documents.filter(d => d.type === 'invoice' && d.fields?.length)) {
    const ref = value(invoice, 'purchase_order');
    if (!ref) continue;
    const po = documents.find(d => d.type === 'purchase_order' && value(d, 'document_id') === ref);
    if (!po) { results.push({ id: invoice.id, status: 'waiting', message: `${ref}: extract the matching purchase order to compare.`, documents: [invoice.name] }); continue; }
    for (const key of ['vendor', 'currency', 'total']) {
      const a = value(invoice, key), b = value(po, key);
      const equal = a && b && (key === 'total' ? Math.abs(Number(a) - Number(b)) <= .01 : a.toLowerCase().trim() === b.toLowerCase().trim());
      results.push({ id: `${invoice.id}-${key}`, status: !a || !b ? 'waiting' : equal ? 'pass' : 'conflict', message: `${ref} · ${key}: ${a || 'missing'} ${equal ? '=' : '≠'} ${b || 'missing'}`, documents: [invoice.name, po.name] });
    }
  }
  return results;
}
export function csvExport(fields, status='review') {
  const safe = v => { let s = String(v ?? ''); if (/^[=+@\-\t\r]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; };
  return ['field,value,evidence,reviewed,document_status', ...fields.map(f => [f.key, f.value, f.evidence, f.reviewed,status].map(safe).join(','))].join('\r\n');
}
export function scoreFields(expected, actual) {
  let correct = 0, populated = 0, supported = 0;
  for (const [key, value] of Object.entries(expected)) {
    const field = actual.find(f => f.key === key);
    if (String(field?.value ?? '').trim().toLowerCase() === String(value).trim().toLowerCase()) correct++;
    if (field?.value) populated++;
    if (field?.value && field.evidence) supported++;
  }
  return { correct, total: Object.keys(expected).length, populated, supported, accuracy: correct / Object.keys(expected).length };
}
