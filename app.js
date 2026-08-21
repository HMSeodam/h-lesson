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
}
function updateMobileFilterSummary(){
  const el=$('#mobileFilterSummary');if(!el)return;
  const school=$('#schoolSelect')?.value||'학교';
  const course=$('#courseSelect')?.value||'과목';
  const week=$('#weekSelect')?.value||'';
  el.textContent=`${school} · ${course}${week?` · ${week}주차`:''}`;
}
function progressKey(){const m=state.lesson.metadata;return `hll:${m.school}:${m.year}:${m.semester}:${m.course}:${m.week}`;}
function setProgress(v){localStorage.setItem(progressKey(),String(v));updateProgress();}
function getProgress(){return Number(localStorage.getItem(progressKey())||0)}
function updateProgress(){if(!state.lesson)return;const p=Math.max(getProgress(),Math.round(((state.learnIndex+1)/(state.lesson.blocks.length))*100));$('#progressText').textContent=`${Math.min(100,p)}%`;$('#progressBar').style.width=`${Math.min(100,p)}%`;}
function render(){if(!state.lesson)return; if(state.mode==='quiz') renderQuiz(); else renderLesson(state.mode==='learn');}
function banner(){const m=state.lesson.metadata;return `<div class="lesson-banner"><div class="week">WEEK ${safe(m.week)}</div><div><div class="title">${safe(m.course)} · ${safe(m.title)}</div><div class="desc">${safe(m.school)} · ${safe(m.year)} · ${safe(m.semester)} · 출처 ${safe(m.sourceSection)}</div></div></div>`}
function renderLesson(learn=false){
  const blocks=state.lesson.blocks;let html=banner()+`<div class="${learn?'learn-stack':''}">`;
  blocks.forEach((b,i)=>{if(learn && i>state.learnIndex)return;html+=renderBlock(b,learn&&i===state.learnIndex)});html+='</div>';
  if(learn){html+=`<div class="learn-controls"><button class="next-btn secondary" id="prevLearn" ${state.learnIndex===0?'disabled':''}>← 이전</button><button class="next-btn" id="nextLearn">${state.learnIndex>=blocks.length-1?'학습 완료':'다음 내용 →'}</button></div>`}
  $('#content').innerHTML=html;bindInteractiveBlocks();
  if(learn){$('#prevLearn').onclick=()=>{state.learnIndex=Math.max(0,state.learnIndex-1);render();scrollActive()};$('#nextLearn').onclick=()=>{if(state.learnIndex<blocks.length-1){state.learnIndex++;setProgress(Math.round(((state.learnIndex+1)/blocks.length)*100));render();scrollActive()}else{setProgress(100);state.mode='quiz';$$('.mode-btn').forEach(x=>x.classList.toggle('active',x.dataset.mode==='quiz'));render();}}}
}
function scrollActive(){setTimeout(()=>document.querySelector('.active-learn')?.scrollIntoView({behavior:'smooth',block:'center'}),50)}
function blockHead(b){return `<div class="block-head"><div><h2>${safe(b.title||'')}</h2>${b.message?`<p class="block-message">${safe(b.message)}</p>`:''}</div>${b.sourceRef?`<span class="source-ref">${safe(b.sourceRef)}</span>`:''}</div>`}
function renderBlock(b,active=false){const cls=`block ${active?'active-learn':''}`;switch(b.type){
  case'HERO':return `<section class="hero ${active?'active-learn':''}" id="${b.id}"><div class="eyebrow">${safe(b.eyebrow)}</div><h1>${safe(b.title)}</h1><p>${safe(b.subtitle)}</p><div class="core-question"><b>핵심 질문</b> ${safe(b.coreQuestion)}</div></section>`;
  case'COMPARE':return `<section class="${cls}" id="${b.id}">${blockHead(b)}<div class="compare-grid">${compareSide(b.left)}<div class="versus">vs.</div>${compareSide(b.right)}</div></section>`;
  case'QUOTE':return `<section class="${cls} quote-block" id="${b.id}">${blockHead(b)}<div class="big-quote">${safe(b.quote)}</div><div class="quote-caption">${safe(b.caption)}</div></section>`;
  case'FLOW':return `<section class="${cls}" id="${b.id}">${blockHead(b)}<div class="flow-grid">${b.steps.map(s=>`<div class="flow-card"><div class="kicker">${safe(s.kicker)}</div><h3>${safe(s.title)}</h3><p>${safe(s.text)}</p></div>`).join('')}</div></section>`;
  case'CHECKPOINT':return `<section class="${cls} checkpoint" id="${b.id}" data-checkpoint><span class="checkpoint-badge">CHECK POINT</span><h3>${safe(b.question)}</h3><div class="choices">${b.choices.map((x,i)=>`<button class="quiz-option" data-choice="${i}">${i+1}. ${safe(x)}</button>`).join('')}</div><div class="explanation">${safe(b.explanation)}</div></section>`;
  case'CONCEPT_MAP':return `<section class="${cls}" id="${b.id}">${blockHead(b)}<div class="concept-canvas">${b.nodes.map((n,i)=>`<div class="concept-node ${conceptNodeClass(n,i)}"><h3>${safe(n.label)}</h3><p>${safe(n.description)}</p></div>`).join('')}</div></section>`;
  case'SPECTRUM':return `<section class="${cls}" id="${b.id}">${blockHead(b)}<div class="spectrum-wrap"><div class="spectrum-desktop"><div class="spectrum-labels"><span>${safe(b.leftLabel)}</span><span>${safe(b.rightLabel)}</span></div><div class="spectrum-line">${b.items.map(x=>`<div class="spectrum-dot" style="left:${x.position}%"><div class="spectrum-note"><strong>${safe(x.label)}</strong><span>${safe(x.note)}</span></div></div>`).join('')}</div></div><div class="spectrum-mobile"><div class="spectrum-mobile-labels"><span>${safe(b.leftLabel)}</span><span>${safe(b.rightLabel)}</span></div>${b.items.map((x,i)=>`<div class="spectrum-mobile-item"><span class="spectrum-mobile-index">${i+1}</span><div><strong>${safe(x.label)}</strong><p>${safe(x.note)}</p></div></div>`).join('')}</div><div class="spectrum-footer">${safe(b.footer)}</div></div></section>`;
  case'CAUSE_EFFECT':return `<section class="${cls}" id="${b.id}">${blockHead(b)}<div class="cause-grid"><div class="cause-col">${b.causes.map(x=>`<div class="cause-card"><h3>${safe(x.title)}</h3><p>${safe(x.text)}</p></div>`).join('')}</div><div class="arrow-col">→</div><div class="bridge-card"><h3>${safe(b.bridge.title)}</h3><p>${safe(b.bridge.text)}</p></div><div class="arrow-col">→</div><div class="result-card"><h3>${safe(b.result.title)}</h3><p>${safe(b.result.text)}</p></div></div></section>`;
  case'RECAP':return `<section class="${cls}" id="${b.id}">${blockHead(b)}<div class="recap-grid"><div class="remember-list">${b.mustRemember.map((x,i)=>`<div class="remember"><div class="num">${i+1}</div><p>${safe(x)}</p></div>`).join('')}</div><div><div class="keyword-box"><h3>KEY WORDS</h3><div class="chips">${b.keywords.map(x=>`<span class="chip">${safe(x)}</span>`).join('')}</div></div><div class="relation-card"><small>핵심 관계</small>${safe(b.coreRelation)}</div></div></div></section>`;
  default:return '';
}}

function conceptNodeClass(n,i){
  if(n.id==='self') return 'center';
  if(n.id==='zen') return 'left';
  if(n.id==='yoga' || n.id==='yusik') return 'right';
  if(n.id==='practice') return 'bottom';
  return ['left','center','right','bottom'][i]||'';
}

function compareSide(s){return `<div class="compare-side"><h3>${safe(s.title)}</h3><span class="tag">${safe(s.tag)}</span><div class="compare-items">${s.items.map(x=>`<div class="compare-item"><strong>${safe(x.label)}</strong><span>${safe(x.value)}</span></div>`).join('')}</div></div>`}
function bindInteractiveBlocks(){document.querySelectorAll('[data-checkpoint]').forEach(el=>{const id=el.id,b=state.lesson.blocks.find(x=>x.id===id);el.querySelectorAll('.quiz-option').forEach(btn=>btn.onclick=()=>{const i=Number(btn.dataset.choice);el.querySelectorAll('.quiz-option').forEach((x,j)=>{x.disabled=true;if(j===b.answer)x.classList.add('correct');else if(j===i)x.classList.add('wrong')});el.querySelector('.explanation').classList.add('show');setProgress(Math.max(getProgress(),45));});});}

function renderQuiz(){const q=state.lesson.finalQuiz.questions;let html=banner()+`<div class="quiz-shell"><section class="quiz-intro"><div class="eyebrow">FINAL QUIZ</div><h1>${safe(state.lesson.finalQuiz.title)}</h1><p>객관식과 단답형을 함께 풀어보세요. 제출 뒤에는 해설과 관련 학습 블록으로 돌아갈 수 있습니다.</p></section>`;
  q.forEach((x,i)=>{html+=`<section class="quiz-card" id="quiz-${x.id}"><div class="quiz-meta"><span>Q${i+1}</span><span>${x.type==='multiple_choice'?'객관식':'주관식'}</span></div><h3>${safe(x.question)}</h3>`;
    if(x.type==='multiple_choice') html+=`<div class="choices">${x.choices.map((c,j)=>`<button class="quiz-option final-option" data-qid="${x.id}" data-choice="${j}">${j+1}. ${safe(c)}</button>`).join('')}</div>`;
    else html+=`<input class="short-input" data-qid="${x.id}" placeholder="답을 입력하세요" /><div class="quiz-actions"><button class="next-btn" data-short-check="${x.id}">정답 확인</button></div>`;
    html+=`<div class="explanation" id="ex-${x.id}"></div></section>`;
  });html+=`<section class="quiz-result" id="quizResult"><div class="eyebrow">현재 점수</div><div class="score" id="scoreText">0 / ${q.length}</div><p id="scoreDesc">문제를 풀면 점수가 계산됩니다.</p><div class="retry-links" id="retryLinks"></div></section></div>`;
  $('#content').innerHTML=html;bindQuiz();updateScore();}
function bindQuiz(){
  document.querySelectorAll('.final-option').forEach(btn=>btn.onclick=()=>{const q=getQ(btn.dataset.qid),choice=Number(btn.dataset.choice);state.answers[q.id]={correct:choice===q.answer};const card=btn.closest('.quiz-card');card.querySelectorAll('.final-option').forEach((x,j)=>{x.disabled=true;if(j===q.answer)x.classList.add('correct');else if(j===choice)x.classList.add('wrong')});showEx(q,state.answers[q.id].correct);updateScore();});
  document.querySelectorAll('[data-short-check]').forEach(btn=>btn.onclick=()=>{const q=getQ(btn.dataset.shortCheck),input=document.querySelector(`.short-input[data-qid="${q.id}"]`);const val=input.value.trim();let correct=false;if(q.acceptableAnswers?.length)correct=q.acceptableAnswers.some(a=>normalize(a)===normalize(val));else if(q.requiredKeywords?.length)correct=q.requiredKeywords.every(k=>normalize(val).includes(normalize(k)));state.answers[q.id]={correct};input.style.borderColor=correct?'#72a58b':'#b9716a';showEx(q,correct);updateScore();});
}
function normalize(s){return String(s).replace(/\s+/g,'').toLowerCase()}
function getQ(id){return state.lesson.finalQuiz.questions.find(x=>x.id===id)}
function showEx(q,correct){const el=$(`#ex-${q.id}`);el.innerHTML=`<strong>${correct?'정답입니다.':'다시 확인해 보세요.'}</strong><br>${safe(q.explanation)} ${q.relatedBlockId?`<button class="text-btn" onclick="jumpBlock('${q.relatedBlockId}')">관련 내용 보기</button>`:''}`;el.classList.add('show')}
window.jumpBlock=id=>{state.mode='overview';$$('.mode-btn').forEach(x=>x.classList.toggle('active',x.dataset.mode==='overview'));render();setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'center'}),80)};
function updateScore(){if(!state.lesson)return;const q=state.lesson.finalQuiz.questions,answered=Object.keys(state.answers).length,score=Object.values(state.answers).filter(x=>x.correct).length;const el=$('#scoreText');if(!el)return;el.textContent=`${score} / ${q.length}`;$('#scoreDesc').textContent=answered===q.length?(score>=7?'핵심 구조를 잘 이해했습니다.':'틀린 문제의 관련 내용을 다시 확인해 보세요.'):`${answered}문항 응답 완료`;if(answered===q.length){setProgress(100);const wrong=q.filter(x=>!state.answers[x.id]?.correct);$('#retryLinks').innerHTML=wrong.map(x=>`<button onclick="jumpBlock('${x.relatedBlockId}')">${safe(x.relatedBlockId)} 복습</button>`).join('')}}
init().catch(err=>{console.error(err);$('#loading').textContent='자료를 불러오지 못했습니다. 로컬에서는 serve_local.bat로 실행해 주세요.'});
