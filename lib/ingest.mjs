export async function readDocument(file, progress=()=>{}) {
  if(file.size>3*1024*1024)throw new Error('Choose a file smaller than 3 MB.');
  let worker;
  const recognize=async image=>{
    if(!worker){const {createWorker}=await import('tesseract.js');worker=await createWorker('eng',1,{logger:m=>progress(`${m.status}${m.progress!=null?' '+Math.round(m.progress*100)+'%':''}`)});}
    const result=await worker.recognize(image);
    return result.data.text;
  };
  try {
    if(/\.(png|jpe?g|webp)$/i.test(file.name)) {
      const text=await recognize(file);
      if(text.trim().length<5)throw new Error('No readable text detected. Try a sharper, upright image.');
      return {text,ingestion:'English OCR · image'};
    }
    if(/\.pdf$/i.test(file.name)) {
      const pdfjs=await import('pdfjs-dist/webpack.mjs');
      const loadingTask=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});
      const pdf=await loadingTask.promise;
      try{
        if(pdf.numPages>20)throw new Error('Choose a PDF with 20 pages or fewer.');
        const pages=[];let scans=0;
        for(let n=1;n<=pdf.numPages;n++){
          progress(`Reading page ${n}/${pdf.numPages}`);
          const page=await pdf.getPage(n);const content=await page.getTextContent();
          let text=content.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join('');
          if(text.trim().length<20){
            if(++scans>5)throw new Error('Split scanned PDFs into batches of five pages or fewer for browser OCR.');
            const base=page.getViewport({scale:1});
            const viewport=page.getViewport({scale:Math.min(2,2400/Math.max(base.width,base.height))});
            const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
            try{await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;text=await recognize(canvas);}finally{canvas.width=0;canvas.height=0;}
          }
          pages.push(`--- Page ${n} ---\n${text}`);
        }
        const text=pages.join('\n\n');
        if(text.replace(/--- Page \d+ ---/g,'').trim().length<5)throw new Error('No readable text found. Try a clearer scan.');
        return {text,ingestion:scans?`PDF text + English OCR (${scans} pages)`:'PDF text layer'};
      }finally{await loadingTask.destroy();}
    }
    if(/\.(txt|md|eml)$/i.test(file.name))return {text:await file.text(),ingestion:'Text file'};
    throw new Error('Use PDF, PNG, JPG, WEBP, TXT, MD or EML.');
  }finally{if(worker)await worker.terminate();}
}
