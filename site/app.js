'use strict';
const STORAGE_KEY = 'embeddedlab:progress:v1';
const THEME_KEY = 'embeddedlab:theme:v1';
const state = {view: 'latest', progressFilter: 'all', groups: [], progress: {}, search: '', topic: ''};
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key = (q) => q.id;
function readProgress(){try { const d=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return d&&typeof d==='object'&&!Array.isArray(d)?d:{};}catch{return {};}}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.progress));}catch{showNotice('无法保存本地进度：请检查浏览器存储空间。');}}
function record(id, patch){state.progress[id]={...(state.progress[id]||{}),...patch};save();render();}
function allQuestions(){return state.groups.flatMap(g=>g.questions);}
function showNotice(msg){$('#notice').textContent=msg;$('#notice').hidden=false;}
function applyTheme(theme){
 const dark=theme==='dark';
 document.documentElement.dataset.theme=dark?'dark':'light';
 const button=$('#theme-toggle');
 button.setAttribute('aria-pressed',String(dark));
 button.setAttribute('aria-label',dark?'切换到浅色主题':'切换到深色主题');
 button.innerHTML=dark?'<span aria-hidden="true">☀</span><span>浅色模式</span>':'<span aria-hidden="true">☾</span><span>深色模式</span>';
 document.querySelector('meta[name="theme-color"]').content=dark?'#111421':'#f8f9fd';
 try{localStorage.setItem(THEME_KEY,dark?'dark':'light');}catch{}
}
function selectStat(target){
 state.search='';state.topic='';
 $('#search').value='';$('#topic-filter').value='';
 if(target==='wrong'){state.view='wrong';state.progressFilter='all';}
 else{state.view='all';state.progressFilter=target==='completed'||target==='incomplete'?target:'all';}
 render();
 $('#section-title').scrollIntoView({behavior:'smooth',block:'start'});
}
const niceType={knowledge:'知识问答',review:'Code Review',choice:'选择题',fill:'填空题'};
function latestGroup(){return state.groups.find(g=>g.isDaily) || state.groups[0];}
function activeGroups(){
  if(state.view==='latest'){const g=latestGroup();return g?[g]:[];}
  return state.groups;
}
function groupQs(g){return g.questions.filter(q=>{
 const p=state.progress[key(q)]||{};
 if(state.view==='wrong' && !p.wrong && !p.star) return false;
 if(state.progressFilter==='completed' && !p.done) return false;
 if(state.progressFilter==='incomplete' && p.done) return false;
 if(state.topic && q.topic!==state.topic) return false;
 const hay=[q.title,q.topic,q.question,q.code].join(' ').toLowerCase();
 return !state.search || hay.includes(state.search);
});}
function renderQuestion(q, index){
 const p=state.progress[key(q)]||{};
 const escapedId=esc(q.id);
 const note=p.result==='correct'?'✓ 回答正确':p.result==='wrong'?'✕ 需要复习':p.result==='check'?'已提交，请对照参考答案':'';
 let answerArea='';
 if(q.type==='choice'){
  answerArea=`<fieldset class="answers" style="border:0;padding:0">${q.options.map((s,i)=>`<label class="option"><input name="choice-${escapedId}" type="radio" value="${i}" ${p.selected===i?'checked':''} ${p.done?'disabled':''}><span>${String.fromCharCode(65+i)}. ${esc(s)}</span></label>`).join('')}</fieldset>`;
 }else if(q.type==='fill'){
  answerArea=`<div class="answers"><label for="fill-${escapedId}" class="footer-note">输入关键词或数值（仅精确匹配，其他等价答案请手动自检）</label><input class="fill-input" id="fill-${escapedId}" data-id="${escapedId}" value="${esc(p.text||'')}" placeholder="填写你的答案" ${p.done?'disabled':''}></div>`;
 }else{
  answerArea=`<div class="answers"><label for="draft-${escapedId}" class="footer-note">先写下自己的判断（仅本地保存）</label><textarea class="draft-area" id="draft-${escapedId}" data-id="${escapedId}" placeholder="现象 → 假设 → 判断依据 → 验证方案">${esc(p.draft||'')}</textarea></div>`;
 }
 const submit=q.type==='choice'||q.type==='fill'
  ?`<button class="btn" data-action="submit" data-id="${escapedId}" ${p.done?'disabled':''}>${p.done?'已提交':'提交作答'}</button>`
  :`<button class="btn secondary" data-action="done" data-id="${escapedId}">${p.done?'✓ 已练习':'标记已练习'}</button>`;
 const result=p.result?`<div class="feedback ${p.result==='correct'?'good':''}">${note}</div>`:'';
 const area=p.revealed?`<div class="answer-panel"><h5>参考答案</h5><p>${esc(q.answer)}</p><h5>思路解析</h5><p>${esc(q.explanation)}</p><div class="diagnostic"><strong>🔍 下次优先想到它：</strong> ${esc(q.diagnostic_cue)}</div></div>`:'';
 return `<article class="q-card"><div class="q-card-inner"><div class="q-heading"><span class="tag ${esc(q.type)}">${esc(niceType[q.type]||'知识问答')}</span><span class="tag">${esc(q.topic)}</span><span class="difficulty">${esc(q.difficulty||'工程进阶')} · #${index}</span>${p.done?'<span class="done-dot">✓ 已完成</span>':''}<button class="fav-btn ${p.star?'active':''}" aria-label="${p.star?'取消收藏':'收藏题目'}" title="${p.star?'取消收藏':'收藏题目'}" data-action="star" data-id="${escapedId}">${p.star?'★':'☆'}</button></div><h4>${esc(q.title)}</h4><p class="question-text">${esc(q.question)}</p>${q.code?`<pre class="code"><code>${esc(q.code)}</code></pre>`:''}${answerArea}${result}<div class="q-actions">${submit}<button class="btn outline" data-action="reveal" data-id="${escapedId}" aria-expanded="${Boolean(p.revealed)}">${p.revealed?'收起参考答案':'点击查看答案'}</button><button class="btn outline" data-action="wrong" data-id="${escapedId}">${p.wrong?'✓ 已加入错题':'加入错题本'}</button></div></div>${area}</article>`;
}
function render(){
 const all=allQuestions();const p=state.progress;const done=all.filter(q=>p[q.id]?.done).length;const wrong=all.filter(q=>p[q.id]?.wrong||p[q.id]?.star).length;
 $('#stat-total').textContent=all.length;$('#stat-done').textContent=done;$('#stat-wrong').textContent=wrong;$('#stat-percent').textContent=all.length?Math.round(done*100/all.length)+'%':'0%';
 $('#side-done').textContent=done;$('#side-total').textContent='/ '+all.length+' 道';$('#side-meter').style.width=(all.length?done/all.length*100:0)+'%';
 $('#all-count').textContent=all.length;$('#wrong-count').textContent=wrong;$('#latest-count').textContent=latestGroup()?.questions.length||0;
 const selectedStat=state.view==='wrong'?'wrong':state.view==='all'?(state.progressFilter==='completed'?'completed':state.progressFilter==='incomplete'?'incomplete':'all'):null;
 document.querySelectorAll('.stat-button').forEach(button=>{
  const active=button.dataset.stat===selectedStat;
  button.classList.toggle('active',active);
  button.setAttribute('aria-pressed',String(active));
 });
 let meta={latest:['LATEST PRACTICE','最新训练','先自己分析，再展开答案。'],all:['QUESTION ARCHIVE','历史题库','回顾已有训练，按主题或关键词筛选。'],wrong:['YOUR REVIEW QUEUE','错题与收藏','回头巩固最值得掌握的判断模式。']}[state.view];
 if(state.view==='all'&&state.progressFilter==='completed')meta=['COMPLETED PRACTICE','已完成题目','复盘已完成的练习，巩固自己的判断依据。'];
 if(state.view==='all'&&state.progressFilter==='incomplete')meta=['CONTINUE PRACTICE','未完成题目','从尚未完成的题目继续练习。'];
 $('#breadcrumb').textContent=meta[1];$('#section-kicker').textContent=meta[0];$('#section-title').textContent=meta[1];$('#section-caption').textContent=meta[2];
 document.querySelectorAll('.nav').forEach(n=>{n.classList.toggle('active',n.dataset.view===state.view);n.setAttribute('aria-current',n.dataset.view===state.view?'page':'false');});
 const groups=activeGroups().map(g=>({...g,questions:groupQs(g)})).filter(g=>g.questions.length);
 $('#question-list').innerHTML=groups.length?groups.map(g=>`<section class="batch"><div class="batch-title"><h3>${esc(g.label)}</h3><span>${esc(g.intro||'')} · ${g.questions.length} 题</span></div>${g.questions.map((q,i)=>renderQuestion(q,i+1)).join('')}</section>`).join(''):`<div class="empty"><strong>${state.progressFilter==='completed'?'还没有完成的题目':state.progressFilter==='incomplete'?'所有题目都已完成':state.view==='wrong'?'错题与收藏还是空的':'这里暂时没有匹配的题目'}</strong>${state.progressFilter==='completed'?'先去最新训练完成几道题吧。':state.progressFilter==='incomplete'?'可以点击“已完成”回顾答题思路。':state.view==='wrong'?'遇到需要回顾的题目，点击“加入错题本”或收藏星标。':'试着调整搜索/分类，或把题目收藏后再回来复习。'}</div>`;
}
function normalize(str){return String(str||'').trim().toLowerCase().replace(/[\s,，。]/g,'');}
function findQ(id){return allQuestions().find(q=>q.id===id);}
function setupEvents(){
 document.querySelectorAll('.nav').forEach(btn=>btn.addEventListener('click',()=>{state.view=btn.dataset.view;state.progressFilter='all';render();}));
 document.querySelectorAll('.stat-button').forEach(btn=>btn.addEventListener('click',()=>selectStat(btn.dataset.stat)));
 $('#theme-toggle').addEventListener('click',()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
 $('#search').addEventListener('input',e=>{state.search=e.target.value.toLowerCase().trim();render();});
 $('#topic-filter').addEventListener('change',e=>{state.topic=e.target.value;render();});
 $('#question-list').addEventListener('input',e=>{
  if(e.target.matches('.draft-area')){const id=e.target.dataset.id;state.progress[id]={...(state.progress[id]||{}),draft:e.target.value};save();}
  if(e.target.matches('.fill-input')){const id=e.target.dataset.id;state.progress[id]={...(state.progress[id]||{}),text:e.target.value};save();}
 });
 $('#question-list').addEventListener('change',e=>{
  if(e.target.matches('input[type=radio]')){
   const id=e.target.name.slice('choice-'.length);state.progress[id]={...(state.progress[id]||{}),selected:Number(e.target.value)};save();
  }
 });
 $('#question-list').addEventListener('click',e=>{
  const btn=e.target.closest('button[data-action]');if(!btn)return;
  const {id,action}=btn.dataset;const q=findQ(id);if(!q)return;
  const p=state.progress[id]||{};
  if(action==='star'){record(id,{star:!p.star});return;}
  if(action==='wrong'){record(id,{wrong:!p.wrong});return;}
  if(action==='done'){record(id,{done:!p.done,result:!p.done?'check':null});return;}
  if(action==='reveal'){record(id,{revealed:!p.revealed});return;}
  if(action==='submit'&&!p.done){
   if(q.type==='choice'){
    if(!Number.isInteger(p.selected)){showNotice('请先选择一个选项再提交。');return;}
    record(id,{done:true,result:p.selected===q.correct_index?'correct':'wrong',wrong:p.selected===q.correct_index?Boolean(p.wrong):true});return;
   }
   if(q.type==='fill'){
    const input=$(`#fill-${CSS.escape(id)}`);const entered=input?.value||p.text||'';
    if(!entered.trim()){showNotice('请先填写答案再提交。');return;}
    const good=q.accepted_answers.some(a=>normalize(a)===normalize(entered));
    record(id,{text:entered,done:true,result:good?'correct':'wrong',wrong:good?Boolean(p.wrong):true});return;
   }
  }
 });
 $('#export-btn').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify({format:'embeddedlab-progress-v1',exported_at:new Date().toISOString(),progress:state.progress},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='embeddedlab-progress.json';link.click();URL.revokeObjectURL(url);
 });
 $('#import-btn').addEventListener('click',()=>$('#import-file').click());
 $('#import-file').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{const d=JSON.parse(await file.text());if(d.format!=='embeddedlab-progress-v1'||!d.progress||typeof d.progress!=='object'||Array.isArray(d.progress))throw Error();
   const known=new Set(allQuestions().map(q=>q.id));state.progress=Object.fromEntries(Object.entries(d.progress).filter(([id,v])=>known.has(id)&&v&&typeof v==='object'&&!Array.isArray(v)));save();render();showNotice('学习记录已导入（相同题目的本地记录已替换）。');
  }catch{showNotice('无法导入：请使用本站导出的进度 JSON 文件。');}
  e.target.value='';
 });
}
async function init(){
 state.progress=readProgress();applyTheme(document.documentElement.dataset.theme==='dark'?'dark':'light');setupEvents();
 try{
  const [archive,manifest]=await Promise.all([fetch('./data/archive.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('archive');return r.json();}),fetch('./data/manifest.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('manifest');return r.json();})]);
  const days=await Promise.all((manifest.days||[]).map(async day=>{
   const r=await fetch(`./data/days/${encodeURIComponent(day)}.json`,{cache:'no-store'});
   if(!r.ok)throw Error('daily '+day);
   const d=await r.json();return {id:d.date,label:`${d.date} · 每日训练`,intro:d.intro||'每日新增训练',questions:d.questions,isDaily:true,date:d.date};
  }));
  days.sort((a,b)=>b.date.localeCompare(a.date));
  state.groups=[...days,...archive.batches.slice().reverse().map(b=>({...b,isDaily:false}))];
  const topics=[...new Set(allQuestions().map(q=>q.topic))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
  $('#topic-filter').innerHTML='<option value="">全部主题</option>'+topics.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');
  const latest=latestGroup();if(latest&&!latest.isDaily)showNotice('当前展示的是已整理的历史练习，网站的每日自动生成需完成 GitHub Actions 与 API Key 配置后才会启用。');
  render();
 }catch(err){$('#question-list').innerHTML='<div class="empty"><strong>题库暂时无法加载</strong>本地打开请使用 start-local.bat，或运行 python -m http.server 8000 -d site。</div>';showNotice('加载失败：请确认通过 HTTP 服务访问，而不是直接双击 index.html。');console.error(err);}
}
init();
