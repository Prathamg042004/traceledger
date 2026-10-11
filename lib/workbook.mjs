import ExcelJS from 'exceljs';
import { validateFields } from './engine.mjs';
import { itemIssues } from './items.mjs';

export async function createWorkbook(doc) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator='TraceLedger';
  const meta=workbook.addWorksheet('Document');
  meta.addRows([['Property','Value'],['Document',doc.name],['Type',doc.type],['Review status',doc.status],['Engine',doc.engine],['Model',doc.model || ''],['Extracted at',doc.extractedAt || ''],['Ingestion',doc.ingestion || 'text'],['Notice','Source quotes verify text presence, not correctness. Calculated amounts are derived, not extracted.']]);
  const fields=workbook.addWorksheet('Fields');
  fields.addRow(['Field','Value','Type','Original value','Source evidence','Reviewed']);
  for(const f of doc.fields) fields.addRow([f.label,f.type==='number' && f.value.trim() && Number.isFinite(Number(f.value))?Number(f.value):f.value,f.type,f.originalValue ?? '',f.evidence,!!f.reviewed]);
  const items=workbook.addWorksheet('Line items');
  items.addRow(['Description','Quantity','Unit price','Stated amount','Calculated amount','Source evidence','Reviewed']);
  const number=v=>String(v ?? '').trim() && Number.isFinite(Number(v))?Number(v):String(v ?? '');
  for(const item of doc.items || []) items.addRow([item.description,number(item.quantity),number(item.unit_price),number(item.amount),String(item.quantity).trim() && String(item.unit_price).trim() && Number.isFinite(Number(item.quantity)*Number(item.unit_price))?Number(item.quantity)*Number(item.unit_price):'',item.evidence,!!item.reviewed]);
  const validation=workbook.addWorksheet('Validation');
  validation.addRow(['Severity','Field','Message']);
  for(const issue of [...validateFields(doc.fields,doc.text),...itemIssues(doc.items||[],doc.fields,doc.text)]) validation.addRow([issue.severity,issue.field,issue.message]);
  const history=workbook.addWorksheet('Review history');history.addRow(['Time','Action']);
  for(const event of doc.audit||[])history.addRow([event.time,event.action]);
  const source=workbook.addWorksheet('Source text');source.addRow(['Line','Text']);
  doc.text.split(/\r?\n/).forEach((line,i)=>source.addRow([i+1,line]));
  for(const sheet of workbook.worksheets){
    sheet.views=[{state:'frozen',ySplit:1}];
    sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};
    sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF185C47'}};
    sheet.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,sheet.rowCount),column:sheet.columnCount}};
    sheet.columns.forEach((c,index)=>{c.width=index===0?28:38;});
    sheet.eachRow(row=>{row.alignment={vertical:'top',wrapText:true};});
  }
  return workbook.xlsx.writeBuffer();
}
