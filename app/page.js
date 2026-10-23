'use client';
import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, Braces, Check, CheckCheck, ChevronRight, CircleHelp, Clock3, FileCheck2, FilePlus2, FileText, FlaskConical, GitCompareArrows, History, Layers3, LayoutDashboard, Link2, LoaderCircle, Plus, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Upload, X, AlertTriangle, ScanLine, PanelLeftClose, Trash2 } from 'lucide-react';
import { TEMPLATES, SAMPLES, baselineExtract, validateFields, verifyEvidence, reconcile, csvExport, scoreFields } from '../lib/engine.mjs';
import { baselineItems, itemIssues } from '../lib/items.mjs';
import { readDocument } from '../lib/ingest.mjs';
import { BENCHMARK, runBaseline } from '../lib/benchmark.mjs';
import Overview from './overview';
import Quality from './quality';
import Project from './project';

const navigation = [['project','Project showcase',Layers3],['quality','Document quality',ShieldCheck],['overview','Intelligence overview',Activity],['workspace','Document workspace',LayoutDashboard],['reconcile','Cross-document checks',GitCompareArrows],['schemas','Extraction schemas',Braces],['evaluation','Evaluation lab',FlaskConical],['audit','Review history',History]];
const initialDocs = () => SAMPLES.map(d=>({...d, fields:[], audit:[], status:'unprocessed'}));
const typeLabel = type => ({invoice:'Invoice',purchase_order:'Purchase order',email:'Business email',receipt:'Receipt'}[type]||'Custom document');
const timeLabel = time => new Date(time).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
function download(name, content, type='application/json') {
  const url = URL.createObjectURL(new Blob([content],{type}));
  const a = document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Badge({children,tone=''}) { return <span className={`badge ${tone}`}>{children}</span>; }
function Empty({icon:Icon=ScanLine,title,children}) { return <div className="empty"><span className="empty-icon"><Icon size={26}/></span><h3>{title}</h3><p>{children}</p></div>; }

export default function Home() {
  const [docs,setDocs]=useState(initialDocs);
  const [active,setActive]=useState('sample-invoice');
  const [page,setPage]=useState('project');
  const [search,setSearch]=useState('');
  const [mode,setMode]=useState('baseline');
  const [busy,setBusy]=useState(false);
  const [ingestProgress,setIngestProgress]=useState('');
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [uploadOpen,setUploadOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [pasteText,setPasteText]=useState('');
  const [pasteName,setPasteName]=useState('Untitled document');
  const [newType,setNewType]=useState('invoice');
  const [selectedField,setSelectedField]=useState(null);
  const [resultTab,setResultTab]=useState('fields');
  const [accessCode,setAccessCode]=useState('');
  const [configured,setConfigured]=useState(false);
  const [model,setModel]=useState('');
  const [persist,setPersist]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [schemaType,setSchemaType]=useState('invoice');
  const [schemas,setSchemas]=useState(TEMPLATES);
  const [schemaText,setSchemaText]=useState(JSON.stringify(TEMPLATES.invoice,null,2));
  const [benchmark,setBenchmark]=useState(null);
  const [benchmarkBusy,setBenchmarkBusy]=useState(false);
  const [mobileNav,setMobileNav]=useState(false);
  const fileRef=useRef(null); const editBefore=useRef({});

  useEffect(()=>{
    try {
      const stored=localStorage.getItem('traceledger-v1');
      if(stored){ const saved=JSON.parse(stored); if(Array.isArray(saved.docs)&&saved.docs.length&&saved.docs.every(d=>typeof d.text==='string'&&Array.isArray(d.fields)&&Array.isArray(d.audit))){setDocs(saved.docs);setActive(saved.docs[0].id);setPersist(true);} }
    }catch { setNotice('Saved workspace could not be restored. A fresh sample pack is ready.'); }
    setLoaded(true);
    fetch('/api/extract').then(r=>r.json()).then(s=>{setConfigured(s.configured);setModel(s.model);}).catch(()=>{});
  },[]);
  useEffect(()=>{
    if(!loaded)return;
    try { if(persist)localStorage.setItem('traceledger-v1',JSON.stringify({docs}));else localStorage.removeItem('traceledger-v1'); }
    catch {setNotice('Browser storage is full. Export your results to keep a copy.');}
  },[docs,persist,loaded]);
  useEffect(()=>{ if(!notice)return;const t=setTimeout(()=>setNotice(''),5500);return()=>clearTimeout(t);},[notice]);

  const doc=docs.find(d=>d.id===active)||docs[0];
  const fields=doc?.fields||[];
  const items=doc?.items||[];
  const issues=doc?[...validateFields(fields,doc.text),...itemIssues(items,fields,doc.text)]:[];
  const completed=docs.filter(d=>d.fields.length).length;
  const reviewCount=docs.filter(d=>d.fields.length&&d.status!=='approved').length;
  const approved=docs.filter(d=>d.status==='approved').length;
  const coverage=fields.filter(f=>f.value&&verifyEvidence(doc.text,f.evidence)).length;
  const matches=reconcile(docs);
  const patchDoc=(id,fn)=>setDocs(previous=>previous.map(d=>d.id===id?fn(d):d));

  async function extract(document=doc) {
    if(!document||busy)return;
    setBusy(true);setError('');setSelectedField(null);
    const start=performance.now();
    try {
      let result;
      if(mode==='ai') {
        const response=await fetch('/api/extract',{method:'POST',headers:{'Content-Type':'application/json','x-access-code':accessCode},body:JSON.stringify({text:document.text,schema:schemas[document.type]||schemas.invoice})});
        result=await response.json();if(!response.ok)throw new Error(result.error||'Extraction failed.');
      } else {
        result={fields:baselineExtract(document.text,schemas[document.type]||schemas.invoice),items:baselineItems(document.text),engine:'baseline',model:'Deterministic label parser',duration:Math.round(performance.now()-start)};
      }
      const now=new Date().toISOString();
      patchDoc(document.id,d=>({...d,...result,status:'review',extractedAt:now,audit:[...d.audit,{time:now,action:`Extracted with ${result.engine==='ai'?result.model:'the offline baseline'}`}]}));
      setResultTab('fields');setNotice('Extraction complete. Review the evidence and validation results.');
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  function editField(key,value) {
    patchDoc(doc.id,d=>({...d,status:'review',fields:d.fields.map(f=>f.key===key?{...f,originalValue:f.originalValue??f.value,value,reviewed:false}:f)}));
  }
  function recordEdit(key, value) { const before=editBefore.current[key]; if(before !== undefined && before !== value) patchDoc(doc.id,d=>({...d,audit:[...d.audit,{time:new Date().toISOString(),action:`Changed ${key}: ${before || "(empty)"} → ${value || "(empty)"}`,field:key,before,after:value}]})); }
  function reviewField(key) {
    const field=fields.find(f=>f.key===key);
    patchDoc(doc.id,d=>({...d,status:'review',fields:d.fields.map(f=>f.key===key?{...f,reviewed:true}:f),audit:[...d.audit,{time:new Date().toISOString(),action:`Reviewed ${field.label}: ${field.value||'(empty)'}`,field:key}]}));
  }
  function approve() {
    if(issues.some(i=>i.severity==='error')){setError('Resolve validation errors before approving this document.');return;}
    if(fields.some(f=>!f.reviewed)||items.some(i=>!i.reviewed)){setError('Review each field and item before approving, including optional empty fields.');return;}
    patchDoc(doc.id,d=>({...d,status:'approved',audit:[...d.audit,{time:new Date().toISOString(),action:'Document approved after field review and validation'}]}));
    setError('');setNotice('Document approved. You can now export the reviewed data.');
  }
  async function exportDoc(format) {
    try {
    if(!fields.length)return;
    const filename=doc.name.replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]/gi,'-');
    if(format==='xlsx'){const {createWorkbook}=await import('../lib/workbook.mjs');download(`${filename}.xlsx`,await createWorkbook(doc),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');}
    else if(format==='csv')download(`${filename}.csv`,csvExport(fields,doc.status),'text/csv;charset=utf-8');
    else download(`${filename}.json`,JSON.stringify({document:doc.name,type:doc.type,status:doc.status,engine:doc.engine,model:doc.model,extractedAt:doc.extractedAt,data:Object.fromEntries(fields.map(f=>[f.key,f.value])),fields,items,ingestion:doc.ingestion,validation:issues,audit:doc.audit},null,2));
    setNotice(`${format.toUpperCase()} export downloaded with ${doc.status==='approved'?'approved':'draft'} status.`);
    }catch(e){setError('Export failed: '+e.message);}
  }
  function addDoc(text,name,type,ingestion="Pasted text") {
    if(!text.trim())throw new Error('Add some document text first.');
    if(text.length>40000)throw new Error('Keep document text under 40,000 characters.');
    const duplicate=docs.find(d=>d.text.trim()===text.trim());
    if(duplicate){setActive(duplicate.id);setUploadOpen(false);setNotice('This document is already in your workspace.');return;}
    const next={id:crypto.randomUUID(),name:name.trim()||'Untitled document',type,text,ingestion,fields:[],items:[],audit:[{time:new Date().toISOString(),action:'Document added to workspace'}],status:'unprocessed'};
    setDocs(prev=>[next,...prev]);setActive(next.id);setUploadOpen(false);setPasteText('');setPage('workspace');setError('');
  }
  async function uploadFiles(fileList) {
    const files=Array.from(fileList||[]);if(!files.length)return;
    if(files.length>10){setError('Upload at most 10 documents per batch.');return;}
    if(docs.length+files.length>100){setError('Workspace limit is 100 documents.');return;}
    setError('');setBusy(true);
    const incoming=[],failures=[];
    try {
      for(const [index,file] of files.entries()) {
        try {
          const result=await readDocument(file,p=>setIngestProgress(`${index+1}/${files.length} · ${file.name}: ${p}`));
          if(!result.text.trim()||result.text.length>40000)throw new Error('Text must contain 1–40,000 characters.');
          if([...docs,...incoming].some(d=>d.text.trim()===result.text.trim())){failures.push(`${file.name}: already in workspace`);continue;}
          incoming.push({id:crypto.randomUUID(),name:file.name.slice(0,200),type:newType,...result,fields:[],items:[],audit:[{time:new Date().toISOString(),action:'Document added through batch upload'}],status:'unprocessed'});
        }catch(e){failures.push(`${file.name}: ${e.message}`);}
      }
      if(incoming.length){setDocs(prev=>[...incoming,...prev]);setActive(incoming[0].id);setPage('workspace');setUploadOpen(false);setNotice(`Added ${incoming.length} documents. Extract them from the overview or individually.`);}
      if(failures.length)setError(failures.join(' · '));
    }finally{setBusy(false);if(fileRef.current)fileRef.current.value='';}
  }

  function saveSchema() {
    try {
      const parsed=JSON.parse(schemaText);
      if(!Array.isArray(parsed)||!parsed.length||parsed.length>20||parsed.some(f=>!Array.isArray(f)||f.length!==4||!(/^[a-z][a-z0-9_]{0,39}$/).test(f[0])||typeof f[1]!=='string'||!f[1]||f[1].length>80||!['text','number','date','email'].includes(f[2])||typeof f[3]!=='boolean')||new Set(parsed.map(f=>f[0])).size!==parsed.length)throw new Error('Use 1–20 unique fields: [key, label, type, required]. Keys use lowercase letters, digits and underscores.');
      setSchemas(s=>({...s,[schemaType]:parsed}));setNotice('Schema saved for this session. Re-extract a document to apply it.');setError('');
    }catch(e){setError(e.message);}
  }
  async function runEvaluation(live=false) {
    setBenchmarkBusy(true);setError('');
    const start=performance.now();const rows=runBaseline();
    try {
      if(live){
        for(let i=0;i<BENCHMARK.length;i++){
          const sample=BENCHMARK[i];
          const response=await fetch('/api/extract',{method:'POST',headers:{'Content-Type':'application/json','x-access-code':accessCode},body:JSON.stringify({text:sample.text,schema:TEMPLATES[sample.type||"invoice"]})});
          const result=await response.json();if(!response.ok)throw new Error(result.error);
          rows[i].ai=scoreFields(sample.expected,result.fields);rows[i].model=result.model;
          rows[i].aiEvidence=result.fields.filter(f=>f.value&&verifyEvidence(sample.text,f.evidence)).length;
        }
      }
      setBenchmark({rows,duration:Math.round(performance.now()-start),time:new Date().toISOString(),live});
      setNotice('Evaluation complete. Results were calculated from the labeled fixture set.');
    }catch(e){setError(e.message);}finally{setBenchmarkBusy(false);}
  }
  const selectedEvidence=fields.find(f=>f.key===selectedField)?.evidence;
  const sourceLines=doc?.text.split('\n')||[];
  async function batchOffline() {
    if(busy)return;
    setBusy(true);setError('');
    try {
      const results=docs.filter(d=>!d.fields.length).map(d=>{
        const started=performance.now();
        return {...d,fields:baselineExtract(d.text,schemas[d.type]||schemas.invoice),items:baselineItems(d.text),engine:'baseline',model:'Deterministic label parser',duration:Math.round(performance.now()-started),status:'review',extractedAt:new Date().toISOString(),audit:[...d.audit,{time:new Date().toISOString(),action:'Batch extracted with offline baseline'}]};
      });
      setDocs(previous=>previous.map(d=>results.find(r=>r.id===d.id)||d));
      setNotice(`${results.length} documents processed. Review the priority queue.`);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'mobile-open':''}`}>
      <a className="brand" href="#" onClick={e=>{e.preventDefault();setPage('workspace');}}><span className="brand-symbol"><Layers3 size={23}/></span>TraceLedger<span className="brand-dot">.</span></a>
      <div className="workspace-label"><span className="workspace-avatar">P</span><div>Procurement workspace<small>Final-year project</small></div><ChevronRight size={15}/></div>
      <p className="nav-label">WORKSPACE</p>
      <nav>{navigation.map(([key,label,Icon])=><button key={key} className={`nav-item ${page===key?'active':''}`} onClick={()=>{setPage(key);setError('');setMobileNav(false);}}><Icon size={18}/><span>{label}</span>{key==='workspace'&&<b>{docs.length}</b>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="trust-note"><ShieldCheck size={21}/><strong>Every value has a story.</strong><p>Trace the evidence.<br/>Keep the human in control.</p><span>Evidence-first by design <ArrowUpRight size={13}/></span></div><button className="nav-item" onClick={()=>setSettingsOpen(true)}><Settings2 size={18}/>Project settings</button><div className="profile"><div className="avatar">PG</div><div>Pratham Gupta<small>Project workspace</small></div><span className="online-dot"/></div></div>
    </aside>
    <main>
      <header className="topbar"><div className="breadcrumb"><button className="mobile-toggle icon-button" aria-label="Toggle navigation" onClick={()=>setMobileNav(!mobileNav)}><PanelLeftClose size={18}/></button><span>Workspace</span><ChevronRight size={14}/><strong>{navigation.find(n=>n[0]===page)?.[1]}</strong></div><div className="topbar-right"><span className="environment"><span/> {mode==='baseline'?'Offline baseline':'Live AI mode'}</span><button className="icon-button" aria-label="About this project" onClick={()=>setSettingsOpen(true)}><CircleHelp size={18}/></button><div className="avatar small">PG</div></div></header>
      <div className={`content ${page==='overview'?'overview-content':''}`}>
        <div className="page-heading"><div><div className="eyebrow">DOCUMENT INTELLIGENCE / {page==='workspace'?'OVERVIEW':page.toUpperCase()}</div><h1>{({project:'Business data, with evidence.',quality:'Make quality visible.',workspace:'From documents to decisions.',reconcile:'Find what doesn’t add up.',schemas:'Your data. Your structure.',evaluation:'Show the evidence. Measure the results.',audit:'A record of every review.'})[page]}</h1><p>{({project:'Explore the architecture, capabilities and demonstration workflow.',quality:'Inspect completeness, source coverage and review progress across your workspace.',workspace:'Extract the details. Verify the evidence. Move forward with confidence.',reconcile:'Compare extracted invoices and purchase orders using their shared order reference.',schemas:'Define the fields you need, then apply the same contract to every extraction.',evaluation:'A reproducible comparison of deterministic parsing and live AI extraction.',audit:'Follow extraction events, field reviews and approvals in your current workspace.'})[page]}</p></div>{page==='workspace'&&<button className="button primary" onClick={()=>{setUploadOpen(true);setError('');}}><Plus size={17}/>Add document</button>}</div>
        {error&&<div className="alert error" role="alert"><AlertTriangle size={18}/><span>{error}</span><button className="icon-button" aria-label="Dismiss error" onClick={()=>setError('')}><X size={16}/></button></div>}

        {page==='project'&&<Project onStart={()=>setPage('workspace')} onEvaluate={()=>setPage('evaluation')}/>}
        {page==='quality'&&<Quality docs={docs} onOpen={id=>{setActive(id);setPage('workspace');}}/>}
        {page==='overview'&&<Overview docs={docs} busy={busy} onBatch={batchOffline} onOpen={id=>{setActive(id);setPage('workspace');}} onRestore={incoming=>setDocs(previous=>[...incoming.map(d=>({...d,id:crypto.randomUUID()})),...previous])}/>}
        {page==='workspace'&&<>
          <div className="stat-grid">{[[FileText,'Documents in workspace',docs.length,'Text, PDF, images and email'],[ScanLine,'Extracted documents',completed,`${docs.length-completed} ready to process`],[Clock3,'Awaiting review',reviewCount,'Human checks before approval'],[FileCheck2,'Approved documents',approved,'Reviewed and validated']].map(([Icon,label,value,caption],i)=><div className="stat-card" key={label}><div className="stat-top"><span>{label}</span><Icon size={17}/></div><div className="stat-number">{String(value).padStart(2,'0')}<span className={`stat-indicator indicator-${i}`}><Activity size={15}/></span></div><small>{caption}</small></div>)}</div>
          <div className="demo-banner"><div className="demo-icon"><Sparkles size={20}/></div><div><strong>A small discrepancy. A much better demo.</strong><p>The sample invoice is ₹2,000 above its purchase order. Extract both to uncover the mismatch.</p></div><button onClick={()=>{setActive('sample-invoice');setPage('workspace');if(!docs.some(d=>d.id==='sample-invoice'))setDocs(prev=>[...initialDocs(),...prev]);setNotice('Sample invoice selected. Choose Extract document to begin.');}}>Try the sample pack <ArrowRight size={15}/></button></div>
          <section className="workspace-panel">
            <div className="panel-toolbar"><div className="section-title">Document workspace <span>{docs.length}</span></div><label className="search"><Search size={16}/><input aria-label="Search documents" placeholder="Find a document…" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="mode-control"><select aria-label="Extraction engine" value={mode} onChange={e=>setMode(e.target.value)}><option value="baseline">Offline baseline</option><option value="ai">Live AI</option></select></div></div>
            <div className="document-tabs">{docs.filter(d=>d.name.toLowerCase().includes(search.toLowerCase())).map(d=><button key={d.id} onClick={()=>{setActive(d.id);setSelectedField(null);setError('');}} className={d.id===doc?.id?'selected':''}><FileText size={15}/><span>{d.name}</span><i className={d.status}/></button>)}{!docs.filter(d=>d.name.toLowerCase().includes(search.toLowerCase())).length&&<p className="no-results">No documents match your search.</p>}</div>
            {doc?<div className="review-grid">
              <section className="source-pane"><div className="pane-heading"><div><FileText size={16}/><strong>Source document</strong></div><Badge>{typeLabel(doc.type)}</Badge></div><div className="source-meta"><span>{doc.name}</span><span>{doc.text.length.toLocaleString()} characters</span></div><div className="paper-wrap"><div className="document-paper"><div className="paper-header"><span className="paper-logo"><Layers3 size={19}/></span><span>INGESTED SOURCE TEXT</span><ShieldCheck size={16}/></div><div className="source-text">{sourceLines.map((line,index)=><div key={index} className={`source-line ${selectedEvidence&&line.trim()&&(selectedEvidence.includes(line.trim())||line.includes(selectedEvidence))?'highlight':''}`}><span className="line-number">{String(index+1).padStart(2,'0')}</span><span>{line||' '}</span></div>)}</div><div className="paper-footer">INGESTED TEXT PRESERVED · REVIEW OCR AGAINST YOUR ORIGINAL FILE</div></div></div><div className="source-footer"><ShieldCheck size={14}/>{persist?'Saved in this browser only':'Session-only storage'}<span>{doc.ingestion||'Text input'}</span></div></section>
              <section className="results-pane"><div className="pane-heading"><div><ScanLine size={17}/><strong>Structured output</strong></div>{fields.length?<Badge tone={doc.status==='approved'?'green':'amber'}>{doc.status==='approved'?'Approved':'Needs review'}</Badge>:<Badge>Not processed</Badge>}</div><div className="results-toolbar"><div className="small-tabs"><button className={resultTab==='fields'?'selected':''} onClick={()=>setResultTab('fields')}>Fields {fields.length>0&&<span>{fields.length}</span>}</button><button className={resultTab==='json'?'selected':''} onClick={()=>setResultTab('json')}>JSON</button></div><button className="button primary compact" disabled={busy} onClick={()=>extract()}>{busy?<LoaderCircle className="spin" size={15}/>:<Sparkles size={15}/>} {busy?'Extracting…':fields.length?'Re-extract':'Extract document'}</button></div>
                {!fields.length?<div className="ready-state"><div className="flow-illustration"><div><FileText size={27}/><i/><i/><i/></div><span><ArrowRight size={23}/></span><div className="flow-output"><Braces size={29}/><i/><i/></div></div><h2>Make the unstructured, useful.</h2><p>Extract this document into a clear, reviewable record. Every supported field links back to its source.</p><div className="ready-steps"><span><Check size={13}/>Source evidence</span><span><Check size={13}/>Business rules</span><span><Check size={13}/>Human review</span></div><p className="mode-note">{mode==='baseline'?'Offline baseline uses label matching, not AI. Switch to Live AI for semantic extraction.':'Live AI sends document text to the configured model through the configured provider.'}</p></div>:<>
                  <div className="extraction-summary"><div><span className="green-dot"/>{coverage}/{fields.length} fields with exact evidence</div><span>{doc.engine==='ai'?'AI extraction':'Offline baseline'} · {doc.duration} ms</span></div>
                  {resultTab==='json'?<pre className="json-view">{JSON.stringify({data:Object.fromEntries(fields.map(f=>[f.key,f.value])),status:doc.status,engine:doc.engine},null,2)}</pre>:<div className="field-list">{fields.map(f=>{
                    const fieldIssues=issues.filter(i=>i.field===f.key);const supported=verifyEvidence(doc.text,f.evidence);
                    return <div className={`field-row ${selectedField===f.key?'focused':''}`} key={f.key}><div className="field-label"><label htmlFor={`field-${f.key}`}>{f.label}{f.required&&<span>*</span>}</label><button className={`evidence-button ${supported?'supported':''}`} onClick={()=>setSelectedField(selectedField===f.key?null:f.key)}><Link2 size={11}/>{f.originalValue!==undefined&&f.originalValue!==f.value?'Human edited':supported?'Source linked':'No evidence'}</button></div><div className="field-input-row"><input id={`field-${f.key}`} value={f.value} placeholder="Not found" onFocus={()=>{editBefore.current[f.key]=f.value;}} onBlur={e=>recordEdit(f.key,e.target.value)} onChange={e=>editField(f.key,e.target.value)} disabled={doc.status==='approved'}/><button aria-label={`Review ${f.label}`} title={`Mark ${f.label} reviewed`} disabled={doc.status==='approved'} className={`review-check ${f.reviewed?'checked':''}`} onClick={()=>reviewField(f.key)}><Check size={16}/></button></div>{selectedField===f.key&&<div className="evidence-quote">{f.evidence?`“${f.evidence}”`:'No source quote was found. Verify this value manually.'}{f.reviewed&&<small>Human reviewed</small>}</div>}{fieldIssues.map((issue,i)=><p key={i} className={`field-issue ${issue.severity}`}><AlertTriangle size={12}/>{issue.message}</p>)}</div>;
                  })}</div>}
                  <section className="items-panel"><div className="pane-heading"><strong>Line items ({items.length})</strong><button className="button secondary compact" disabled={doc.status==='approved'} onClick={()=>patchDoc(doc.id,d=>({...d,status:'review',items:[...(d.items||[]),{description:'',quantity:'',unit_price:'',amount:'',evidence:'',reviewed:false}],audit:[...d.audit,{time:new Date().toISOString(),action:'Added manual line item'}]}))}>Add item</button></div><p className="muted">Stated amounts come from the source. Calculated amounts are quantity × unit price. Review omissions against the original document.</p>{items.length?<div className="table-wrap"><table className="items-table"><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Stated amount</th><th>Calculated</th><th>Review</th></tr></thead><tbody>{items.map((item,index)=><tr key={index}>{['description','quantity','unit_price','amount'].map(key=><td key={key}><input aria-label={`Item ${index+1} ${key}`} value={item[key]} disabled={doc.status==='approved'} onFocus={()=>{editBefore.current['item_'+index+'_'+key]=item[key];}} onBlur={e=>{const before=editBefore.current['item_'+index+'_'+key];if(before!==e.target.value)patchDoc(doc.id,d=>({...d,audit:[...d.audit,{time:new Date().toISOString(),action:`Changed item ${index+1} ${key}: ${before} → ${e.target.value}`}]}));}} onChange={e=>{const value=e.target.value;patchDoc(doc.id,d=>({...d,status:'review',items:d.items.map((it,j)=>j===index?{...it,[key]:value,reviewed:false}:it)}));}}/>{key==='description'&&<small>{item.evidence||'Manual item: no source quote'}</small>}</td>)}<td>{item.quantity.trim()&&item.unit_price.trim()&&Number.isFinite(Number(item.quantity)*Number(item.unit_price))?(Number(item.quantity)*Number(item.unit_price)).toFixed(2):'—'}</td><td><button className="button secondary compact" disabled={doc.status==='approved'} onClick={()=>patchDoc(doc.id,d=>({...d,status:'review',items:d.items.map((it,j)=>j===index?{...it,reviewed:true}:it),audit:[...d.audit,{time:new Date().toISOString(),action:`Reviewed item ${index+1}`}]}))}>{item.reviewed?'Reviewed':'Review'}</button><button className="icon-button" aria-label={`Remove item ${index+1}`} disabled={doc.status==='approved'} onClick={()=>patchDoc(doc.id,d=>({...d,status:'review',items:d.items.filter((_,j)=>j!==index),audit:[...d.audit,{time:new Date().toISOString(),action:`Removed item ${index+1}: ${item.description}`}]}))}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div>:<p className="muted">No line items extracted. Use Live AI for varied layouts, or add missing items manually.</p>}{issues.filter(i=>i.field.startsWith('item')).map((issue,index)=><p className={`field-issue ${issue.severity}`} key={index}>{issue.message}</p>)}</section><div className="result-actions"><div><button className="button secondary compact" onClick={()=>exportDoc('json')}><ArrowDownToLine size={14}/>JSON</button><button className="button secondary compact" onClick={()=>exportDoc('csv')}>CSV</button><button className="button secondary compact" onClick={()=>exportDoc('xlsx')}>Excel</button></div><button className="button primary compact" onClick={approve} disabled={doc.status==='approved'}><CheckCheck size={15}/>{doc.status==='approved'?'Approved':'Approve record'}</button></div>
                </>}
              </section>
            </div>:<Empty title="Your workspace is empty">Add a document to start extracting.</Empty>}
          </section>
          <div className="bottom-note"><ShieldCheck size={14}/><span>Offline extraction stays in your browser. Live AI transmits document text to the model provider.</span><button onClick={()=>setSettingsOpen(true)}>Storage & AI settings <ArrowUpRight size={13}/></button></div>
        </>}

        {page==='reconcile'&&<><div className="feature-intro"><span className="feature-icon"><GitCompareArrows size={28}/></span><div><h2>Two documents. One shared truth.</h2><p>Checks compare vendor, currency and total for exact matching purchase-order references. A match is a consistency check, not proof that either document is authentic.</p></div><Badge tone="green">Deterministic validation</Badge></div><div className="card"><div className="card-heading"><h2>Reconciliation results</h2><Badge tone={matches.some(m=>m.status==='conflict')?'amber':'green'}>{matches.filter(m=>m.status==='conflict').length} conflicts</Badge></div>{matches.length?matches.map(r=><div className={`reconcile-row ${r.status}`} key={r.id}><span>{r.status==='pass'?<Check size={18}/>:<AlertTriangle size={18}/>}</span><div><strong>{r.message}</strong><p>{r.documents.join(' ↔ ')}</p></div><Badge tone={r.status==='pass'?'green':'amber'}>{r.status==='pass'?'Matched':r.status==='conflict'?'Conflict':'Waiting'}</Badge></div>):<Empty icon={GitCompareArrows} title="Extract an invoice and its purchase order">Open the document workspace and extract both sample documents to run the comparison.</Empty>}<div className="card-footer"><button className="button secondary" onClick={()=>setPage('workspace')}>Open workspace <ArrowRight size={15}/></button></div></div></>}

        {page==='schemas'&&<div className="two-columns"><section className="card"><div className="card-heading"><h2>Schema editor</h2><select aria-label="Schema template" value={schemaType} onChange={e=>{setSchemaType(e.target.value);setSchemaText(JSON.stringify(schemas[e.target.value],null,2));}}>{Object.keys(schemas).map(k=><option key={k} value={k}>{typeLabel(k)}</option>)}</select></div><div className="card-body"><p className="muted">Each field: <code>[key, label, type, required]</code></p><textarea className="code-editor" aria-label="Schema JSON" value={schemaText} onChange={e=>setSchemaText(e.target.value)} spellCheck={false}/><div className="button-row"><button className="button primary" onClick={saveSchema}><Check size={15}/>Save schema</button><button className="button secondary" onClick={()=>download('traceledger-schema.json',JSON.stringify(schemas[schemaType],null,2))}><ArrowDownToLine size={15}/>Export</button></div></div></section><section className="card"><div className="card-heading"><h2>A contract for your data</h2><Braces size={19}/></div><div className="card-body explanation"><h3>Typed fields</h3><p>Choose text, number, date or email. Required values and format checks run independently of the model.</p><h3>Evidence on every field</h3><p>The model returns a value and a verbatim source quote. The app checks whether that quote actually occurs in the input.</p><h3>Abstention over guessing</h3><p>Missing values stay empty and enter the review queue. An exact source quote is evidence of provenance, not a calibrated confidence score.</p><h3>Custom extraction</h3><p>Live AI uses field labels to interpret your schema. The baseline only recognizes explicit labels and should be treated as a limited comparator.</p><div className="info-box">Schema changes apply to new extractions in this session. Export your schema to keep a copy.</div></div></section></div>}

        {page==='evaluation'&&<><div className="feature-intro"><span className="feature-icon"><FlaskConical size={28}/></span><div><h2>Accuracy that you can reproduce.</h2><p>Twenty synthetic fixtures cover labeled text, prose, missing values, formatting and misleading instructions. This is a smoke-test set, not a representative production benchmark.</p></div></div><div className="card"><div className="card-heading"><h2>Extraction benchmark</h2><div className="button-row"><button disabled={benchmarkBusy} className="button secondary compact" onClick={()=>runEvaluation(false)}>Run baseline</button><button disabled={benchmarkBusy} className="button primary compact" onClick={()=>runEvaluation(true)}>{benchmarkBusy?<LoaderCircle className="spin" size={15}/>:<Sparkles size={15}/>}Compare live AI</button></div></div><div className="card-body"><p className="muted">Metric: normalized field exact match, including correct abstentions. Live comparison makes 20 model calls using the project access code.</p>{benchmark?<><div className="benchmark-metrics"><div><span>BASELINE EXACT MATCH</span><strong>{Math.round(benchmark.rows.reduce((s,r)=>s+r.correct,0)/benchmark.rows.reduce((s,r)=>s+r.total,0)*100)}%</strong></div><div><span>LIVE AI EXACT MATCH</span><strong>{benchmark.live?`${Math.round(benchmark.rows.reduce((s,r)=>s+r.ai.correct,0)/benchmark.rows.reduce((s,r)=>s+r.ai.total,0)*100)}%`:'Not run'}</strong></div><div><span>EVALUATED FIELDS</span><strong>{benchmark.rows.reduce((s,r)=>s+r.total,0)}</strong></div></div><div className="table-wrap"><table><thead><tr><th>Test case</th><th>Baseline</th><th>Live AI</th><th>Baseline field match</th></tr></thead><tbody>{benchmark.rows.map(r=><tr key={r.name}><td>{r.name}</td><td>{r.correct}/{r.total}</td><td>{r.ai?`${r.ai.correct}/${r.ai.total}`:'Not run'}</td><td><div className="progress-track"><span style={{width:`${r.accuracy*100}%`}}/></div></td></tr>)}</tbody></table></div><div className="card-footer"><span className="muted">Run {timeLabel(benchmark.time)} · {benchmark.duration} ms</span><button className="button secondary compact" onClick={()=>download('traceledger-evaluation.json',JSON.stringify({...benchmark,method:'Normalized exact match on 20 synthetic fixtures; includes correct abstentions; not a production accuracy estimate'},null,2))}><ArrowDownToLine size={14}/>Export results</button></div></>:<Empty icon={FlaskConical} title="No measurements yet">Run the baseline to calculate actual scores. Add AI credentials in project settings to compare semantic extraction.</Empty>}</div></div><details className="card fixture-details"><summary>Inspect the labeled evaluation fixtures <Braces size={16}/></summary><pre className="json-view">{JSON.stringify(BENCHMARK,null,2)}</pre></details></>}

        {page==='audit'&&<div className="card"><div className="card-heading"><h2>Workspace activity</h2><button className="button secondary compact" onClick={()=>download('traceledger-review-history.json',JSON.stringify(docs.map(d=>({document:d.name,audit:d.audit})),null,2))}><ArrowDownToLine size={14}/>Export history</button></div>{docs.flatMap(d=>d.audit.map((a,i)=>({...a,document:d.name,id:`${d.id}-${i}`}))).sort((a,b)=>b.time.localeCompare(a.time)).map(a=><div className="audit-row" key={a.id}><span className="audit-icon"><History size={16}/></span><div><strong>{a.action}</strong><p>{a.document}</p></div><time>{timeLabel(a.time)}</time></div>)}{!docs.some(d=>d.audit.length)&&<Empty icon={History} title="The review history starts here">Extract a document or review a field to record your first event.</Empty>}<div className="card-footer"><p className="muted">This is a local review history. It is editable browser data, not an immutable compliance audit log.</p></div></div>}
        <footer className="page-footer"><span>TraceLedger <span> / </span> Evidence-first document intelligence</span><span>Built to be questioned. Designed to be verified.</span></footer>
      </div>
    </main>
    {notice&&<div className="toast" role="status"><Check size={17}/>{notice}</div>}

    {uploadOpen&&<div className="modal-backdrop" onClick={()=>!busy&&setUploadOpen(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="upload-title" onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">NEW DOCUMENT</span><h2 id="upload-title">Bring your business inputs.</h2></div><button className="icon-button" aria-label="Close upload" onClick={()=>setUploadOpen(false)}><X size={20}/></button></div><div className="modal-body"><label className="form-label">Document type<select value={newType} onChange={e=>setNewType(e.target.value)}>{Object.keys(TEMPLATES).map(k=><option key={k} value={k}>{typeLabel(k)}</option>)}</select></label><button className="upload-area" disabled={busy} onClick={()=>fileRef.current.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();uploadFiles(e.dataTransfer.files);}}>{busy?<LoaderCircle className="spin" size={29}/>:<Upload size={29}/>}<strong>{busy?(ingestProgress||'Reading document…'):'Drop up to 10 documents or click to browse'}</strong><span>PDF, PNG, JPG, WEBP, TXT, MD, EML · Up to 3 MB</span><small>English OCR included · 20 PDF pages, up to 5 scanned pages. OCR downloads its engine on first use.</small></button><input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.eml" hidden onChange={e=>uploadFiles(e.target.files)}/><div className="or-divider">or paste document text</div><label className="form-label">Document name<input value={pasteName} onChange={e=>setPasteName(e.target.value)} maxLength={120}/></label><label className="form-label">Source text<textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} placeholder="Paste an invoice, purchase order or business email…" maxLength={40000}/></label>{error&&<p className="modal-error" role="alert">{error}</p>}<div className="modal-footer"><span>{pasteText.length.toLocaleString()} / 40,000 characters</span><button className="button primary" disabled={busy||!pasteText.trim()} onClick={()=>{try{addDoc(pasteText,pasteName,newType);}catch(e){setError(e.message);}}}>Add to workspace <ArrowRight size={15}/></button></div></div></section></div>}

    {settingsOpen&&<div className="modal-backdrop" onClick={()=>setSettingsOpen(false)}><section className="modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">PROJECT SETTINGS</span><h2 id="settings-title">Make the workspace yours.</h2></div><button className="icon-button" aria-label="Close settings" onClick={()=>setSettingsOpen(false)}><X size={20}/></button></div><div className="modal-body"><div className="settings-section"><div className="settings-title"><Sparkles size={19}/><h3>Live AI extraction</h3><Badge tone={configured?'green':'amber'}>{configured?'Configured':'Setup needed'}</Badge></div><p>Model: <code>{model||'Checking configuration…'}</code>. API credentials belong in Vercel environment variables and never in this browser.</p><label className="form-label">Project access code<input type="password" value={accessCode} onChange={e=>setAccessCode(e.target.value)} placeholder="Enter your shared demo access code" autoComplete="off"/></label><p className="muted">Held in memory for this session. The server checks it before making model calls.</p>{!configured&&<div className="info-box">In Vercel, set <code>ANTHROPIC_API_KEY</code> (or AI Gateway authentication) and <code>APP_ACCESS_CODE</code>, then redeploy. Offline baseline extraction works without credentials.</div>}</div><div className="settings-section"><div className="settings-title"><ShieldCheck size={19}/><h3>Workspace storage</h3></div><label className="checkbox-label"><input type="checkbox" checked={persist} onChange={e=>setPersist(e.target.checked)}/>Remember documents in this browser</label><p>Off by default. When enabled, source text, extracted values and review history are stored in localStorage on this device. The app has no shared database or user accounts.</p><p>Offline parsing runs locally. Live AI sends document text to Anthropic (when configured), or through AI Gateway.</p></div><div className="settings-section"><div className="settings-title"><Layers3 size={19}/><h3>About TraceLedger</h3></div><p>A final-year project on evidence-linked structured extraction: schema-constrained output, deterministic business validation, human review and reproducible evaluation.</p><p className="muted">Current scope: text and scanned PDFs, images with English OCR, line items and Excel export; browser-local workspaces and one reviewer. Durable multi-user storage and calibrated confidence remain extensions.</p></div><button className="button primary full-width" onClick={()=>{setSettingsOpen(false);setNotice('Settings applied for this session.');}}>Done <Check size={16}/></button></div></section></div>}
  </div>;
}
