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
const KEY='sullam-v3',LEGACY_KEY='sullam-v2';
const EMO=['🦁','🐯','🦅','🐬','🦊','🐼','🚀','⚽','🌟','🐎','🦉','🐢'];
const ALLT=[1,2,3,4,5,6,7,8,9],MAXP=6;
const DEF={size:6,level:1,topics:['mul'],tables:ALLT.slice(),fair:'each',ladders:true,snakes:true,pushback:true,allq:true,cards:true,steal:true,penalty:true,mode:'multi'};

const uid=()=>Math.random().toString(36).slice(2,10);
const genCode=()=>String(rnd(100000,999999));

let store={
  admins:[],
  workspaces:{},
  activeAdmin:'a.alhofufy@gmail.com',
  profiles:[],
  set:{...DEF}
};

function makeDefaultRoom(name){
  return{
    id:'rm_'+uid(),
    name:name||'الغرفة الرئيسية',
    code:genCode(),
    set:{...DEF},
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
  rm.set={...DEF,...(rm.set||{})};
  rm.profiles=Array.isArray(rm.profiles)?rm.profiles:[];
  if(!rm.code||!/^\d{6}$/.test(rm.code))rm.code=genCode();
  // Bind active room references for direct access
  store.profiles=rm.profiles;
  store.set=rm.set;
  return rm;
}

function setAdminRooms(email,rooms){
  const em=String(email||store.activeAdmin).trim().toLowerCase();
  const ws=getAdminWorkspace(em);
  if(Array.isArray(rooms)&&rooms.length){
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
  try{
    const r=JSON.parse(localStorage.getItem(KEY));
    if(r&&r.workspaces){
      store.admins=Array.isArray(r.admins)?r.admins:[];
      store.workspaces=r.workspaces;
      store.activeAdmin=r.activeAdmin||'a.alhofufy@gmail.com';
      curRoom();
      return;
    }
    // Migrate from sullam-v2 if present
    const old=JSON.parse(localStorage.getItem(LEGACY_KEY));
    if(old){
      store.admins=Array.isArray(old.admins)?old.admins:[];
      const rm=makeDefaultRoom('الغرفة الرئيسية');
      rm.set={...DEF,...(old.set||{})};
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
