const $=s=>document.querySelector(s);
const ar=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pickOne=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

const COLORS=['#e0533d','#2f7fd6','#d99a00','#8a4fd1'];
const OFF=[[-14,-11],[14,-11],[-14,13],[14,13]];
const SIZES=[6,7,8,9,10];
const LEVELS=[['سهل',20],['متوسط',15],['صعب',12]];
const TOPICS=[['mul','الضرب'],['div','القسمة'],['add','الجمع'],['sub','الطرح'],['geo','الأشكال الهندسية']];
const FAIR=[['each','مستوى لكل لاعب'],['adaptive','صعوبة متكيفة'],['both','الاثنان معًا'],['one','مستوى واحد للجميع']];
const RULES=[['allq','⭐ سؤال الجميع'],['cards','🃏 بطاقات القدرات'],['steal','⚡ سرقة الإجابة'],['penalty','⚽ ضربة جزاء']];
const CARD={shield:['🛡️','درع'],double:['🎲','نرد مضاعف'],freeze:['❄️','تجميد'],swap:['🔄','تبديل السؤال']};
const REACT=['👏','🔥','😂','😱','⚽'];

let tables=new Set([1,2,3,4,5,6,7,8,9]),N=6,level=1,topics=new Set(['mul']);
let LAD={},SNK={},ALLQ=new Set(),SURP=new Set(),LAST=36;
let P=[],cur=0,won=false,tid=0,lastSec=0,epoch=0,recent=[],qSeq=0;
let mode='local',peer=null,seats=[],code='';
let G={phase:'busy'},paused=false,wake=null;

const QS=new URLSearchParams(location.search),PS=QS.get('ps');
const canNet=()=>/^https?:/.test(location.protocol);

/* ---------- Store ---------- */
const KEY='sullam-v2',EMO=['🦁','🐯','🦅','🐬','🦊','🐼','🚀','⚽','🌟','🐎','🦉','🐢'];
const ALLT=[1,2,3,4,5,6,7,8,9],MAXP=4;
const DEF={size:6,level:1,topics:['mul'],tables:ALLT.slice(),fair:'each',allq:true,cards:true,steal:true,penalty:true,mode:'multi'};
let store={profiles:[],set:{...DEF},admins:[]};

function loadStore(){
  try{
    const r=JSON.parse(localStorage.getItem(KEY));
    if(r&&r.profiles){
      store={profiles:r.profiles,set:{...DEF,...r.set},admins:Array.isArray(r.admins)?r.admins:[]};
    }
  }catch(e){}
}
function saveStore(){try{localStorage.setItem(KEY,JSON.stringify(store))}catch(e){}}
const S=()=>store.set;
const uid=()=>Math.random().toString(36).slice(2,10);

function newProfile(name,emoji){
  const s=S(),p={id:uid(),name:name.slice(0,14),emoji:emoji||pickOne(EMO.filter(e=>!store.profiles.some(x=>x.emoji===e))),on:true,level:s.level,topics:s.topics.slice(),tables:s.tables.slice(),games:0,wins:0,best:0,st:{t:{},tb:{},miss:{}}};
  store.profiles.push(p);saveStore();return p;
}
const prof=id=>store.profiles.find(p=>p.id===id);

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
