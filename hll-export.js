/* HLL export 7.0 — dependency-free Canvas/PDF renderer; local JSZip for ZIP/DOCX.
 * The live HTML layout is untouched. Documents use a predictable print layout.
 * All text comes from lesson.json; no external requests or AI processing.
 */
(function(global){
'use strict';
const C={paper:'#fffdf8',bg:'#f7f4ed',ink:'#1e2a26',muted:'#65706c',line:'#ded9ce',deep:'#22352e',gold:'#b28a4e',sand:'#ece3d3',white:'#ffffff'};
const W=1080,M=48,CW=W-M*2,FONT='"Noto Sans KR","Malgun Gothic",Arial,sans-serif';
const txt=v=>String(v??'');
const pick=(o,...keys)=>{for(const k of keys){if(o&&o[k]!==undefined&&o[k]!==null&&o[k]!=='')return o[k];}return '';};
const arr=v=>Array.isArray(v)?v:[];
const bytes=s=>new TextEncoder().encode(s);
const xml=s=>txt(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const clean=s=>txt(s).trim().replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').replace(/\s+/g,'_').slice(0,100)||'미입력';
const fileBase=m=>['school','year','semester','course','week'].map(k=>clean(m[k])).join('_');
function textNode(value,size=24,color=C.ink,weight=400,extra={}){return {kind:'text',value:txt(value),size,color,weight,...extra};}
function stack(children=[],gap=14){return {kind:'stack',children:children.filter(Boolean),gap};}
function panel(children=[],opt={}){return {kind:'panel',children:children.filter(Boolean),pad:opt.pad??24,gap:opt.gap??12,bg:opt.bg||C.bg,border:opt.border===false?null:(opt.border||C.line),radius:opt.radius??18};}
function columns(children=[],weights=[]){return {kind:'columns',children:children.filter(Boolean),weights,gap:18};}
function pair(label,value){return stack([textNode(label,19,C.gold,700),textNode(value,24)],6);}
function item(title,desc,kicker){return panel([kicker?textNode(kicker,18,C.gold,700):null,textNode(title,29,C.ink,700),desc?textNode(desc,23,C.muted):null],{gap:10});}
function list(items,numbered=true){return stack(arr(items).map((x,i)=>panel([textNode(numbered?String(i+1).padStart(2,'0'):'•',19,C.gold,700),textNode(typeof x==='string'?x:pick(x,'text','description','title','value'),24)],{gap:8,pad:18})),10);}
function blockBody(b){
 const type=b.type;
 switch(type){
 case 'HERO':return stack([textNode(b.eyebrow||'HLL',19,C.gold,700),textNode(b.title,48,C.ink,800),textNode(b.subtitle,27,C.muted),b.coreQuestion?panel([textNode('핵심 질문',18,C.gold,700),textNode(b.coreQuestion,26,C.ink,600)],{bg:C.sand}):null],20);
 case 'BIG_IDEA':return stack([panel([textNode('BIG IDEA',18,C.gold,700),textNode(pick(b,'claim','main','title'),39,C.white,800),textNode(pick(b,'explain','description','message'),24,C.white)],{bg:C.deep,border:false,pad:30}),list(b.evidence||b.items)]);
 case 'COMPARE':{
  const side=s=>panel([textNode(s?.title,32,C.ink,800),s?.tag?textNode(s.tag,20,C.gold,700):null,...arr(s?.items).map(x=>pair(x.label,x.value))],{gap:14});
  return columns([side(b.left),side(b.right)],[1,1]);
 }
 case 'QUOTE':return stack([panel([textNode(b.quote,40,C.white,700),textNode(b.caption,24,C.white)],{bg:C.deep,border:false,pad:30})]);
 case 'FLOW':case 'STEP_PATH':return stack(arr(b.steps||b.items).map((x,i)=>item(pick(x,'title','label'),pick(x,'text','description','value'),pick(x,'kicker','step')||`STEP ${i+1}`)),12);
 case 'TIMELINE':return stack(arr(b.items).map((x,i)=>item(x.title,pick(x,'description','text'),pick(x,'date','kicker')||String(i+1))),12);
 case 'CONCEPT_MAP':{
  const ns=arr(b.nodes),center=ns.find(n=>n.role==='center'||n.id==='self'||n.center);
  const ordered=center?[center,...ns.filter(n=>n!==center)]:ns;
  return stack([...ordered.map(n=>item(n.label,n.description,n===center?'중심 개념':null)),...arr(b.edges).map(e=>textNode(`${pick(ns.find(n=>n.id===e.from),'label')||e.from}  ${e.relation||'→'}  ${pick(ns.find(n=>n.id===e.to),'label')||e.to}`,22,C.muted))],12);
 }
 case 'SPECTRUM':return stack([textNode(`${b.leftLabel||''}  ↔  ${b.rightLabel||''}`,25,C.gold,700),...arr(b.items).map(x=>item(x.label,x.note,Number.isFinite(Number(x.position))?`${x.position}%`:null)),b.footer?textNode(b.footer,23,C.muted):null]);
 case 'CAUSE_EFFECT':return stack([textNode('원인',19,C.gold,700),...arr(b.causes).map(x=>item(x.title,pick(x,'text','description'))),textNode('↓',32,C.gold,700),item(b.bridge?.title||'과정',b.bridge?.text),textNode('↓',32,C.gold,700),panel([textNode(b.result?.title||'결과',32,C.white,700),textNode(b.result?.text,24,C.white)],{bg:C.deep,border:false})]);
 case 'BENTO':case 'BENTO_SUMMARY':case 'KEY_CONCEPTS':{
  const items=arr(b.items||b.cards);
  return stack(items.map((x,i)=>item(pick(x,'title','term','label'),pick(x,'text','description','value'),pick(x,'kicker','label')||`POINT ${i+1}`)),12);
 }
 case 'TERM_DECK':return stack(arr(b.terms||b.items).map(x=>item(pick(x,'term','title','label'),pick(x,'definition','description','text'),x.original)),12);
 case 'MISCONCEPTION':return stack(arr(b.items).map(x=>panel([pair('오해',pick(x,'misconception','before','myth')),pair('다시 보기',pick(x,'correction','after','reframe'))],{gap:16})),12);
 case 'QUESTION_LADDER':return stack(arr(b.items||b.questions).map((x,i)=>item(pick(x,'question','title'),pick(x,'answer','text','description'),`Q${i+1}`)),12);
 case 'CHECKPOINT':{
  const choices=arr(b.choices);
  return stack([textNode(b.question,31,C.ink,700),...choices.map((x,i)=>panel([textNode(`${i+1}. ${x}`,23)],{bg:i===b.answer?C.sand:C.bg,pad:17})),panel([textNode(`정답: ${Number(b.answer)+1}번`,23,C.ink,700),textNode(b.explanation,23,C.muted)],{bg:C.sand})],12);
 }
 case 'RECAP':return stack([list(b.mustRemember||b.items),b.keywords?.length?panel([textNode('핵심어',19,C.gold,700),textNode(b.keywords.join(' · '),24)],{gap:10}):null,b.coreRelation?panel([textNode('핵심 관계',19,C.gold,700),textNode(b.coreRelation,26,C.white,600)],{bg:C.deep,border:false}):null]);
 default:{
  const items=arr(b.items||b.cards||b.points);
  return stack(items.map((x,i)=>item(pick(x,'title','label','term')||`POINT ${i+1}`,pick(x,'text','description','value')||txt(x))),12);
 }
 }
}
function buildBlock(lesson,b,i){
 const m=lesson.metadata||{};
 const hero=b.type==='HERO';
 const heading=hero?[]:[textNode(b.title||'학습 확인',38,C.ink,800),b.message?textNode(b.message,23,C.muted):null];
 return stack([textNode(`${m.course||''}  ·  ${m.week||''}주차`,18,C.gold,700),...heading,blockBody(b),b.sourceRef?textNode(b.sourceRef,18,C.muted):null],20);
}
function font(ctx,n){ctx.font=`${n.weight||400} ${n.size||24}px ${FONT}`;}
function wrap(ctx,value,maxW,size,weight){
 font(ctx,{size,weight});
 const lines=[];const source=txt(value).replace(/\r/g,'').split('\n');
 for(const paragraph of source){
  if(!paragraph){lines.push('');continue;}
  const tokens=paragraph.match(/\S+\s*|\s+/gu)||[paragraph];let line='';
  const add=part=>{if(line)lines.push(line.trimEnd());line=part;};
  for(let token of tokens){
   if(ctx.measureText(line+token).width<=maxW){line+=token;continue;}
   if(line)add('');
   if(ctx.measureText(token).width<=maxW){line=token;continue;}
   for(const ch of token){if(line&&ctx.measureText(line+ch).width>maxW)add('');line+=ch;}
  }
  lines.push(line.trimEnd());
 }
 return lines.length?lines:[''];
}
function measure(ctx,n,w){
 if(n.kind==='text'){
  const lines=wrap(ctx,n.value,w,n.size,n.weight);return {height:lines.length*(n.lineHeight||n.size*1.47),lines};
 }
 if(n.kind==='panel'){
  const inner=measure(ctx,stack(n.children,n.gap),w-n.pad*2);return {height:inner.height+n.pad*2,inner};
 }
 if(n.kind==='stack'){
  const children=n.children.map(x=>measure(ctx,x,w));return {height:children.reduce((v,x)=>v+x.height,0)+Math.max(0,children.length-1)*n.gap,children};
 }
 if(n.kind==='columns'){
  const gap=n.gap,widths=columnWidths(w,n.weights,n.children.length,gap);
  const children=n.children.map((x,i)=>measure(ctx,x,widths[i]));return {height:Math.max(0,...children.map(x=>x.height)),children,widths};
 }
 return {height:0};
}
function columnWidths(w,weights,count,gap){const ws=weights.length===count?weights:Array(count).fill(1),total=ws.reduce((a,b)=>a+b,0);return ws.map(v=>(w-gap*(count-1))*v/total);}
function round(ctx,x,y,w,h,r,fill,stroke){
 ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(r,w/2,h/2));if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
}
function draw(ctx,n,x,y,w,m){
 if(n.kind==='text'){
  font(ctx,n);ctx.fillStyle=n.color||C.ink;ctx.textBaseline='top';
  const lh=n.lineHeight||n.size*1.47;m.lines.forEach((line,i)=>ctx.fillText(line,x,y+i*lh));return;
 }
 if(n.kind==='panel'){
  round(ctx,x,y,w,m.height,n.radius,n.bg,n.border);
  draw(ctx,stack(n.children,n.gap),x+n.pad,y+n.pad,w-n.pad*2,m.inner);return;
 }
 if(n.kind==='stack'){
  n.children.forEach((child,i)=>{draw(ctx,child,x,y,w,m.children[i]);y+=m.children[i].height+n.gap;});return;
 }
 if(n.kind==='columns'){
  n.children.forEach((child,i)=>{draw(ctx,child,x,y,m.widths[i],m.children[i]);x+=m.widths[i]+n.gap;});
 }
}
function renderBlock(lesson,block,index){
 const c=document.createElement('canvas'),ctx=c.getContext('2d',{alpha:false});
 if(!ctx)throw new Error('Canvas 2D를 사용할 수 없습니다.');
 const layout=buildBlock(lesson,block,index),m=measure(ctx,layout,CW);
 const height=Math.ceil(m.height+M*2+64);
 if(height>12000)throw new Error('학습카드가 너무 깁니다. 내용을 여러 블록으로 나누어 주세요.');
 c.width=W;c.height=height;
 ctx.fillStyle=C.paper;ctx.fillRect(0,0,W,height);
 draw(ctx,layout,M,M,CW,m);
 ctx.fillStyle=C.line;ctx.fillRect(M,height-45,CW,1);
 font(ctx,{size:16,weight:400});ctx.fillStyle=C.muted;ctx.textBaseline='top';
 ctx.fillText('HLL · Hmseodam Learning Lab',M,height-32);
 ctx.textAlign='right';ctx.fillText(`${String(index+1).padStart(2,'0')} / ${lesson.blocks.length}`,W-M,height-32);ctx.textAlign='left';
 return c;
}
function renderAll(lesson,progress){
 const blocks=arr(lesson.blocks);if(!blocks.length)throw new Error('저장할 학습카드가 없습니다.');
 const out=[];for(let i=0;i<blocks.length;i++){progress?.(`학습카드 구성 중 · ${i+1}/${blocks.length}`);out.push(renderBlock(lesson,blocks[i],i));}return out;
}
function blob(canvas,type,quality){return new Promise((ok,fail)=>canvas.toBlob(b=>b?ok(b):fail(new Error('이미지 인코딩에 실패했습니다.')),type,quality));}
function download(b,name){const url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function concat(...parts){let len=0;for(const p of parts)len+=p.length;const result=new Uint8Array(len);let i=0;for(const p of parts){result.set(p,i);i+=p.length;}return result;}
function pdfFromJpegs(images){
 const objects=[];const add=content=>{objects.push(content);return objects.length;};
 const catalog=add(''),pages=add(''),pageRefs=[];
 for(const im of images){
  const w=im.width,h=im.height,landscape=w/h>1.18,pw=landscape?841.89:595.28,ph=landscape?595.28:841.89;
  const scale=Math.min((pw-56)/w,(ph-56)/h),dw=w*scale,dh=h*scale,x=(pw-dw)/2,y=(ph-dh)/2;
  const imageRef=add({dict:`/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,data:im.data});
  const commands=`q\n${dw.toFixed(4)} 0 0 ${dh.toFixed(4)} ${x.toFixed(4)} ${y.toFixed(4)} cm\n/Im1 Do\nQ\n`;
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
async function exportLesson(lesson,format,progress,save=download){
 const base=fileBase(lesson.metadata||{}),blocks=arr(lesson.blocks);
 if(!blocks.length)throw new Error('저장할 학습카드가 없습니다.');
 const zip=(format==='png'||format==='jpg')?new global.JSZip():null;
 const images=[];
 for(let i=0;i<blocks.length;i++){
  progress?.(`학습카드 생성 중 · ${i+1}/${blocks.length}`);
  const canvas=renderBlock(lesson,blocks[i],i);
  const mime=format==='png'?'image/png':'image/jpeg';
  const b=await blob(canvas,mime,.92);
  if(zip)zip.file(`${base}_${String(i+1).padStart(2,'0')}.${format}`,b);
  else images.push({width:canvas.width,height:canvas.height,data:new Uint8Array(await b.arrayBuffer())});
  canvas.width=0;canvas.height=0;
  await new Promise(r=>requestAnimationFrame(r));
 }
 if(zip){
  const result=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
  save(result,`${base}_${format.toUpperCase()}.zip`);return result;
 }
 if(format==='pdf'){
  const result=pdfFromJpegs(images);save(result,`${base}.pdf`);return result;
 }
 if(format==='docx'){
  const result=await docxFromImages(images,base);save(result,`${base}.docx`);return result;
 }
 throw new Error('지원하지 않는 파일 형식입니다.');
}

global.HLLExport={exportLesson,renderAll,fileBase,version:'7.0.0'};
})(window);
