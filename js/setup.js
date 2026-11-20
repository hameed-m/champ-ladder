/* ---------- Setup ---------- */
const chips=(arr,lab,attr,on,cls)=>arr.map(k=>`<button class="chip ${cls||''}" aria-pressed="${on(k)}" data-${attr}="${k}">${lab(k)}</button>`).join('');
const topicChips=(attr,sel)=>TOPICS.map(([k,t])=>`<button class="chip w" aria-pressed="${sel.includes(k)}" data-${attr}="${k}">${t}</button>`).join('');

function renderSetup(){
  const s=S();
  if(!canNet())s.mode='device';
  $('#mode').innerHTML=`<button class="chip w" aria-pressed="${s.mode==='multi'}" data-m="multi" ${canNet()?'':'disabled'}>📱 أكثر من جهاز</button><button class="chip w" aria-pressed="${s.mode==='device'}" data-m="device">🖥️ جهاز واحد</button>`;
  $('#modeHint').textContent=!canNet()?'اللعب على أكثر من جهاز يعمل بعد رفع اللعبة إلى GitHub Pages.':s.mode==='multi'?'هذا الجهاز يعرض الساحة والمعلّق، وكل لاعب يستخدم جهازه.':'سؤال الجميع وسرقة الإجابة وضربة الجزاء تعمل مع أكثر من جهاز فقط.';
  $('#size').innerHTML=chips(SIZES,k=>`${ar(k)}×${ar(k)}`,'s',k=>k===s.size,'w');
  $('#rules').innerHTML=RULES.map(([k,t])=>`<button class="chip w" aria-pressed="${!!s[k]}" data-r="${k}">${t}</button>`).join('');
  $('#fair').innerHTML=FAIR.map(([k,t])=>`<button class="chip w" aria-pressed="${s.fair===k}" data-f="${k}">${t}</button>`).join('');
  $('#lvl').innerHTML=chips([0,1,2],k=>LEVELS[k][0],'l',k=>k===s.level,'w');
  $('#top').innerHTML=topicChips('o',s.topics);
  $('#tbl').innerHTML=chips(ALLT,ar,'t',k=>s.tables.includes(k));
  $('#tblBox').hidden=!(s.topics.includes('mul')||s.topics.includes('div'));
  const own=s.fair==='each'||s.fair==='both';
  $('#genLbl').textContent=own?'المستوى للجميع (ويمكن تعديله لكل لاعب أدناه)':'المستوى';
  $('#profiles').innerHTML=store.profiles.map(p=>`<div class="prof" data-id="${p.id}">
    <div class="prow"><button class="mini" data-act="emo" aria-label="تغيير الرمز">${p.emoji}</button><b class="pn">${esc(p.name)}</b>${s.mode==='device'?`<button class="chip w sm" aria-pressed="${!!p.on}" data-act="on">يلعب</button>`:''}<button class="mini" data-act="rep">تقرير</button><button class="mini" data-act="del" aria-label="حذف ${esc(p.name)}">✕</button></div>
    ${own?`<details class="pd"><summary>مستوى ${esc(p.name)}: ${LEVELS[p.level][0]}</summary>
      <div class="row">${[0,1,2].map(k=>`<button class="chip w sm" aria-pressed="${p.level===k}" data-act="lvl" data-v="${k}">${LEVELS[k][0]}</button>`).join('')}</div>
      <div class="row">${TOPICS.map(([k,t])=>`<button class="chip w sm" aria-pressed="${p.topics.includes(k)}" data-act="top" data-v="${k}">${t}</button>`).join('')}</div>
      <div class="row">${ALLT.map(k=>`<button class="chip sm" aria-pressed="${p.tables.includes(k)}" data-act="tbl" data-v="${k}">${ar(k)}</button>`).join('')}</div>
    </details>`:''}</div>`).join('')||'<p class="hint">أضف اسم لاعب ليُحفظ ملفه وتقريره.</p>';
  $('#go').textContent=s.mode==='multi'?'إنشاء غرفة':'ابدأ اللعب';
  renderAuthUI();
  saveStore();
}

const toggle=(a,v)=>{const i=a.indexOf(v);i<0?a.push(v):a.splice(i,1)};
const onChip=(id,attr,fn)=>{$(id).onclick=e=>{const b=e.target.closest(`[data-${attr}]`);if(b&&!b.disabled){fn(b.dataset[attr]);renderSetup()}}};
onChip('#mode','m',v=>S().mode=v);
onChip('#size','s',v=>S().size=+v);
onChip('#rules','r',v=>S()[v]=!S()[v]);
onChip('#fair','f',v=>S().fair=v);
const toAll=()=>store.profiles.forEach(p=>{p.level=S().level;p.topics=S().topics.slice();p.tables=S().tables.slice()});
onChip('#lvl','l',v=>{S().level=+v;toAll()});
onChip('#top','o',v=>{toggle(S().topics,v);toAll()});
onChip('#tbl','t',v=>{toggle(S().tables,+v);toAll()});

$('#profiles').onclick=e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  const open=[...document.querySelectorAll('#profiles details[open]')].map(d=>d.closest('.prof').dataset.id);
  const p=prof(b.closest('.prof').dataset.id),a=b.dataset.act,v=b.dataset.v;
  if(a==='emo')p.emoji=EMO[(EMO.indexOf(p.emoji)+1)%EMO.length];
  if(a==='on')p.on=!p.on;
  if(a==='lvl')p.level=+v;
  if(a==='top')toggle(p.topics,v);
  if(a==='tbl')toggle(p.tables,+v);
  if(a==='rep')return showReport(p);
  if(a==='del'){if(b.dataset.sure){store.profiles=store.profiles.filter(x=>x!==p)}else{b.dataset.sure=1;b.textContent='تأكيد؟';return}}
  renderSetup();
  open.forEach(id=>{const d=$(`.prof[data-id="${id}"] details`);if(d)d.open=true});
};
$('#addP').onclick=()=>{const i=$('#newName'),v=i.value.trim();if(!v)return;newProfile(v);i.value='';renderSetup()};
$('#newName').onkeydown=e=>{if(e.key==='Enter')$('#addP').click()};

$('#exportB').onclick=()=>{
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(store)],{type:'application/json'}));a.download='sullam-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
};
$('#importB').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    const r=JSON.parse(await f.text());
    if(!Array.isArray(r.profiles))throw 0;
    store={profiles:r.profiles,set:{...DEF,...r.set},admins:Array.isArray(r.admins)?r.admins:(store.admins||[])};
    saveStore();renderSetup();$('#err').textContent='تمت الاستعادة.';
  }catch(x){$('#err').textContent='ملف النسخة غير صالح.'}
};

function showReport(p){
  const st=p.st,row=(lab,v)=>{const t=v[0]+v[1],pc=Math.round(v[0]/t*100);return`<li><b>${lab}</b><span>${ar(pc)}٪ من ${ar(t)}</span><i class="rb"><i style="width:${pc}%"></i></i></li>`};
  const T=Object.fromEntries(TOPICS),tp=Object.entries(st.t).sort((a,b)=>a[1][0]/(a[1][0]+a[1][1])-b[1][0]/(b[1][0]+b[1][1]));
  const tb=Object.entries(st.tb).sort((a,b)=>a[1][0]/(a[1][0]+a[1][1])-b[1][0]/(b[1][0]+b[1][1]));
  const ms=Object.entries(st.miss).sort((a,b)=>b[1]-a[1]).slice(0,8);
  $('#repT').textContent=`${p.emoji} تقرير ${p.name}`;
  $('#repB').innerHTML=`<p>${ar(p.games)} مباراة، ${ar(p.wins)} فوز، وأعلى نتيجة ${ar(p.best)} نقطة.</p>`+
   (tp.length?`<span class="h">الموضوعات، الأضعف أولًا</span><ul class="rep">${tp.map(([k,v])=>row(T[k]||k,v)).join('')}</ul>`:'<p>لا توجد إجابات مسجلة بعد.</p>')+
   (tb.length?`<span class="h">الجداول، الأضعف أولًا</span><ul class="rep">${tb.map(([k,v])=>row('جدول '+ar(k),v)).join('')}</ul>`:'')+
   (ms.length?`<span class="h">أكثر الأسئلة خطأً</span><ul class="rep">${ms.map(([k,v])=>`<li><b dir="auto">${esc(k)}</b><span>${ar(v)} مرة</span></li>`).join('')}</ul>`:'');
  $('#report').hidden=false;
}
$('#repClose').onclick=()=>$('#report').hidden=true;

function show(id){['setup','lobby','game','pick','client','connect'].forEach(x=>$('#'+x).hidden=x!==id);window.scrollTo(0,0)}

$('#go').onclick=()=>{
  const s=S(),m=$('#err');m.textContent='';
  if(!isAuthed()){renderAuthUI();$('#authErr').textContent='يجب تسجيل الدخول لإنشاء مباراة جديدة.';return}
  if(!s.topics.length){m.textContent='اختر موضوعًا واحدًا على الأقل.';return}
  if((s.topics.includes('mul')||s.topics.includes('div'))&&!s.tables.length){m.textContent='اختر جدولًا واحدًا على الأقل.';return}
  ensureAC();preload();keepAwake();
  if(s.mode==='multi')return openRoom();
  const ps=store.profiles.filter(p=>p.on).slice(0,MAXP);
  if(!ps.length){m.textContent='أضف لاعبًا واحدًا على الأقل واختره.';return}
  mode='local';seats=ps.map(p=>({pid:p.id,token:null,conn:null}));startGame();
};

$('#joinBtn').onclick=()=>{const c=$('#joinCode').value.trim();if(/^\d{6}$/.test(c)){startClient(c)}else{$('#err').textContent='رمز المباراة من ٦ أرقام.';$('#authErr').textContent='رمز المباراة من ٦ أرقام.'}};
$('#joinCode').onkeydown=e=>{if(e.key==='Enter')$('#joinBtn').click()};

$('#testVoice').onclick=()=>{
  ensureAC();preload();
  const m=$('#voiceMsg'),has='speechSynthesis' in window&&arVoices().length>0,nm=store.profiles[0]&&store.profiles[0].name||'';
  whistle();crowdFx('cheer',.5);
  comment([{i:0,name:nm,named:!!nm},'correct'],null);
  const vc=Object.keys(VOICE).length;
  m.textContent=(vc?`تم تحميل ${ar(vc)} مقطعًا من أصوات Google. `:'')+(has?'وجدت صوتًا عربيًا في جهازك، وسينطق الأسماء التي ليس لها مقطع خاص.':'لا يوجد صوت عربي في جهازك، لذلك سيقول المعلّق «اللاعب رقم واحد» للأسماء التي ليس لها مقطع خاص.')+' إذا لم تسمع شيئًا، ارفع الصوت وألغِ الوضع الصامت.';
};

$('#snd').onclick=()=>{
  muted=!muted;if(muted)stopComment();
  if(AC)master.gain.setTargetAtTime(muted?0:1,AC.currentTime,.03);
  $('#snd').textContent=muted?'🔇':'🔊';$('#snd').setAttribute('aria-pressed',!muted);
};
$('#crowdBtn').onclick=()=>{
  crowdOn=!crowdOn;if(AC)crowdBus.gain.setTargetAtTime(crowdOn?1:0,AC.currentTime,.08);
  $('#crowdBtn').setAttribute('aria-pressed',crowdOn);
};
document.addEventListener('visibilitychange',()=>{
  try{if(!document.hidden)keepAwake();if(AC)document.hidden?AC.suspend():AC.resume()}catch(e){}
});
