const $=s=>document.querySelector(s);
const ar=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pickOne=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

const COLORS=['#e0533d','#2f7fd6','#d99a00','#8a4fd1','#17a589','#d6336c'];
const OFF=[[-18,-13],[0,-13],[18,-13],[-18,14],[0,14],[18,14]];
const SIZES=[6,7,8,9,10];
const LEVELS=[['سهل',20],['متوسط',15],['صعب',12]];
const TOPICS=[['mul','الضرب'],['div','القسمة'],['add','الجمع'],['sub','الطرح'],['sqrt','الجذور التربيعية'],['geo','الأشكال الهندسية']];
const FAIR=[['each','مستوى لكل لاعب'],['adaptive','صعوبة متكيفة'],['both','الاثنان معًا'],['one','مستوى واحد للجميع']];
const RULES=[
  ['ladders','🪜 السلالم'],
  ['snakes','🐍 الحيات'],
  ['pushback','↩️ إرجاع خصم'],
  ['allq','⭐ سؤال الجميع'],
  ['cards','🃏 بطاقات القدرات'],
  ['steal','⚡ سرقة الإجابة'],
  ['penalty','⚽ ضربة جزاء']
];
const THEMES=[
  ['green','الأخضر الزمردي','#1f6b52'],
  ['orange','البرتقالي الناري','#d95d1e'],
  ['purple','البنفسجي الملكي','#6f3cc3'],
  ['blue','الأزرق المحيطي','#1d68b8'],
  ['crimson','الأحمر الياقوتي','#b82841'],
  ['gold','الذهبي الفاخر','#b07d12']
];
const ARENAS=[
  ['classic','🏟️ ملعب الأبطال','كلاسيكي بألوان حيوية وسلالم وحيات',['#e4572e','#f0a202','#2e86de','#3fae5a']],
  ['horror','👻 القلعة المسكونة','أجواء رعب وأشباح وخفافيش وسلالم متوهجة',['#1e1333','#4c1d95','#991b1b','#c084fc']],
  ['funny','🤡 كرتوني مرح','ألوان حلوى ووحوش مضحكة وقشور موز',['#ff595e','#ffca3a','#8ac926','#1982c4']],
  ['space','🚀 الفضاء والمجرات','نيون مجري وصواريخ وثقوب سوداء',['#0f172a','#1e1b4b','#00f5d4','#a855f7']],
  ['jungle','🌴 غابة المغامرات','أخشاب وسلالم حبال وأفاعي الأدغال',['#2d6a4f','#b5835a','#52b788','#d4a373']]
];
const CARD={shield:['🛡️','درع'],double:['🎲','نرد مضاعف'],freeze:['❄️','تجميد'],swap:['🔄','تبديل السؤال']};
const REACT=['👏','🔥','😂','😱','⚽'];

let tables=new Set([1,2,3,4,5,6,7,8,9]),N=6,level=1,topics=new Set(['mul']);
let LAD={},SNK={},ALLQ=new Set(),SURP=new Set(),LAST=36;
let P=[],cur=0,won=false,tid=0,lastSec=0,epoch=0,recent=[],qSeq=0;
let mode='local',peer=null,seats=[],code='';
let G={phase:'busy'},paused=false,wake=null;

const QS=new URLSearchParams(location.search),PS=QS.get('ps');
const canNet=()=>/^https?:/.test(location.protocol);

/* ---------- Store (Per-Admin Rooms & Per-Room Players) ---------- */
const KEY='sullam-v3',LEGACY_KEY='sullam-v2',THEME_KEY='sullam-theme-v1';
const EMO=['🦁','🐯','🦅','🐬','🦊','🐼','🚀','⚽','🌟','🐎','🦉','🐢'];
const ALLT=[1,2,3,4,5,6,7,8,9],MAXP=6;
const DEF={
  size:6,
  level:1,
  topics:['mul'],
  tables:ALLT.slice(),
  fair:'each',
  ladders:true,
  snakes:true,
  pushback:true,
  allq:true,
  cards:true,
  steal:true,
  penalty:true,
  mode:'multi',
  theme:'green',
  arena:'classic'
};

const uid=()=>Math.random().toString(36).slice(2,10);
const genCode=()=>String(rnd(100000,999999));

let store={
  admins:[],
  workspaces:{},
  activeAdmin:'a.alhofufy@gmail.com',
  profiles:[],
  set:{...DEF}
};

let themePref={
  color:'green',
  dark:window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches,
  userPicked:false
};

function loadThemePref(){
  try{
    const saved=JSON.parse(localStorage.getItem(THEME_KEY));
    if(saved&&typeof saved==='object'){
      if(THEMES.some(t=>t[0]===saved.color))themePref.color=saved.color;
      if(typeof saved.dark==='boolean')themePref.dark=saved.dark;
      if(typeof saved.userPicked==='boolean')themePref.userPicked=saved.userPicked;
    }
  }catch(e){}
  applyThemeDOM();
}

function saveThemePref(){
  try{localStorage.setItem(THEME_KEY,JSON.stringify(themePref))}catch(e){}
}

function applyThemeDOM(){
  const root=document.documentElement;
  root.setAttribute('data-color',themePref.color||'green');
  root.setAttribute('data-theme',themePref.dark?'dark':'light');
  const dt=$('#darkToggle');
  if(dt){
    dt.textContent=themePref.dark?'☀️':'🌙';
    dt.setAttribute('aria-pressed',!!themePref.dark);
  }
  document.querySelectorAll('[data-qtheme]').forEach(b=>{
    b.setAttribute('aria-pressed',b.dataset.qtheme===themePref.color);
  });
}

function setAppTheme(color,fromUser){
  if(!THEMES.some(t=>t[0]===color))return;
  themePref.color=color;
  if(fromUser)themePref.userPicked=true;
  saveThemePref();
  applyThemeDOM();
}

function toggleDarkMode(){
  themePref.dark=!themePref.dark;
  saveThemePref();
  applyThemeDOM();
}

function ensureSetDefaults(setObj){
  if(!setObj||typeof setObj!=='object')return{...DEF,topics:DEF.topics.slice(),tables:DEF.tables.slice()};
  for(const k in DEF){
    if(setObj[k]===undefined){
      setObj[k]=Array.isArray(DEF[k])?DEF[k].slice():DEF[k];
    }
  }
  if(!THEMES.some(t=>t[0]===setObj.theme))setObj.theme='green';
  if(!ARENAS.some(a=>a[0]===setObj.arena))setObj.arena='classic';
  return setObj;
}

function makeDefaultRoom(name){
  return{
    id:'rm_'+uid(),
    name:name||'الغرفة الرئيسية',
    code:genCode(),
    set:ensureSetDefaults({}),
    profiles:[]
  };
}

function getAdminWorkspace(email){
  const em=String(email||store.activeAdmin||'a.alhofufy@gmail.com').trim().toLowerCase();
  store.workspaces=store.workspaces||{};
  if(!store.workspaces[em]||!Array.isArray(store.workspaces[em].rooms)||!store.workspaces[em].rooms.length){
    const defRm=makeDefaultRoom('الغرفة الرئيسية');
    store.workspaces[em]={rooms:[defRm],activeRoomId:defRm.id};
  }
  const ws=store.workspaces[em];
  if(!ws.rooms.some(r=>r.id===ws.activeRoomId)){
    ws.activeRoomId=ws.rooms[0].id;
  }
  return ws;
}

function curRoom(){
  const ws=getAdminWorkspace(store.activeAdmin);
  let rm=ws.rooms.find(r=>r.id===ws.activeRoomId)||ws.rooms[0];
  if(!rm){
    rm=makeDefaultRoom('الغرفة الرئيسية');
    ws.rooms=[rm];
    ws.activeRoomId=rm.id;
  }
  /* Mutate in-place or initialize once so S() always returns the stable object reference */
  rm.set=ensureSetDefaults(rm.set);
  rm.profiles=Array.isArray(rm.profiles)?rm.profiles:[];
  if(!rm.code||!/^\d{6}$/.test(rm.code))rm.code=genCode();
  store.profiles=rm.profiles;
  store.set=rm.set;
  return rm;
}

function setAdminRooms(email,rooms){
  const em=String(email||store.activeAdmin).trim().toLowerCase();
  const ws=getAdminWorkspace(em);
  if(Array.isArray(rooms)&&rooms.length){
    rooms.forEach(r=>{r.set=ensureSetDefaults(r.set)});
    ws.rooms=rooms;
    if(!ws.rooms.some(r=>r.id===ws.activeRoomId)){
      ws.activeRoomId=ws.rooms[0].id;
    }
  }
  if(em===store.activeAdmin)curRoom();
  saveStoreLocal();
}

function switchAdminWorkspace(email){
  store.activeAdmin=String(email||'a.alhofufy@gmail.com').trim().toLowerCase();
  curRoom();
  saveStoreLocal();
}

function createRoom(name){
  const nm=String(name||'').trim().slice(0,28);
  if(!nm)return null;
  const ws=getAdminWorkspace(store.activeAdmin);
  const rm=makeDefaultRoom(nm);
  ws.rooms.push(rm);
  ws.activeRoomId=rm.id;
  curRoom();
  saveStore();
  return rm;
}

function selectRoom(roomId){
  const ws=getAdminWorkspace(store.activeAdmin);
  const rm=ws.rooms.find(r=>r.id===roomId);
  if(!rm)return;
  ws.activeRoomId=rm.id;
  curRoom();
  if(!themePref.userPicked&&rm.set.theme)setAppTheme(rm.set.theme,false);
  saveStoreLocal();
}

function renameCurrentRoom(newName){
  const nm=String(newName||'').trim().slice(0,28);
  if(!nm)return false;
  const rm=curRoom();
  rm.name=nm;
  saveStore();
  return true;
}

function deleteCurrentRoom(){
  const ws=getAdminWorkspace(store.activeAdmin);
  if(ws.rooms.length<=1)return{ok:false,msg:'يجب الإبقاء على غرفة واحدة على الأقل.'};
  const rm=curRoom();
  const delId=rm.id;
  ws.rooms=ws.rooms.filter(r=>r.id!==delId);
  ws.activeRoomId=ws.rooms[0].id;
  curRoom();
  saveStoreLocal();
  if(typeof sbDeleteRoomRemote==='function')sbDeleteRoomRemote(delId);
  if(typeof scheduleCloudSync==='function')scheduleCloudSync();
  return{ok:true};
}

function loadStore(){
  loadThemePref();
  try{
    const r=JSON.parse(localStorage.getItem(KEY));
    if(r&&r.workspaces){
      store.admins=Array.isArray(r.admins)?r.admins:[];
      store.workspaces=r.workspaces;
      store.activeAdmin=r.activeAdmin||'a.alhofufy@gmail.com';
      const rm=curRoom();
      if(!themePref.userPicked&&rm.set.theme)setAppTheme(rm.set.theme,false);
      return;
    }
    const old=JSON.parse(localStorage.getItem(LEGACY_KEY));
    if(old){
      store.admins=Array.isArray(old.admins)?old.admins:[];
      const rm=makeDefaultRoom('الغرفة الرئيسية');
      rm.set=ensureSetDefaults(old.set||{});
      rm.profiles=Array.isArray(old.profiles)?old.profiles:[];
      store.workspaces={'a.alhofufy@gmail.com':{rooms:[rm],activeRoomId:rm.id}};
      curRoom();
      saveStoreLocal();
      return;
    }
  }catch(e){}
  curRoom();
}

function saveStoreLocal(){
  try{
    const rm=curRoom();
    rm.profiles=store.profiles;
    rm.set=store.set;
    localStorage.setItem(KEY,JSON.stringify({
      admins:store.admins,
      workspaces:store.workspaces,
      activeAdmin:store.activeAdmin
    }));
  }catch(e){}
}

function saveStore(){
  saveStoreLocal();
  if(typeof scheduleCloudSync==='function')scheduleCloudSync();
}

const S=()=>curRoom().set;

function newProfile(name,emoji){
  const rm=curRoom(),s=rm.set;
  const p={
    id:'pl_'+uid(),
    name:name.slice(0,14),
    emoji:emoji||pickOne(EMO.filter(e=>!rm.profiles.some(x=>x.emoji===e)))||pickOne(EMO),
    on:true,
    level:s.level,
    topics:s.topics.slice(),
    tables:s.tables.slice(),
    games:0,
    wins:0,
    best:0,
    st:{t:{},tb:{},miss:{}}
  };
  rm.profiles.push(p);
  saveStore();
  return p;
}
const prof=id=>curRoom().profiles.find(p=>p.id===id);

function cfgOf(p){
  const s=S(),pr=prof(p.pid),own=(s.fair==='each'||s.fair==='both')&&pr;
  const base=own?pr.level:s.level,adj=(s.fair==='adaptive'||s.fair==='both')?p.adj:0;
  const tp=own&&pr.topics.length?pr.topics:s.topics.length?s.topics:['mul'];
  const tb=own&&pr.tables.length?pr.tables:s.tables.length?s.tables:ALLT;
  return{level:Math.max(0,Math.min(2,base+adj)),topics:tp,tables:tb};
}

function record(p,q,ok){
  const pr=prof(p.pid);if(!pr)return;
  const st=pr.st,inc=(o,k)=>{o[k]=o[k]||[0,0];o[k][ok?0:1]++};
  inc(st.t,q.topic);if(q.tbl)inc(st.tb,q.tbl);
  if(!ok){st.miss[q.show]=(st.miss[q.show]||0)+1;const ks=Object.keys(st.miss);if(ks.length>60)delete st.miss[ks[0]]}
  saveStore();
}

async function keepAwake(){try{if('wakeLock' in navigator&&!wake){wake=await navigator.wakeLock.request('screen');wake.addEventListener('release',()=>wake=null)}}catch(e){}}
