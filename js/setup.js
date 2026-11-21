/* ---------- Setup & Tabbed Navigation ---------- */
const chips=(arr,lab,attr,on,cls)=>arr.map(k=>`<button class="chip ${cls||''}" type="button" aria-pressed="${on(k)}" data-${attr}="${k}">${lab(k)}</button>`).join('');
const topicChips=(attr,sel)=>TOPICS.map(([k,t])=>`<button class="chip w" type="button" aria-pressed="${sel.includes(k)}" data-${attr}="${k}">${t}</button>`).join('');

/* Main Tabs (Join Match vs Host Setup) & Setup Sub-Tabs */
function switchMainTab(tabName){
  const isJoin=tabName==='join';
  const jBtn=$('#tabJoinBtn'),hBtn=$('#tabHostBtn');
  const jPane=$('#joinPane'),hPane=$('#hostPane');
  if(jBtn){jBtn.classList.toggle('active',isJoin);jBtn.setAttribute('aria-selected',isJoin)}
  if(hBtn){hBtn.classList.toggle('active',!isJoin);hBtn.setAttribute('aria-selected',!isJoin)}
  if(jPane)jPane.hidden=!isJoin;
  if(hPane)hPane.hidden=isJoin;
}

function switchSetupTab(tabId){
  document.querySelectorAll('[data-setup-tab]').forEach(b=>{
    const active=b.dataset.setupTab===tabId;
    b.classList.toggle('active',active);
    b.setAttribute('aria-selected',active);
  });
  ['room','rules','style'].forEach(id=>{
    const pane=$('#pane-'+id);
    if(pane)pane.hidden=id!==tabId;
  });
}

document.querySelectorAll('[data-main-tab]').forEach(btn=>{
  btn.onclick=()=>switchMainTab(btn.dataset.mainTab);
});
document.querySelectorAll('[data-setup-tab]').forEach(btn=>{
  btn.onclick=()=>switchSetupTab(btn.dataset.setupTab);
});

/* Quick Top Theme Bar */
function initQuickThemeBar(){
  const qt=$('#quickThemes');
  if(qt){
    qt.innerHTML=THEMES.map(([k,label,hex])=>`<button class="t-dot" type="button" data-qtheme="${k}" style="background:${hex}" title="${label}" aria-label="${label}" aria-pressed="${themePref.color===k}"></button>`).join('');
    qt.onclick=e=>{
      const b=e.target.closest('[data-qtheme]');
      if(!b)return;
      const col=b.dataset.qtheme;
      setAppTheme(col,true);
      if(isAuthed()){
        S().theme=col;
        saveStore();
        renderSetup();
      }
    };
  }
  const dt=$('#darkToggle');
  if(dt){
    dt.onclick=()=>toggleDarkMode();
  }
  const hq=$('#hostArenaQuick');
  if(hq){
    hq.innerHTML=ARENAS.map(([k,title])=>`<option value="${k}">${title}</option>`).join('');
    hq.onchange=e=>{
      S().arena=e.target.value;
      saveStore();
      if(typeof drawBoard==='function'){
        drawBoard();
        if(typeof changed==='function')changed();
      }
    };
  }
  applyThemeDOM();
}

function renderRoomsUI(){
  const ws=getAdminWorkspace(store.activeAdmin);
  const rm=curRoom();
  const sel=$('#roomSelect');
  if(sel){
    sel.innerHTML=ws.rooms.map(r=>`<option value="${esc(r.id)}" ${r.id===rm.id?'selected':''}>🏠 ${esc(r.name)} (${ar((r.profiles||[]).length)} لاعب — رمز: ${r.code||''})</option>`).join('');
  }
  const badge=$('#roomBadge');
  if(badge)badge.textContent=`غرفة: ${rm.name} · الرمز: ${rm.code}`;
}

function renderSetup(){
  const rm=curRoom(),s=rm.set;
  renderRoomsUI();
  if(!canNet())s.mode='device';
  $('#mode').innerHTML=`<button class="chip w" type="button" aria-pressed="${s.mode==='multi'}" data-m="multi" ${canNet()?'':'disabled'}>📱 أكثر من جهاز</button><button class="chip w" type="button" aria-pressed="${s.mode==='device'}" data-m="device">🖥️ جهاز واحد</button>`;
  $('#modeHint').textContent=!canNet()?'اللعب على أكثر من جهاز يعمل عند فتح اللعبة عبر الرابط.':s.mode==='multi'?'ينضم كل لاعب من جهازه برمز الغرفة أو مسح QR.':'اللعب من ١ إلى ٦ لاعبين على هذا الجهاز.';
  $('#size').innerHTML=chips(SIZES,k=>`${ar(k)}×${ar(k)}`,'s',k=>k===s.size,'w');
  $('#rules').innerHTML=RULES.map(([k,t])=>{
    const on=s[k]!==false;
    return`<button class="chip w" type="button" aria-pressed="${on}" data-r="${k}"><span>${t}</span><span class="chk">${on?'✓':'✕'}</span></button>`;
  }).join('');
  $('#fair').innerHTML=FAIR.map(([k,t])=>`<button class="chip w" type="button" aria-pressed="${s.fair===k}" data-f="${k}">${t}</button>`).join('');
  $('#lvl').innerHTML=chips([0,1,2],k=>LEVELS[k][0],'l',k=>k===s.level,'w');
  $('#top').innerHTML=topicChips('o',s.topics);
  $('#tbl').innerHTML=chips(ALLT,ar,'t',k=>s.tables.includes(k));
  $('#tblBox').hidden=!(s.topics.includes('mul')||s.topics.includes('div'));

  /* Arena Designs Grid */
  const arBox=$('#arenaSelect');
  if(arBox){
    arBox.innerHTML=ARENAS.map(([k,title,desc,cols])=>`<button class="arena-card" type="button" aria-pressed="${(s.arena||'classic')===k}" data-arena="${k}">
      <div class="arena-card-top">
        <b>${title}</b>
        <span class="arena-swatches">${cols.map(c=>`<i style="background:${c}"></i>`).join('')}</span>
      </div>
      <small>${desc}</small>
    </button>`).join('');
  }

  /* Theme Color Grid */
  const thBox=$('#themeSelect');
  if(thBox){
    const activeCol=s.theme||themePref.color||'green';
    thBox.innerHTML=THEMES.map(([k,title,hex])=>`<button class="theme-card" type="button" aria-pressed="${activeCol===k}" data-theme-col="${k}">
      <i style="background:${hex}"></i>
      <span>${title}</span>
    </button>`).join('');
  }

  const own=s.fair==='each'||s.fair==='both';
  $('#genLbl').textContent=own?'المستوى للجميع (ويمكن تخصيصه لكل لاعب)' :'المستوى';
  $('#profiles').innerHTML=rm.profiles.map(p=>`<div class="prof" data-id="${p.id}">
    <div class="prow"><button class="mini" type="button" data-act="emo" aria-label="تغيير الرمز">${p.emoji}</button><b class="pn">${esc(p.name)}</b>${s.mode==='device'?`<button class="chip w sm" type="button" aria-pressed="${!!p.on}" data-act="on">${p.on?'✓ يلعب':'لا يلعب'}</button>`:''}<button class="mini" type="button" data-act="rep">📊 تقرير</button><button class="mini" type="button" data-act="del" aria-label="حذف ${esc(p.name)}">✕</button></div>
    ${own?`<details class="pd"><summary>مستوى ${esc(p.name)}: ${LEVELS[p.level][0]}</summary>
      <div class="row">${[0,1,2].map(k=>`<button class="chip w sm" type="button" aria-pressed="${p.level===k}" data-act="lvl" data-v="${k}">${LEVELS[k][0]}</button>`).join('')}</div>
      <div class="row">${TOPICS.map(([k,t])=>`<button class="chip w sm" type="button" aria-pressed="${p.topics.includes(k)}" data-act="top" data-v="${k}">${t}</button>`).join('')}</div>
      <div class="row">${ALLT.map(k=>`<button class="chip sm" type="button" aria-pressed="${p.tables.includes(k)}" data-act="tbl" data-v="${k}">${ar(k)}</button>`).join('')}</div>
    </details>`:''}</div>`).join('')||'<p class="hint" style="margin-top:8px">أضف اسم لاعب في هذه الغرفة ليُحفظ ملفه وتقريره (من ١ إلى ٦ لاعبين للمباراة).</p>';

  /* Setup Footer Summary */
  const sum=$('#setupSummary');
  if(sum){
    const arTitle=(ARENAS.find(a=>a[0]===(s.arena||'classic'))||ARENAS[0])[1];
    const activeRulesCount=RULES.filter(([k])=>s[k]!==false).length;
    sum.innerHTML=`<span class="sum-pill">🏠 ${esc(rm.name)}</span>
      <span class="sum-pill">${s.mode==='multi'?'📱 أكثر من جهاز':'🖥️ جهاز واحد'}</span>
      <span class="sum-pill">📐 ${ar(s.size)}×${ar(s.size)}</span>
      <span class="sum-pill">${arTitle}</span>
      <span class="sum-pill">🎮 ${ar(activeRulesCount)} قواعد مفعّلة</span>`;
  }

  $('#go').textContent=s.mode==='multi'?`فتح غرفة «${rm.name}» للأجهزة 🚀`:'ابدأ اللعب الآن 🚀';
  renderAuthUI();
  applyThemeDOM();
  saveStore();
}

const toggle=(a,v)=>{const i=a.indexOf(v);i<0?a.push(v):a.splice(i,1)};
const onChip=(id,attr,fn)=>{
  const el=$(id);
  if(!el)return;
  el.onclick=e=>{
    const b=e.target.closest(`[data-${attr}]`);
    if(b&&!b.disabled){
      fn(b.dataset[attr]);
      renderSetup();
    }
  };
};
onChip('#mode','m',v=>{S().mode=v});
onChip('#size','s',v=>{S().size=+v});
onChip('#rules','r',v=>{const s=S();s[v]=!(s[v]!==false)});
onChip('#fair','f',v=>{S().fair=v});
const toAll=()=>curRoom().profiles.forEach(p=>{p.level=S().level;p.topics=S().topics.slice();p.tables=S().tables.slice()});
onChip('#lvl','l',v=>{S().level=+v;toAll()});
onChip('#top','o',v=>{toggle(S().topics,v);toAll()});
onChip('#tbl','t',v=>{toggle(S().tables,+v);toAll()});
onChip('#arenaSelect','arena',v=>{S().arena=v});
onChip('#themeSelect','themeCol',v=>{S().theme=v;setAppTheme(v,true)});

/* Room Management Events */
if($('#roomSelect')){
  $('#roomSelect').onchange=e=>{
    selectRoom(e.target.value);
    renderSetup();
  };
}
if($('#addRoomBtn')){
  $('#addRoomBtn').onclick=()=>{
    const inp=$('#newRoomName'),nm=inp.value.trim(),m=$('#roomMsg');
    if(!nm){if(m){m.textContent='اكتب اسم الغرفة أولًا.';m.className=''}return}
    const rm=createRoom(nm);
    inp.value='';
    if(m){m.textContent=`تم إنشاء الغرفة «${rm.name}» برمز ${rm.code}`;m.className='ok'}
    renderSetup();
  };
}
if($('#newRoomName')){
  $('#newRoomName').onkeydown=e=>{if(e.key==='Enter')$('#addRoomBtn').click()};
}
if($('#newCodeBtn')){
  $('#newCodeBtn').onclick=()=>{
    const rm=curRoom();
    rm.code=String(rnd(100000,999999));
    saveStore();
    renderSetup();
    const m=$('#roomMsg');
    if(m){m.textContent=`تم تجديد رمز الغرفة إلى ${rm.code}`;m.className='ok'}
  };
}
if($('#delRoomBtn')){
  $('#delRoomBtn').onclick=e=>{
    const b=e.currentTarget;
    const m=$('#roomMsg');
    if(!b.dataset.sure){
      b.dataset.sure='1';
      b.textContent='تأكيد حذف الغرفة؟';
      setTimeout(()=>{if(b){delete b.dataset.sure;b.textContent='🗑 حذف الغرفة'}},3500);
      return;
    }
    delete b.dataset.sure;
    b.textContent='🗑 حذف الغرفة';
    const res=deleteCurrentRoom();
    if(!res.ok){
      if(m){m.textContent=res.msg;m.className=''}
    }else{
      if(m){m.textContent='تم حذف الغرفة.';m.className='ok'}
      renderSetup();
    }
  };
}

$('#profiles').onclick=e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  const open=[...document.querySelectorAll('#profiles details[open]')].map(d=>d.closest('.prof').dataset.id);
  const p=prof(b.closest('.prof').dataset.id),a=b.dataset.act,v=b.dataset.v;
  if(!p)return;
  if(a==='emo')p.emoji=EMO[(EMO.indexOf(p.emoji)+1)%EMO.length];
  if(a==='on')p.on=!p.on;
  if(a==='lvl')p.level=+v;
  if(a==='top')toggle(p.topics,v);
  if(a==='tbl')toggle(p.tables,+v);
  if(a==='rep')return showReport(p);
  if(a==='del'){
    if(b.dataset.sure){
      const delId=p.id;
      const rm=curRoom();
      rm.profiles=rm.profiles.filter(x=>x!==p);
      store.profiles=rm.profiles;
      if(typeof sbDeletePlayerRemote==='function')sbDeletePlayerRemote(delId);
    }else{
      b.dataset.sure=1;b.textContent='تأكيد؟';return;
    }
  }
  renderSetup();
  open.forEach(id=>{const d=$(`.prof[data-id="${id}"] details`);if(d)d.open=true});
};
$('#addP').onclick=()=>{const i=$('#newName'),v=i.value.trim();if(!v)return;newProfile(v);i.value='';renderSetup()};
$('#newName').onkeydown=e=>{if(e.key==='Enter')$('#addP').click()};

$('#exportB').onclick=()=>{
  const a=document.createElement('a');
  const payload={admins:store.admins,workspaces:store.workspaces,activeAdmin:store.activeAdmin};
  a.href=URL.createObjectURL(new Blob([JSON.stringify(payload)],{type:'application/json'}));
  a.download='sullam-backup.json';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
};
$('#importB').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    const r=JSON.parse(await f.text());
    if(r.workspaces){
      store.workspaces=r.workspaces;
      store.admins=Array.isArray(r.admins)?r.admins:(store.admins||[]);
      curRoom();
    }else if(Array.isArray(r.profiles)){
      const rm=curRoom();
      rm.profiles=r.profiles;
      rm.set=ensureSetDefaults(r.set||{});
      if(Array.isArray(r.admins))store.admins=r.admins;
      curRoom();
    }else throw 0;
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
  const rm=curRoom(),s=rm.set,m=$('#err');m.textContent='';
  if(!isAuthed()){renderAuthUI();$('#authErr').textContent='يجب تسجيل الدخول لإنشاء مباراة جديدة.';return}
  if(!s.topics.length){switchSetupTab('rules');m.textContent='اختر موضوعًا واحدًا على الأقل.';return}
  if((s.topics.includes('mul')||s.topics.includes('div'))&&!s.tables.length){switchSetupTab('rules');m.textContent='اختر جدولًا واحدًا على الأقل.';return}
  ensureAC();preload();keepAwake();
  if(s.mode==='multi')return openRoom(false);
  const ps=rm.profiles.filter(p=>p.on).slice(0,MAXP);
  if(!ps.length){switchSetupTab('room');m.textContent='أضف لاعبًا واحدًا على الأقل واختره (من ١ إلى ٦ لاعبين).';return}
  mode='local';seats=ps.map(p=>({pid:p.id,token:null,conn:null}));startGame();
};

$('#joinBtn').onclick=()=>{
  const c=$('#joinCode').value.trim();
  const jm=$('#joinErr');
  if(jm)jm.textContent='';
  if(/^\d{6}$/.test(c)){
    startClient(c);
  }else{
    if(jm)jm.textContent='يرجى كتابة رمز المباراة المكوّن من ٦ أرقام.';
    $('#err').textContent='رمز المباراة من ٦ أرقام.';
  }
};
$('#joinCode').onkeydown=e=>{if(e.key==='Enter')$('#joinBtn').click()};

$('#testVoice').onclick=()=>{
  ensureAC();preload();
  const rm=curRoom();
  const m=$('#voiceMsg'),has='speechSynthesis' in window&&arVoices().length>0,nm=rm.profiles[0]&&rm.profiles[0].name||'';
  whistle();crowdFx('cheer',.5);
  comment([{i:0,name:nm,named:!!nm},'correct'],null);
  const vc=Object.keys(VOICE).length;
  m.textContent=(vc?`تم تجهيز ${ar(vc)} مقطعًا صوتيًا للمعلّق. `:'')+(has?'وجدت صوتًا عربيًا في جهازك، وسينطق الأسماء التي ليس لها مقطع خاص.':'لا يوجد صوت عربي في جهازك، لذلك سيقول المعلّق «اللاعب رقم واحد» للأسماء التي ليس لها مقطع خاص.')+' إذا لم تسمع شيئًا، ارفع الصوت وألغِ الوضع الصامت.';
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
