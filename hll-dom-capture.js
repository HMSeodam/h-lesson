/* HLL DOM capture — preserves the actual rendered HTML/CSS in an SVG image.
   No external assets or network services are required by this module. */
(function(global){
'use strict';
const SVG='http://www.w3.org/2000/svg';
const XHTML='http://www.w3.org/1999/xhtml';
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const escaped=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

async function imageData(url,doc){
  if(!url||url.startsWith('data:'))return url;
  const absolute=new URL(url,doc.baseURI).href;
  const response=await fetch(absolute,{mode:'cors',credentials:'same-origin'});
  if(!response.ok)throw new Error('이미지 파일을 읽을 수 없습니다: '+absolute);
  const blob=await response.blob();
  return await new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
  });
}
async function inlineUrls(value,doc,cache){
  if(!value||value==='none'||!value.includes('url('))return value;
  const re=/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g;
  const matches=[...value.matchAll(re)];let result=value;
  for(const match of matches){
    const url=(match[1]??match[2]??match[3]).trim();
    if(!cache.has(url))cache.set(url,imageData(url,doc));
    const data=await cache.get(url);
    result=result.replace(match[0],'url("'+data+'")');
  }
  return result;
}
function styleText(style){
  let result='';
  for(let i=0;i<style.length;i++){
    const name=style[i],value=style.getPropertyValue(name);
    if(value)result+=name+':'+value+';';
  }
  return result;
}
async function cloneStyled(source,doc,cache,rules,counter){
  if(source.nodeType===3)return doc.createTextNode(source.nodeValue);
  if(source.nodeType!==1)return doc.createTextNode('');
  const tag=source.localName;
  if(['script','style','link','iframe','canvas'].includes(tag)){
    if(tag==='canvas'){
      const image=doc.createElementNS(XHTML,'img');image.setAttribute('src',source.toDataURL('image/png'));
      image.setAttribute('width',source.width);image.setAttribute('height',source.height);return image;
    }
    return doc.createTextNode('');
  }
  const clone=doc.createElementNS(XHTML,tag);
  for(const attr of source.attributes){
    if(!attr.name.startsWith('on'))clone.setAttribute(attr.name,attr.value);
  }
  const computed=source.ownerDocument.defaultView.getComputedStyle(source);
  const declarations=[];
  for(let i=0;i<computed.length;i++){
    const name=computed[i];let value=computed.getPropertyValue(name);
    if(name==='background-image'||name==='mask-image'||name==='border-image-source')value=await inlineUrls(value,source.ownerDocument,cache);
    declarations.push(name+':'+value+';');
  }
  clone.setAttribute('style',declarations.join(''));
  if(tag==='img')clone.setAttribute('src',await imageData(source.currentSrc||source.src,source.ownerDocument));
  if(tag==='input'){clone.setAttribute('value',source.value);if(source.checked)clone.setAttribute('checked','checked');}
  if(tag==='textarea')clone.textContent=source.value;
  if(tag==='select')for(const option of clone.options||[])option.selected=option.value===source.value;
  for(const pseudo of ['::before','::after']){
    const s=source.ownerDocument.defaultView.getComputedStyle(source,pseudo);
    if(!s||s.content==='none'||s.content==='normal'||s.display==='none')continue;
    const id='hll-capture-'+(++counter.value);
    clone.classList.add(id);
    let css=styleText(s);
    css=await inlineUrls(css,source.ownerDocument,cache);
    rules.push('.'+id+pseudo+'{'+css+'}');
  }
  for(const child of source.childNodes)clone.appendChild(await cloneStyled(child,doc,cache,rules,counter));
  return clone;
}
async function capture(element,opt={}){
  const rect=element.getBoundingClientRect();
  const width=Math.ceil(opt.width||rect.width),height=Math.ceil(opt.height||rect.height);
  const scale=opt.scale||1.5;
  if(width<=0||height<=0)throw new Error('캡처할 카드의 크기가 올바르지 않습니다.');
  if(width*height*scale*scale>100000000)throw new Error('학습카드가 너무 큽니다. 내용을 여러 블록으로 나누어 주세요.');
  const doc=document.implementation.createDocument(XHTML,'div');
  const rules=[],cache=new Map();
  const clone=await cloneStyled(element,doc,cache,rules,{value:0});
  clone.style.setProperty('position','relative','important');
  clone.style.setProperty('margin','0','important');
  clone.style.setProperty('transform','none','important');
  clone.style.setProperty('width',width+'px','important');
  clone.style.setProperty('height',height+'px','important');
  const svg=document.createElementNS(SVG,'svg');
  svg.setAttribute('xmlns',SVG);svg.setAttribute('width',width);svg.setAttribute('height',height);
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  const style=document.createElementNS(SVG,'style');style.textContent=rules.join('\n');svg.appendChild(style);
  const foreign=document.createElementNS(SVG,'foreignObject');foreign.setAttribute('width','100%');foreign.setAttribute('height','100%');
  foreign.appendChild(clone);svg.appendChild(foreign);
  const source=new XMLSerializer().serializeToString(svg);
  const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source);
  let image;
  try{
    image=new Image();image.src=url;
    if(image.decode)await image.decode();else await new Promise((ok,fail)=>{image.onload=ok;image.onerror=fail;});
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(width*scale);canvas.height=Math.ceil(height*scale);
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas 2D를 사용할 수 없습니다.');
    ctx.fillStyle=opt.background||'#fffdf8';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.scale(scale,scale);ctx.drawImage(image,0,0,width,height);
    return canvas;
  }catch(error){throw new Error('웹 카드 이미지 변환에 실패했습니다: '+(error.message||error));}
  finally{}
}
global.HLLDomCapture={capture,version:'1.0.0'};
})(window);
