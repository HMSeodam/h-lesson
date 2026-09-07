/* HLL mobile layout v6 */
document.documentElement.dataset.hllVersion='7.0.0';
const state={index:null,lesson:null,mode:'overview',learnIndex:0,answers:{}};
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const safe=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

async function init(){
  const params=new URLSearchParams(location.search);
  if(params.get('view')==='infographic') document.body.classList.add('infographic-only');
  const indexResp=await fetch('content-index.json');state.index=await indexResp.json();
  setupSelectors(); bindGlobal(); await loadSelected();
}

function setupSelectors(){
  const s=$('#schoolSelect'),y=$('#yearSelect'),m=$('#semesterSelect'),c=$('#courseSelect'),w=$('#weekSelect');
  fill(s,[...new Set(state.index.entries.map(x=>x.school))]);
  const refreshYears=()=>{fill(y,[...new Set(filtered({school:s.value}).map(x=>x.year))]);refreshSem();};
  const refreshSem=()=>{fill(m,[...new Set(filtered({school:s.value,year:y.value}).map(x=>x.semester))]);refreshCourse();};
  const refreshCourse=()=>{fill(c,[...new Set(filtered({school:s.value,year:y.value,semester:m.value}).map(x=>x.course))]);refreshWeek();};
  const refreshWeek=()=>{const items=filtered({school:s.value,year:y.value,semester:m.value,course:c.value});w.innerHTML=items.map(x=>`<option value="${safe(x.week)}">${safe(x.week)}주차 · ${safe(x.title)}</option>`).join('');updateMobileFilterSummary();};
  s.onchange=async()=>{refreshYears();await loadSelected()};y.onchange=async()=>{refreshSem();await loadSelected()};m.onchange=async()=>{refreshCourse();await loadSelected()};c.onchange=async()=>{refreshWeek();await loadSelected()};w.onchange=loadSelected;
  refreshYears();updateMobileFilterSummary();
}
function filtered(obj){return state.index.entries.filter(x=>Object.entries(obj).every(([k,v])=>x[k]===v));}
function fill(el,vals){el.innerHTML=vals.map(v=>`<option>${safe(v)}</option>`).join('');}
async function loadSelected(){
  const e=filtered({school:$('#schoolSelect').value,year:$('#yearSelect').value,semester:$('#semesterSelect').value,course:$('#courseSelect').value,week:$('#weekSelect').value})[0]||state.index.entries[0];
  if(!e)return; $('#loading').style.display='block';
  const r=await fetch(e.lessonPath);state.lesson=await r.json();state.learnIndex=0;state.answers={};$('#loading').style.display='none';render();updateProgress();updateMobileFilterSummary();
}
function bindGlobal(){
  $$('.mode-btn').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;$$('.mode-btn').forEach(x=>x.classList.toggle('active',x===b));render()});
  $('#themeBtn').onclick=()=>{document.body.classList.toggle('dark');$('#themeBtn').textContent=document.body.classList.contains('dark')?'라이트 모드':'다크 모드'};
  $('#resetProgress').onclick=()=>{if(!state.lesson)return;localStorage.removeItem(progressKey());state.learnIndex=0;render();updateProgress()};
  const filterToggle=$('#mobileFilterToggle');
  if(filterToggle){filterToggle.onclick=()=>{const sidebar=document.querySelector('.sidebar');const open=sidebar.classList.toggle('filters-open');filterToggle.setAttribute('aria-expanded',String(open));};}
  bindExportControls();
}

function updateMobileFilterSummary(){
  const el=$('#mobileFilterSummary');if(!el)return;
  const school=$('#schoolSelect')?.value||'학교';
  const course=$('#courseSelect')?.value||'과목';
  const week=$('#weekSelect')?.value||'';
  el.textContent=`${school} · ${course}${week?` · ${week}주차`:''}`;
  updateExportFilenamePreview();
}

function progressKey(){const m=state.lesson.metadata;return `hll:${m.school}:${m.year}:${m.semester}:${m.course}:${m.week}`;}
function setProgress(v){localStorage.setItem(progressKey(),String(v));updateProgress();}
function getProgress(){return Number(localStorage.getItem(progressKey())||0)}
function updateProgress(){if(!state.lesson)return;const p=Math.max(getProgress(),Math.round(((state.learnIndex+1)/(state.lesson.blocks.length))*100));$('#progressText').textContent=`${Math.min(100,p)}%`;$('#progressBar').style.width=`${Math.min(100,p)}%`;}
function render(){
  if(!state.lesson)return;
  if(state.mode==='quiz') renderQuiz();
  else renderLesson(state.mode==='learn');
}
function banner(){
  const m=state.lesson.metadata;
  return `<div class="lesson-banner"><div class="week">WEEK ${safe(m.week)}</div><div><div class="title">${safe(m.course)} · ${safe(m.title)}</div><div class="desc">${safe(m.school)} · ${safe(m.year)} · ${safe(m.semester)} · 출처 ${safe(m.sourceSection)}</div></div></div>`;
}
function renderLesson(learn=false){
  const blocks=state.lesson.blocks||[];
  let html=banner()+`<div class="${learn?'learn-stack':''}">`;
  blocks.forEach((b,i)=>{if(learn && i>state.learnIndex)return;html+=renderBlock(b,learn&&i===state.learnIndex,i)});
  html+='</div>';
  if(learn){
    html+=`<div class="learn-controls"><button class="next-btn secondary" id="prevLearn" ${state.learnIndex===0?'disabled':''}>← 이전</button><button class="next-btn" id="nextLearn">${state.learnIndex>=blocks.length-1?'학습 완료':'다음 내용 →'}</button></div>`;
  }
  $('#content').innerHTML=html;
  bindInteractiveBlocks();
  if(learn){
    $('#prevLearn').onclick=()=>{state.learnIndex=Math.max(0,state.learnIndex-1);render();scrollActive()};
    $('#nextLearn').onclick=()=>{if(state.learnIndex<blocks.length-1){state.learnIndex++;setProgress(Math.round(((state.learnIndex+1)/blocks.length)*100));render();scrollActive()}else{setProgress(100);state.mode='quiz';$$('.mode-btn').forEach(x=>x.classList.toggle('active',x.dataset.mode==='quiz'));render();}};
  }
}
function scrollActive(){setTimeout(()=>document.querySelector('.active-learn')?.scrollIntoView({behavior:'smooth',block:'center'}),50)}
function token(v){return String(v||'default').toLowerCase().replace(/[^a-z0-9_-]+/g,'-')}
function autoVariant(type,i){
  const map={
    HERO:['calm','poster','editorial'],
    COMPARE:['dual-lens','debate','stacked-contrast','mirror'],
    QUOTE:['manuscript','focus','margin-note'],
    FLOW:['path','ladder','ribbon'],
    CONCEPT_MAP:['orbit','constellation','hub'],
    SPECTRUM:['axis','thermometer','steps'],
    CAUSE_EFFECT:['bridge','fan-in','chain'],
    CHECKPOINT:['soft','focus','compact'],
    RECAP:['magazine','checklist','bento'],
    TIMELINE:['rail','cards','compact'],
    BENTO:['bento','mosaic','feature'],
    BENTO_SUMMARY:['bento','mosaic','feature'],
    BIG_IDEA:['poster','claim','editorial'],
    TERM_DECK:['flash','dictionary','chips'],
    MISCONCEPTION:['flip','contrast','alert'],
    STEP_PATH:['path','ladder','ribbon'],
    KEY_CONCEPTS:['cards','bento','minimal'],
    QUESTION_LADDER:['ladder','seminar','reflection']
  };
  const arr=map[type]||['default','alternate','quiet'];
  return arr[i%arr.length];
}
function blockClasses(b,active=false,i=0){
  const t=token(b.type);
  const v=token(b.variant||b.layout||autoVariant(b.type,i));
  const tone=token(b.tone||state.lesson?.design?.tone||'calm');
  return `block block-${t} variant-${v} tone-${tone} ${active?'active-learn':''}`;
}
function blockHead(b){
  const kicker=b.kicker?`<div class="block-kicker">${safe(b.kicker)}</div>`:'';
  return `<div class="block-head"><div>${kicker}<h2>${safe(b.title||'')}</h2>${b.message?`<p class="block-message">${safe(b.message)}</p>`:''}</div>${b.sourceRef?`<span class="source-ref">${safe(b.sourceRef)}</span>`:''}</div>`;
}
function renderBlock(b,active=false,i=0){
  const cls=blockClasses(b,active,i);
  switch(b.type){
    case'HERO':return renderHero(b,active,i);
    case'COMPARE':return `<section class="${cls}" id="${safe(b.id)}">${blockHead(b)}<div class="compare-grid">${compareSide(b.left)}<div class="versus">vs.</div>${compareSide(b.right)}</div></section>`;
    case'QUOTE':return `<section class="${cls} quote-block" id="${safe(b.id)}">${blockHead(b)}<div class="big-quote">${safe(b.quote)}</div><div class="quote-caption">${safe(b.caption)}</div></section>`;
    case'FLOW':return renderFlow(b,cls);
    case'STEP_PATH':return renderFlow({...b,steps:b.steps||b.items||[]},cls);
    case'CHECKPOINT':return renderCheckpoint(b,cls);
    case'CONCEPT_MAP':return renderConceptMap(b,cls);
    case'SPECTRUM':return renderSpectrum(b,cls);
    case'CAUSE_EFFECT':return renderCauseEffect(b,cls);
    case'RECAP':return renderRecap(b,cls);
    case'TIMELINE':return renderTimeline(b,cls);
    case'BENTO':case'BENTO_SUMMARY':return renderBento(b,cls);
    case'BIG_IDEA':return renderBigIdea(b,cls);
    case'TERM_DECK':return renderTermDeck(b,cls);
    case'MISCONCEPTION':return renderMisconception(b,cls);
    case'KEY_CONCEPTS':return renderKeyConcepts(b,cls);
    case'QUESTION_LADDER':return renderQuestionLadder(b,cls);
    default:return renderGeneric(b,cls);
  }
}
function renderHero(b,active=false,i=0){
  const v=token(b.variant||autoVariant('HERO',i));
  return `<section class="hero variant-${v} ${active?'active-learn':''}" id="${safe(b.id)}"><div class="eyebrow">${safe(b.eyebrow)}</div><h1>${safe(b.title)}</h1><p>${safe(b.subtitle)}</p><div class="core-question"><b>핵심 질문</b> ${safe(b.coreQuestion)}</div></section>`;
}
function compareSide(s={}){
  const items=s.items||[];
  return `<div class="compare-side"><h3>${safe(s.title)}</h3>${s.tag?`<span class="tag">${safe(s.tag)}</span>`:''}<div class="compare-items">${items.map(x=>`<div class="compare-item"><strong>${safe(x.label)}</strong><span>${safe(x.value)}</span></div>`).join('')}</div></div>`;
}
function renderFlow(b,cls){
  const steps=b.steps||b.items||[];
  return `<section class="${cls}" id="${safe(b.id)}">${blockHead(b)}<div class="flow-grid">${steps.map((s,i)=>`<div class="flow-card"><div class="flow-content"><div class="kicker">${safe(s.kicker||s.step||`STEP ${i+1}`)}</div><h3>${safe(s.title||s.label)}</h3><p>${safe(s.text||s.description||s.value)}</p></div></div>`).join('')}</div></section>`;
}

function renderCheckpoint(b,cls){
  const choices=b.choices||[];
  return `<section class="${cls} checkpoint" id="${safe(b.id)}" data-checkpoint><span class="checkpoint-badge">CHECK POINT</span><h3>${safe(b.question)}</h3><div class="choices">${choices.map((x,i)=>`<button class="quiz-option" data-choice="${i}"><span class="choice-no">${i+1}</span><span>${safe(x)}</span></button>`).join('')}</div><div class="explanation">${safe(b.explanation)}</div></section>`;
}
function conceptNodeClass(n,i){
  if(n.role)return token(n.role);
  if(n.id==='self'||n.center)return 'center';
  if(n.id==='zen')return 'left';
  if(n.id==='yoga'||n.id==='yusik')return 'right';
  if(n.id==='practice')return 'bottom';
  return ['left','center','right','bottom','extra'][i]||'extra';
}
function renderConceptMap(b,cls){
  const nodes=b.nodes||[];
  const center=nodes.find(n=>n.role==='center'||n.id==='self'||n.center);
  const ordered=center?[center,...nodes.filter(n=>n!==center)]:nodes;
  const outer=ordered.filter(n=>n!==center);
  const spans=balancedSpans(outer.length,3);
  const edges=b.edges||[];
  const edgeText=edges.length?`<div class="concept-relations">${edges.map(e=>`<span>${safe(labelFor(nodes,e.from))} <b>${safe(e.relation||'→')}</b> ${safe(labelFor(nodes,e.to))}</span>`).join('')}</div>`:'';
  return `<section class="${cls}" id="${safe(b.id)}">${blockHead(b)}<div class="concept-canvas">${ordered.map(n=>{const central=n===center;const i=outer.indexOf(n);return `<div class="concept-node ${conceptNodeClass(n,i)}" style="--tile-span:${central?12:spans[i]}"><h3>${safe(n.label)}</h3><p>${safe(n.description)}</p></div>`}).join('')}</div>${edgeText}</section>`;
}
function labelFor(nodes,id){return (nodes.find(n=>n.id===id)||{}).label||id||''}
function renderSpectrum(b,cls){
  const items=b.items||[];
  return `<section class="${cls}" id="${safe(b.id)}">${blockHead(b)}<div class="spectrum-wrap"><div class="spectrum-desktop"><div class="spectrum-labels"><span>${safe(b.leftLabel)}</span><span>${safe(b.rightLabel)}</span></div><div class="spectrum-line">${items.map(x=>`<div class="spectrum-dot" style="left:${Number(x.position)||50}%"><div class="spectrum-note"><strong>${safe(x.label)}</strong><span>${safe(x.note)}</span></div></div>`).join('')}</div></div><div class="spectrum-mobile"><div class="spectrum-mobile-labels"><span>${safe(b.leftLabel)}</span><span>${safe(b.rightLabel)}</span></div>${items.map((x,i)=>`<div class="spectrum-mobile-item"><span class="spectrum-mobile-index">${i+1}</span><div><strong>${safe(x.label)}</strong><p>${safe(x.note)}</p></div></div>`).join('')}</div><div class="spectrum-footer">${safe(b.footer)}</div></div></section>`;
}
function renderCauseEffect(b,cls){
  const causes=b.causes||[];
  return `<section class="${cls}" id="${safe(b.id)}">${blockHead(b)}<div class="cause-grid"><div class="cause-col">${causes.map(x=>`<div class="cause-card"><h3>${safe(x.title)}</h3><p>${safe(x.text||x.description)}</p></div>`).join('')}</div><div class="arrow-col">→</div><div class="bridge-card"><h3>${safe(b.bridge?.title||'과정')}</h3><p>${safe(b.bridge?.text||'')}</p></div><div class="arrow-col">→</div><div class="result-card"><h3>${safe(b.result?.title||'결과')}</h3><p>${safe(b.result?.text||'')}</p></div></div></section>`;
}
function renderRecap(b,cls){
  const remembers=b.mustRemember||b.items||[];
  return `<section class="${cls}" id="${safe(b.id)}">${blockHead(b)}<div class="recap-grid"><div class="remember-list">${remembers.map((x,i)=>`<div class="remember"><div class="num">${i+1}</div><p>${safe(x)}</p></div>`).join('')}</div><div><div class="keyword-box"><h3>KEY WORDS</h3><div class="chips">${(b.keywords||[]).map(x=>`<span class="chip">${safe(x)}</span>`).join('')}</div></div><div class="relation-card"><small>핵심 관계</small>${safe(b.coreRelation)}</div></div></div></section>`;
}
function renderTimeline(b,cls){
  const items=b.items||[];
  return `<section class="${cls}" id="${safe(b.id)}">${blockHead(b)}<div class="timeline-list">${items.map((x,i)=>`<div class="timeline-item"><div class="timeline-date">${safe(x.date||x.kicker||`#${i+1}`)}</div><div><h3>${safe(x.title)}</h3><p>${safe(x.description||x.text)}</p></div></div>`).join('')}</div></section>`;
}

function balancedSpans(count,maxColumns=4,weights=[]){
  if(!count)return [];
  const rows=Math.ceil(count/maxColumns);
  const base=Math.floor(count/rows), extra=count%rows;
  const spans=[];
  let index=0;
  for(let r=0;r<rows;r++){
    const n=base+(r<extra?1:0);
    const rowWeights=Array.from({length:n},(_,i)=>Math.max(1,weights[index+i]||1));
    const total=rowWeights.reduce((a,b)=>a+b,0);
    const raw=rowWeights.map(w=>12*w/total);
    const sizes=raw.map(v=>Math.floor(v));
    let remain=12-sizes.reduce((a,b)=>a+b,0);
    const order=raw.map((v,i)=>({i,f:v-Math.floor(v)})).sort((a,b)=>b.f-a.f);
    for(let k=0;k<remain;k++)sizes[order[k].i]++;
    spans.push(...sizes);
    index+=n;
  }
  return spans;
}

function renderBento(b,cls){
  const items=b.items||b.cards||[];
  const spans=balancedSpans(items.length,3,items.map(x=>x.size==='wide'?2:1));
  return `<section class="${cls}" id="${safe(b.id)}">${blockHead(b)}<div class="bento-grid">${items.map((x,i)=>`<article class="bento-card bento-${token(x.size||'small')}" style="--tile-span:${spans[i]}"><small>${safe(x.kicker||x.label||`POINT ${i+1}`)}</small><h3>${safe(x.title)}</h3><p>${safe(x.text||x.description||x.value)}</p></article>`).join('')}</div></section>`;
}
function renderBigIdea(b,cls){
  const evidence=b.evidence||b.items||[];
  return `<section class="${cls}" id="${safe(b.id)}">${blockHead(b)}<div class="bigidea-layout"><div class="bigidea-claim"><small>BIG IDEA</small><h3>${safe(b.claim||b.main||b.title)}</h3><p>${safe(b.explain||b.description||b.message)}</p></div><div class="bigidea-evidence">${evidence.map((x,i)=>`<div><span>${String(i+1).padStart(2,'0')}</span><p>${safe(typeof x==='string'?x:(x.text||x.description||x.title))}</p></div>`).join('')}</div></div></section>`;
}
function renderTermDeck(b,cls){
  const terms=b.terms||b.items||[];
  const spans=balancedSpans(terms.length,4);
  return `<section class="${cls}" id="${safe(b.id)}">${blockHead(b)}<div class="term-grid">${terms.map((t,i)=>`<article class="term-card" style="--tile-span:${spans[i]}"><h3>${safe(t.term||t.title||t.label)}</h3>${t.original?`<small>${safe(t.original)}</small>`:''}<p>${safe(t.definition||t.description||t.text)}</p></article>`).join('')}</div></section>`;
}
function renderMisconception(b,cls){
  const items=b.items||[];
  return `<section class="${cls}" id="${safe(b.id)}">${blockHead(b)}<div class="mis-grid">${items.map(x=>`<article class="mis-card"><div class="mis-before"><small>오해</small><p>${safe(x.misconception||x.before||x.myth)}</p></div><div class="mis-after"><small>다시 보기</small><p>${safe(x.correction||x.after||x.reframe)}</p></div></article>`).join('')}</div></section>`;
}
function renderKeyConcepts(b,cls){
  const cards=b.cards||b.items||[];
  return `<section class="${cls}" id="${safe(b.id)}">${blockHead(b)}<div class="keyconcept-grid">${cards.map((x,i)=>`<article class="keyconcept-card"><span>${i+1}</span><h3>${safe(x.title||x.term||x.label)}</h3><p>${safe(x.description||x.text||x.value)}</p></article>`).join('')}</div></section>`;
}
function renderQuestionLadder(b,cls){
  const items=b.items||b.questions||[];
  return `<section class="${cls}" id="${safe(b.id)}">${blockHead(b)}<div class="ladder-list">${items.map((x,i)=>`<div class="ladder-item"><div class="ladder-step">Q${i+1}</div><div><h3>${safe(x.question||x.title)}</h3><p>${safe(x.answer||x.text||x.description)}</p></div></div>`).join('')}</div></section>`;
}
function renderGeneric(b,cls){
  const items=b.items||b.cards||b.points||[];
  return `<section class="${cls}" id="${safe(b.id)}">${blockHead(b)}<div class="generic-grid">${items.map((x,i)=>`<article><strong>${safe(x.title||x.label||`POINT ${i+1}`)}</strong><p>${safe(x.text||x.description||x.value||x)}</p></article>`).join('')}</div></section>`;
}
function bindInteractiveBlocks(){
  document.querySelectorAll('[data-checkpoint]').forEach(el=>{
    const id=el.id,b=state.lesson.blocks.find(x=>x.id===id);
    if(!b)return;
    el.querySelectorAll('.quiz-option').forEach(btn=>btn.onclick=()=>{
      const i=Number(btn.dataset.choice);
      el.querySelectorAll('.quiz-option').forEach((x,j)=>{x.disabled=true;if(j===b.answer)x.classList.add('correct');else if(j===i)x.classList.add('wrong')});
      el.querySelector('.explanation')?.classList.add('show');
      setProgress(Math.max(getProgress(),45));
    });
  });
}
function renderQuiz(){
  const q=state.lesson.finalQuiz?.questions||[];
  let html=banner()+`<div class="quiz-shell"><section class="quiz-intro"><div class="eyebrow">FINAL QUIZ</div><h1>${safe(state.lesson.finalQuiz?.title||'종합 퀴즈')}</h1><p>문제 유형을 섞어 핵심 개념, 관계, 흐름을 다시 확인합니다. 틀린 문제는 관련 학습 블록으로 돌아갈 수 있습니다.</p></section>`;
  q.forEach((x,i)=>{
    const variant=token(x.variant||x.category||(['concept','compare','relation','short'][i%4]));
    html+=`<section class="quiz-card quiz-variant-${variant}" id="quiz-${safe(x.id)}"><div class="quiz-meta"><span class="quiz-number">Q${i+1}</span><span>${x.type==='multiple_choice'?'객관식':'주관식'}</span></div><h3>${safe(x.question)}</h3>`;
    if(x.type==='multiple_choice') html+=`<div class="choices quiz-choice-grid">${(x.choices||[]).map((c,j)=>`<button class="quiz-option final-option" data-qid="${safe(x.id)}" data-choice="${j}"><span class="choice-no">${j+1}</span><span>${safe(c)}</span></button>`).join('')}</div>`;
    else html+=`<input class="short-input" data-qid="${safe(x.id)}" placeholder="답을 입력하세요" /><div class="quiz-actions"><button class="next-btn" data-short-check="${safe(x.id)}">정답 확인</button></div>`;
    html+=`<div class="explanation" id="ex-${safe(x.id)}"></div></section>`;
  });
  html+=`<section class="quiz-result" id="quizResult"><div class="eyebrow">현재 점수</div><div class="score" id="scoreText">0 / ${q.length}</div><p id="scoreDesc">문제를 풀면 점수가 계산됩니다.</p><div class="retry-links" id="retryLinks"></div></section></div>`;
  $('#content').innerHTML=html;
  bindQuiz();updateScore();
}
function bindQuiz(){
  document.querySelectorAll('.final-option').forEach(btn=>btn.onclick=()=>{
    const q=getQ(btn.dataset.qid),choice=Number(btn.dataset.choice);if(!q)return;
    state.answers[q.id]={correct:choice===q.answer};
    const card=btn.closest('.quiz-card');
    card.querySelectorAll('.final-option').forEach((x,j)=>{x.disabled=true;if(j===q.answer)x.classList.add('correct');else if(j===choice)x.classList.add('wrong')});
    showEx(q,state.answers[q.id].correct);updateScore();
  });
  document.querySelectorAll('[data-short-check]').forEach(btn=>btn.onclick=()=>{
    const q=getQ(btn.dataset.shortCheck),input=document.querySelector(`.short-input[data-qid="${q?.id}"]`);if(!q||!input)return;
    const val=input.value.trim();let correct=false;
    if(q.acceptableAnswers?.length)correct=q.acceptableAnswers.some(a=>normalize(a)===normalize(val));
    else if(q.requiredKeywords?.length)correct=q.requiredKeywords.every(k=>normalize(val).includes(normalize(k)));
    state.answers[q.id]={correct};input.style.borderColor=correct?'#72a58b':'#b9716a';showEx(q,correct);updateScore();
  });
}
function normalize(s){return String(s).replace(/\s+/g,'').toLowerCase()}
function getQ(id){return (state.lesson.finalQuiz?.questions||[]).find(x=>x.id===id)}
function showEx(q,correct){const el=$(`#ex-${CSS.escape(q.id)}`);if(!el)return;el.innerHTML=`<strong>${correct?'정답입니다.':'다시 확인해 보세요.'}</strong><br>${safe(q.explanation)} ${q.relatedBlockId?`<button class="text-btn" onclick="jumpBlock('${safeJs(q.relatedBlockId)}')">관련 내용 보기</button>`:''}`;el.classList.add('show')}
function safeJs(s){return String(s??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}
window.jumpBlock=id=>{state.mode='overview';$$('.mode-btn').forEach(x=>x.classList.toggle('active',x.dataset.mode==='overview'));render();setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'center'}),80)};
function updateScore(){
  if(!state.lesson)return;
  const q=state.lesson.finalQuiz?.questions||[],answered=Object.keys(state.answers).length,score=Object.values(state.answers).filter(x=>x.correct).length;
  const el=$('#scoreText');if(!el)return;
  el.textContent=`${score} / ${q.length}`;
  $('#scoreDesc').textContent=answered===q.length?(score>=Math.ceil(q.length*.7)?'핵심 구조를 잘 이해했습니다.':'틀린 문제의 관련 내용을 다시 확인해 보세요.'):`${answered}문항 응답 완료`;
  if(answered===q.length){setProgress(100);const wrong=q.filter(x=>!state.answers[x.id]?.correct);$('#retryLinks').innerHTML=wrong.map(x=>`<button onclick="jumpBlock('${safeJs(x.relatedBlockId)}')">${safe(x.relatedBlockId)} 복습</button>`).join('')}
}

/* ------------------------------------------------------------
   Learning-card export: PNG / JPG / PDF / DOCX
   - The live page can be in any mode. Export always renders all lesson blocks.
   - PNG/JPG are packaged as one ZIP so browsers do not trigger many downloads.
   - PDF and DOCX use one learning card per page for predictable printing.
------------------------------------------------------------- */
function bindExportControls(){
  const openBtn=$('#exportOpenBtn'),modal=$('#exportModal'),startBtn=$('#exportStartBtn');
  if(!openBtn||!modal||!startBtn)return;
  openBtn.onclick=()=>openExportModal();
  modal.querySelectorAll('[data-export-close]').forEach(el=>el.onclick=()=>closeExportModal());
  startBtn.onclick=exportLearningCards;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeExportModal();});
}

function openExportModal(){
  if(!state.lesson)return;
  const modal=$('#exportModal');
  updateExportFilenamePreview();
  $('#exportStatus').textContent='';
  $('#exportStartBtn').disabled=false;
  modal.hidden=false;
  document.body.classList.add('export-modal-open');
  setTimeout(()=>$('#exportFormat')?.focus(),20);
}

function closeExportModal(){
  const modal=$('#exportModal');
  if(!modal||$('#exportStartBtn')?.disabled)return;
  modal.hidden=true;
  document.body.classList.remove('export-modal-open');
}

function exportContext(){
  const school=$('#schoolSelect')?.value||state.lesson?.metadata?.school||'학교';
  const year=$('#yearSelect')?.value||state.lesson?.metadata?.year||'연도';
  const semester=$('#semesterSelect')?.value||state.lesson?.metadata?.semester||'학기';
  const course=$('#courseSelect')?.value||state.lesson?.metadata?.course||'과목';
  const week=$('#weekSelect')?.value||state.lesson?.metadata?.week||'01';
  return {school,year,semester,course,week};
}

function cleanFilenamePart(v){
  return String(v??'')
    .replace(/[\\/:*?"<>|]/g,'-')
    .replace(/\s+/g,'_')
    .replace(/_+/g,'_')
    .replace(/^[-_.]+|[-_.]+$/g,'')||'자료';
}

function exportBaseName(){
  const x=exportContext();
  const weekLabel=/주차/.test(String(x.week))?String(x.week):`${x.week}주차`;
  return [x.school,x.year,x.semester,x.course,weekLabel].map(cleanFilenamePart).join('_');
}

function updateExportFilenamePreview(){
  const el=$('#exportFilenamePreview');
  if(el)el.textContent=exportBaseName();
}

function setExportStatus(msg){
  const el=$('#exportStatus');if(el)el.textContent=msg||'';
}

function exportLibrariesReady(format){
  if(!window.HLLExport || typeof window.HLLExport.exportLesson!=='function')
    return '저장 모듈을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';
  if(typeof window.JSZip!=='function' && format!=='pdf')
    return 'ZIP 모듈을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';
  return '';
}
async function exportLearningCards(){
  if(!state.lesson)return;
  const format=$('#exportFormat')?.value||'pdf';
  const libError=exportLibrariesReady(format);
  if(libError){setExportStatus(libError);return;}
  const btn=$('#exportStartBtn');
  btn.disabled=true;btn.textContent='만드는 중…';
  try{
    const selected={
      school:$('#schoolSelect').value,year:$('#yearSelect').value,
      semester:$('#semesterSelect').value,course:$('#courseSelect').value,
      week:$('#weekSelect').value
    };
    const lesson={...state.lesson,metadata:{...state.lesson.metadata,...selected}};
    await window.HLLExport.exportLesson(lesson,format,setExportStatus);
    setExportStatus('다운로드를 시작했습니다.');
    btn.textContent='다운로드';
  }catch(err){
    console.error('[HLL export]',err);
    setExportStatus(`파일 생성 중 오류가 발생했습니다: ${err.message||err}`);
    btn.textContent='다시 시도';
  }finally{btn.disabled=false;}
}

init().catch(err=>{console.error(err);$('#loading').textContent='자료를 불러오지 못했습니다. 로컬에서는 serve_local.bat로 실행해 주세요.'});
