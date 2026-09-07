/* HLL export 8.0 — capture the actual lesson DOM; use one landscape page
   composition for PDF, DOCX, PNG and JPG. No remote conversion service. */
(function(global){
'use strict';
const PAGE_W=1600,PAGE_H=1131,CONTENT_X=56,CONTENT_Y=78,CONTENT_W=1488,CONTENT_H=968;
const CAPTURE_W=1120,CAPTURE_SCALE=1.5;
const FONT='"Noto Sans KR","Malgun Gothic",Arial,sans-serif';
const txt=v=>String(v??'');
const arr=v=>Array.isArray(v)?v:[];
const bytes=s=>new TextEncoder().encode(s);
const xml=s=>txt(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const clean=s=>txt(s).trim().replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').replace(/\s+/g,'_').slice(0,100)||'미입력';
const fileBase=m=>['school','year','semester','course','week'].map(k=>clean(k==='week'&&m[k]&&!/주차$/.test(String(m[k]))?String(m[k])+'주차':m[k])).join('_');
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
function blob(canvas,type,quality){return new Promise((ok,fail)=>canvas.toBlob(b=>b?ok(b):fail(new Error('이미지 인코딩에 실패했습니다.')),type,quality));}
function download(b,name){const url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function concat(...parts){let len=0;for(const p of parts)len+=p.length;const result=new Uint8Array(len);let i=0;for(const p of parts){result.set(p,i);i+=p.length;}return result;}

async function stylesheetText(){
  const parts=[];
  for(const node of document.querySelectorAll('style,link[rel="stylesheet"]')){
    if(node.tagName==='STYLE')parts.push(node.textContent);
    else{
      const response=await fetch(node.href,{credentials:'same-origin'});
      if(!response.ok)throw new Error('스타일시트를 불러올 수 없습니다: '+node.href);
      parts.push(await response.text());
    }
  }
  return parts.join('\n');
}
async function prepareStage(lesson,options){
  if(typeof options.renderBlock!=='function')throw new Error('웹 카드 렌더러가 연결되지 않았습니다.');
  const css=await stylesheetText();
  const iframe=document.createElement('iframe');
  iframe.setAttribute('aria-hidden','true');iframe.setAttribute('tabindex','-1');
  iframe.style.cssText='position:fixed;left:-20000px;top:0;width:1120px;height:1000px;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);
  try{
    const doc=iframe.contentDocument;
    const base=document.baseURI.replace(/"/g,'&quot;');
    doc.open();doc.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><base href="${base}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css.replace(/<\/style/gi,'<\\/style')}\nhtml{scroll-behavior:auto!important}body{margin:0!important;background:var(--bg)!important}.hll-export-stage{width:${CAPTURE_W}px!important;max-width:none!important}.hll-export-stage>.block,.hll-export-stage>.hero{margin:0!important;width:100%!important;max-width:none!important;height:auto!important;animation:none!important;transition:none!important}.hll-export-stage .block{overflow:visible!important}.hll-export-stage .hero{overflow:hidden!important}</style></head><body><main class="content-area"><div class="hll-export-stage" id="hll-stage">${arr(lesson.blocks).map((b,i)=>options.renderBlock(b,i)).join('')}</div></main></body></html>`);doc.close();
    await doc.fonts.ready;
    await Promise.all([...doc.images].map(img=>img.decode?.().catch(()=>{})||Promise.resolve()));
    await nextFrame();
    const nodes=[...doc.querySelectorAll('#hll-stage > .hero,#hll-stage > .block')];
    if(nodes.length!==lesson.blocks.length)throw new Error('일부 학습카드를 렌더링하지 못했습니다.');
    const maxOriginal=CONTENT_H/(CONTENT_W/CAPTURE_W);
    const entries=nodes.map((node,i)=>({node,index:i,cuts:safeCuts(node,maxOriginal)}));
    return {iframe,entries,count:entries.reduce((n,e)=>n+e.cuts.length-1,0)};
  }catch(e){iframe.remove();throw e;}
}
function safeCuts(root,maxHeight){
  const bounds=root.getBoundingClientRect(),height=Math.ceil(bounds.height);
  if(height<=maxHeight)return [0,height];
  const intervals=[];
  const add=(r,pad=3)=>{
    const a=Math.max(0,r.top-bounds.top-pad),b=Math.min(height,r.bottom-bounds.top+pad);
    if(b>a)intervals.push([a,b]);
  };
  const walker=root.ownerDocument.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
    const node=walker.currentNode;if(!node.nodeValue.trim())continue;
    const range=root.ownerDocument.createRange();range.selectNodeContents(node);
    for(const r of range.getClientRects())add(r,3);
  }
  const atom='.flow-card,.timeline-item > div:last-child,.term-card,.bento-card,.concept-node,.compare-side,.mis-before,.mis-after,.quiz-option,.remember,.bigidea-claim,.bigidea-evidence > div,.keyconcept-card,.ladder-item,.block-head,img,svg,canvas';
  for(const el of root.querySelectorAll(atom)){
    const r=el.getBoundingClientRect();if(r.height<maxHeight*.92)add(r,4);
  }
  intervals.sort((a,b)=>a[0]-b[0]);
  const merged=[];for(const [a,b] of intervals){if(merged.length&&a<=merged.at(-1)[1])merged.at(-1)[1]=Math.max(b,merged.at(-1)[1]);else merged.push([a,b]);}
  const gaps=[];let prev=0;
  for(const [a,b] of merged){if(a>prev)gaps.push([prev,a]);prev=Math.max(prev,b);}
  if(prev<height)gaps.push([prev,height]);
  const cuts=[0];let start=0;
  const minimum=120;
  while(start+maxHeight<height){
    const remaining=height-start;
    const pages=Math.ceil(remaining/maxHeight);
    const ideal=start+remaining/pages;
    const lower=Math.max(start+minimum,height-(pages-1)*maxHeight);
    const upper=Math.min(start+maxHeight,height-minimum*(pages-1));
    const candidates=[];
    for(const [a,b] of gaps){
      if(b<=start+minimum)continue;
      for(const y of [a,b,(a+b)/2])if(y>start+minimum&&y<height)candidates.push(y);
      if(a<=ideal&&ideal<=b)candidates.push(ideal);
      if(a<=lower&&lower<=b)candidates.push(lower);
      if(a<=upper&&upper<=b)candidates.push(upper);
    }
    const within=candidates.filter(y=>y>=lower&&y<=upper);
    let cut;
    if(within.length)cut=within.reduce((a,b)=>Math.abs(a-ideal)<Math.abs(b-ideal)?a:b);
    else if(candidates.length)cut=candidates.reduce((a,b)=>Math.abs(a-ideal)<Math.abs(b-ideal)?a:b);
    else cut=height;
    cut=Math.min(height,Math.max(start+1,Math.floor(cut)));
    if(cut>=height)break;
    cuts.push(cut);start=cut;
    if(cuts.length>100)throw new Error('학습카드의 페이지 분할 횟수가 너무 많습니다.');
  }
  cuts.push(height);return cuts;
}
function pageCanvas(source,start,end,lesson,blockIndex,part,totalParts,pageNumber,pageCount){
  const canvas=document.createElement('canvas');canvas.width=PAGE_W;canvas.height=PAGE_H;
  const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas 2D를 사용할 수 없습니다.');
  ctx.fillStyle='#fffdf8';ctx.fillRect(0,0,PAGE_W,PAGE_H);
  const m=lesson.metadata||{};
  ctx.fillStyle='#b28a4e';ctx.font=`700 22px ${FONT}`;ctx.textBaseline='top';
  ctx.fillText(`${txt(m.course)} · ${txt(m.week)}주차`,CONTENT_X,32);
  ctx.fillStyle='#65706c';ctx.font=`400 18px ${FONT}`;ctx.textAlign='right';
  ctx.fillText(`${String(pageNumber).padStart(2,'0')} / ${String(pageCount).padStart(2,'0')}`,PAGE_W-CONTENT_X,34);ctx.textAlign='left';
  const sy=Math.round(start*CAPTURE_SCALE),ey=Math.min(source.height,Math.round(end*CAPTURE_SCALE));
  const sh=Math.max(1,ey-sy),scale=Math.min(CONTENT_W/source.width,CONTENT_H/sh);
  const dw=source.width*scale,dh=sh*scale;
  const dx=CONTENT_X+(CONTENT_W-dw)/2,dy=CONTENT_Y+(CONTENT_H-dh)/2;
  ctx.drawImage(source,0,sy,source.width,sh,dx,dy,dw,dh);
  ctx.fillStyle='#ded9ce';ctx.fillRect(CONTENT_X,PAGE_H-43,CONTENT_W,1);
  ctx.fillStyle='#65706c';ctx.font=`400 16px ${FONT}`;ctx.fillText('HLL · Hmseodam Learning Lab',CONTENT_X,PAGE_H-32);
  return canvas;
}
function pdfFromJpegs(images){
 const objects=[];const add=content=>{objects.push(content);return objects.length;};
 const catalog=add(''),pages=add(''),pageRefs=[];
 for(const im of images){
  const w=im.width,h=im.height,pw=841.89,ph=595.28;
  const imageRef=add({dict:`/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,data:im.data});
  const commands=`q\n${pw} 0 0 ${ph} 0 0 cm\n/Im1 Do\nQ\n`;
  const contentRef=add({dict:'',data:bytes(commands)});
  pageRefs.push(add(`<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im1 ${imageRef} 0 R >> >> /Contents ${contentRef} 0 R >>`));
 }
 objects[catalog-1]=`<< /Type /Catalog /Pages ${pages} 0 R >>`;
 objects[pages-1]=`<< /Type /Pages /Kids [${pageRefs.map(i=>`${i} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`;
 const parts=[bytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')],offsets=[0];let length=parts[0].length;
 for(let i=0;i<objects.length;i++){
  offsets.push(length);const obj=objects[i];
  const data=typeof obj==='string'?bytes(obj):concat(bytes(`<< ${obj.dict} /Length ${obj.data.length} >>\nstream\n`),obj.data,bytes('\nendstream'));
  const part=concat(bytes(`${i+1} 0 obj\n`),data,bytes('\nendobj\n'));parts.push(part);length+=part.length;
 }
 const start=length;const trailer=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${start}\n%%EOF`;
 parts.push(bytes(trailer));return new Blob(parts,{type:'application/pdf'});
}
function docxFromImages(images,title){
 if(typeof global.JSZip!=='function')throw new Error('문서 압축 모듈을 불러오지 못했습니다.');
 const zip=new global.JSZip(),rels=[],paras=[];
 const maxW=10.50*914400,maxH=7.05*914400;
 images.forEach((im,i)=>{
  const scale=Math.min(maxW/im.width,maxH/im.height),cx=Math.round(im.width*scale),cy=Math.round(im.height*scale),rid=`rId${i+1}`,filename=`card${i+1}.jpg`;
  zip.file(`word/media/${filename}`,im.data);
  rels.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${filename}"/>`);
  paras.push(`<w:p><w:pPr>${i?'<w:pageBreakBefore/>':''}<w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="atLeast"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${i+1}" name="Learning Card ${i+1}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${i+1}" name="${filename}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`);
 });
 const ns='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
 zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>');
 zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>');
 zip.file('word/document.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${ns}><w:body>${paras.join('')}<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr></w:body></w:document>`);
 zip.file('word/_rels/document.xml.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`);
 zip.file('docProps/core.xml',`<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(title)}</dc:title><dc:creator>Hmseodam Learning Lab</dc:creator></cp:coreProperties>`);
 return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE'});
}
async function exportLesson(lesson,format,progress,save=download,options={}){
 const base=fileBase(lesson.metadata||{}),blocks=arr(lesson.blocks);
 if(!blocks.length)throw new Error('저장할 학습카드가 없습니다.');
 if(!['pdf','docx','png','jpg'].includes(format))throw new Error('지원하지 않는 파일 형식입니다.');
 if(typeof global.HLLDomCapture?.capture!=='function')throw new Error('웹 카드 캡처 모듈을 불러오지 못했습니다.');
 if(typeof global.JSZip!=='function'&&format!=='pdf')throw new Error('ZIP 모듈을 불러오지 못했습니다.');
 const stage=await prepareStage(lesson,options);
 const zip=(format==='png'||format==='jpg')?new global.JSZip():null,images=[];
 let pageNumber=0;
 try{
  for(const entry of stage.entries){
   progress?.(`웹 카드 캡처 중 · ${entry.index+1}/${stage.entries.length}`);
   const source=await global.HLLDomCapture.capture(entry.node,{scale:CAPTURE_SCALE,background:'#fffdf8'});
   try{
    for(let part=0;part<entry.cuts.length-1;part++){
     pageNumber++;
     const canvas=pageCanvas(source,entry.cuts[part],entry.cuts[part+1],lesson,entry.index,part,entry.cuts.length-1,pageNumber,stage.count);
     const mime=format==='png'?'image/png':'image/jpeg';
     const b=await blob(canvas,mime,.94);
     if(zip)zip.file(`${base}_${String(pageNumber).padStart(2,'0')}.${format}`,b);
     else images.push({width:canvas.width,height:canvas.height,data:new Uint8Array(await b.arrayBuffer())});
     canvas.width=0;canvas.height=0;
     progress?.(`가로 페이지 생성 중 · ${pageNumber}/${stage.count}`);
     await nextFrame();
    }
   }finally{source.width=0;source.height=0;}
  }
  if(zip){const result=await zip.generateAsync({type:'blob',compression:'DEFLATE'});await save(result,`${base}_${format.toUpperCase()}.zip`);return result;}
  if(format==='pdf'){const result=pdfFromJpegs(images);await save(result,`${base}.pdf`);return result;}
  const result=await docxFromImages(images,base);await save(result,`${base}.docx`);return result;
 }finally{stage.iframe.remove();}
}
global.HLLExport={exportLesson,fileBase,version:'8.0.0'};
})(window);
