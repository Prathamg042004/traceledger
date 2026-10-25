const value=(doc,key)=>String(doc.fields?.find(f=>f.key===key)?.value??'').trim();
const identity=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
const amount=s=>/^\d+(?:\.\d+)?$/.test(String(s).trim())&&Number.isFinite(Number(s))?Number(s):null;

export function matchLineItems(documents) {
 const results=[];
 for(const invoice of documents.filter(d=>d.type==='invoice'&&d.fields?.length)) {
  const ref=value(invoice,'purchase_order');if(!ref)continue;
  const matches=documents.filter(d=>d.type==='purchase_order'&&d.fields?.length&&identity(value(d,'document_id'))===identity(ref));
  const result={id:invoice.id,invoice:invoice.name,reference:ref,invoiceId:invoice.id,orderIds:matches.map(d=>d.id),rows:[]};
  if(matches.length!==1){results.push({...result,status:'waiting',message:matches.length?'Multiple purchase orders share this reference. Resolve the ambiguity before matching.':'Extract a matching purchase order to compare line items.'});continue;}
  const po=matches[0];result.order=po.name;
  if(!value(invoice,'vendor')||!value(po,'vendor')||identity(value(invoice,'vendor'))!==identity(value(po,'vendor'))||!value(invoice,'currency')||!value(po,'currency')||identity(value(invoice,'currency'))!==identity(value(po,'currency'))){results.push({...result,status:'waiting',message:'Vendor and currency must be present and match before item prices can be compared.'});continue;}
  if(!invoice.items?.length||!po.items?.length){results.push({...result,status:'waiting',message:'Extract line items from both documents. No item match is inferred from totals alone.'});continue;}
  const names=new Set([...invoice.items,...po.items].map(i=>identity(i.description)));
  for(const name of names){
   const left=invoice.items.filter(i=>identity(i.description)===name),right=po.items.filter(i=>identity(i.description)===name);
   const row={description:left[0]?.description||right[0]?.description||'(empty description)',invoiceQuantity:left[0]?.quantity??'',orderQuantity:right[0]?.quantity??'',invoicePrice:left[0]?.unit_price??'',orderPrice:right[0]?.unit_price??''};
   if(!name||left.length>1||right.length>1){result.rows.push({...row,status:'waiting',message:'Repeated or empty descriptions need manual matching.'});continue;}
   if(!left.length||!right.length){result.rows.push({...row,status:'conflict',message:!left.length?'Order item missing from invoice.':'Invoice item not found on purchase order.'});continue;}
   const quantities=[amount(row.invoiceQuantity),amount(row.orderQuantity)],prices=[amount(row.invoicePrice),amount(row.orderPrice)];
   if([...quantities,...prices].some(v=>v===null)){result.rows.push({...row,status:'waiting',message:'Quantity or unit price missing/invalid. Review the source.'});continue;}
   const sameQuantity=Math.abs(quantities[0]-quantities[1])<0.000001,samePrice=Math.abs(prices[0]-prices[1])<=0.010000001;
   result.rows.push({...row,status:sameQuantity&&samePrice?'pass':'conflict',message:[!sameQuantity&&'Quantity differs',!samePrice&&'Unit price differs'].filter(Boolean).join(' · ')||'Quantity and unit price match.'});
  }
  result.status=result.rows.some(r=>r.status==='conflict')?'conflict':result.rows.some(r=>r.status==='waiting')?'waiting':'pass';
  result.message='Exact description matching after case/whitespace normalization; unit-price tolerance 0.01. No fuzzy or currency-conversion guesses.';
  results.push(result);
 }
 return results;
}
