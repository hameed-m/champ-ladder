/* ---------- Audio engine ---------- */
let AC=null,master,voiceBus,crowdBus,ambGain=null,ambSrc=null,muted=false,crowdOn=true;
const cache={},custom={},lastPick={};
let VOICE={},VNAMES={};

async function loadVoices(){
  if(!/^https?:/.test(location.protocol))return;
  try{const r=await fetch('voices/manifest.json',{cache:'no-cache'});if(!r.ok)return;const m=await r.json();VOICE=m.clips||{};VNAMES=m.names||{}}catch(e){}
}

function ensureAC(){
  if(!AC){
    AC=new (window.AudioContext||window.webkitAudioContext)();
    master=AC.createGain();master.gain.value=muted?0:1;
    const lim=AC.createDynamicsCompressor();lim.threshold.value=-8;lim.ratio.value=8;
    master.connect(lim);lim.connect(AC.destination);
    voiceBus=AC.createGain();voiceBus.connect(master);
    crowdBus=AC.createGain();crowdBus.gain.value=crowdOn?1:0;crowdBus.connect(master);
  }
  if(AC.state==='suspended')AC.resume();
}

const decode=ab=>new Promise((ok,no)=>AC.decodeAudioData(ab,ok,no));
async function buf(k){
  if(custom[k]){
    if(!cache['u:'+k])cache['u:'+k]=await decode(custom[k].slice(0));
    return cache['u:'+k];
  }
  if(cache[k])return cache[k];
  const file=k.startsWith('name:')?VNAMES[k.slice(5)]:VOICE[k];
  if(file){try{const r=await fetch('voices/'+encodeURIComponent(file));if(r.ok)return cache[k]=await decode(await r.arrayBuffer())}catch(e){}}
  const b=atob(AUD[k]),u=new Uint8Array(b.length);
  for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);
  return cache[k]=await decode(u.buffer);
}
function preload(){Object.keys(AUD).filter(k=>!/^n\d/.test(k)).forEach(k=>buf(k).catch(()=>{}))}

async function playBuf(k,bus,vol,rate){
  ensureAC();
  const b=await buf(k),s=AC.createBufferSource(),g=AC.createGain();
  s.buffer=b;s.playbackRate.value=rate||1;g.gain.value=vol==null?1:vol;
  s.connect(g);g.connect(bus);s.start();
  return s;
}

/* Crowd */
const AMB_VOL=.2,AMB_DUCK=.09;
async function startCrowd(){
  stopCrowd();ensureAC();
  const k='amb',ep=epoch;
  try{
    const b=await buf(k);if(ep!==epoch)return;
    const s=AC.createBufferSource(),g=AC.createGain();
    s.buffer=b;s.loop=true;
    if(!custom[k]){s.loopStart=.2;s.loopEnd=Math.min(b.duration,16.2)}
    g.gain.setValueAtTime(.0001,AC.currentTime);g.gain.linearRampToValueAtTime(AMB_VOL,AC.currentTime+1.5);
    s.connect(g);g.connect(crowdBus);s.start(0,custom[k]?0:.2);ambSrc=s;ambGain=g;
  }catch(e){}
}
function stopCrowd(){
  try{if(ambSrc){const s=ambSrc,g=ambGain,t=AC.currentTime;g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(.0001,t,.15);s.stop(t+.8)}}catch(e){}
  ambSrc=ambGain=null;
}
function duck(on){try{if(ambGain)ambGain.gain.setTargetAtTime(on?AMB_DUCK:AMB_VOL,AC.currentTime,.12)}catch(e){}}
function crowdFx(k,vol){if(muted||!crowdOn)return;const key=(k==='cheer'||k==='roar')&&custom.cheer?'cheer':k;playBuf(key,crowdBus,vol).catch(()=>{})}

/* Commentator: fixed clips + device voice for player names */
let cTok=0,cSrc=null;
function stopComment(){
  cTok++;try{if(cSrc)cSrc.stop()}catch(e){}cSrc=null;
  try{if('speechSynthesis' in window&&(speechSynthesis.speaking||speechSynthesis.pending))speechSynthesis.cancel()}catch(e){}
}
function clipFor(ev){
  if(custom[ev]||AUD[ev]||VOICE[ev])return ev;
  const src=Object.keys(VOICE).some(k=>k.startsWith(ev+'_'))?VOICE:AUD;
  const opts=Object.keys(src).filter(k=>k.startsWith(ev+'_'));
  if(!opts.length)return null;
  let k;do{k=pickOne(opts)}while(opts.length>1&&k===lastPick[ev]);
  return lastPick[ev]=k;
}
function arVoices(){try{return speechSynthesis.getVoices().filter(x=>x.lang&&x.lang.toLowerCase().replace('_','-').startsWith('ar'))}catch(e){return[]}}
function pickVoice(){
  const vs=arVoices(),sel=$('#voiceSel').value;
  return vs.find(x=>x.name===sel)||vs.find(x=>/majed|maged|tarik|tareq|naayf|hamed|ahmed|male/i.test(x.name)&&!/female/i.test(x.name))||vs.find(x=>!/laila|mariam|zeina|noura|salma|amira|female/i.test(x.name))||vs[0];
}
function speakDevice(text){
  return new Promise(res=>{
    let done=false,to;const end=ok=>{if(done)return;done=true;clearTimeout(to);res(ok)};
    try{
      const v=pickVoice();if(!v)return end(false);
      const u=new SpeechSynthesisUtterance(text);u.lang=v.lang;u.voice=v;
      u.rate=1.15;u.pitch=1;u.volume=1;
      u.onend=()=>end(true);u.onerror=()=>end(false);
      to=setTimeout(()=>end(true),700+text.length*260);
      speechSynthesis.resume();speechSynthesis.speak(u);
    }catch(e){end(false)}
  });
}
function clipPlay(k,tok){
  return new Promise(async res=>{
    if(tok!==cTok)return res();
    try{
      const s=await playBuf(k,voiceBus,1,1);
      if(tok!==cTok){try{s.stop()}catch(e){}return res()}
      cSrc=s;const to=setTimeout(res,s.buffer.duration*1000+400);
      s.onended=()=>{clearTimeout(to);res()};
    }catch(e){res()}
  });
}
async function comment(parts,cap){
  stopComment();const tok=cTok;
  if(cap!=null)$('#cap').textContent=cap;
  if(muted)return;
  ensureAC();duck(true);
  let skipNum=false;
  for(const part of parts){
    if(tok!==cTok)return;
    if(typeof part==='object'){
      if(VNAMES[part.name])await clipPlay('name:'+part.name,tok);
      else{
        const nm=part.named&&arVoices().length?await speakDevice(part.name):false;
        if(!nm)await clipPlay('p_'+(part.i+1),tok);
      }
    }else if(/^n\d/.test(part)){
      if(!skipNum)await clipPlay(part,tok);
    }else{
      skipNum=!!custom[part];
      const k=clipFor(part);if(k)await clipPlay(k,tok);
    }
  }
  if(tok===cTok)duck(false);
}
const within=(p,ms)=>Promise.race([p,sleep(ms)]);

function snd(f,d,type,v,t,f2){
  try{
    if(muted)return;ensureAC();
    const o=AC.createOscillator(),g=AC.createGain(),s=AC.currentTime+(t||0);
    o.type=type||'sine';o.frequency.setValueAtTime(f,s);
    if(f2)o.frequency.exponentialRampToValueAtTime(f2,s+d);
    g.gain.setValueAtTime(v||.15,s);g.gain.exponentialRampToValueAtTime(.001,s+d);
    o.connect(g);g.connect(master);o.start(s);o.stop(s+d);
  }catch(e){}
}
function whistle(){
  try{
    if(muted)return;ensureAC();
    [[0,.28],[.34,.75]].forEach(([at,d])=>{
      const s=AC.currentTime+at,g=AC.createGain(),lfo=AC.createOscillator(),lg=AC.createGain();
      lfo.frequency.value=38;lg.gain.value=90;lfo.connect(lg);
      [2350,2520].forEach(f=>{const o=AC.createOscillator();o.frequency.value=f;lg.connect(o.frequency);o.connect(g);o.start(s);o.stop(s+d)});
      lfo.start(s);lfo.stop(s+d);
      g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(.09,s+.02);g.gain.setValueAtTime(.09,s+d-.04);g.gain.exponentialRampToValueAtTime(.0001,s+d);
      g.connect(master);
    });
  }catch(e){}
}
const SFX={
  tick:()=>snd(500+Math.random()*300,.05,'square',.05),
  step:()=>snd(660,.08,'triangle',.09),
  ok:()=>{snd(660,.15,'sine',.14);snd(880,.25,'sine',.14,.12)},
  bad:()=>snd(220,.35,'sawtooth',.09,0,110),
  up:()=>[523,659,784,1047].forEach((f,i)=>snd(f,.15,'triangle',.13,i*.1)),
  down:()=>snd(700,.7,'sawtooth',.08,0,120),
  win:()=>[523,659,784,659,784,1047].forEach((f,i)=>snd(f,.22,'square',.06,i*.15)),
  warn:()=>snd(900,.08,'square',.07)
};

/* Custom recordings */
const SLOTS=[['win','الفوز','بدل عبارة «هدف»'],['correct','إجابة صحيحة',''],['wrong','إجابة خاطئة',''],['ladder','السلّم',''],['snake','الحية',''],['cheer','هتاف الجمهور','عند الصواب والفوز'],['amb','أجواء الملعب','يتكرر طوال اللعب']];
let dbP=null;
function db(){
  return dbP=dbP||new Promise((ok,no)=>{const r=indexedDB.open('sullam-sounds',1);r.onupgradeneeded=()=>r.result.createObjectStore('c');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
}
async function dbDo(mode,fn){const d=await db();return new Promise((ok,no)=>{const t=d.transaction('c',mode),r=fn(t.objectStore('c'));t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>no(t.error)})}
async function loadCustom(){
  try{
    const ks=await dbDo('readonly',s=>s.getAllKeys());
    for(const k of ks)custom[k]=await dbDo('readonly',s=>s.get(k));
  }catch(e){}
  renderSlots();
}
function renderSlots(){
  $('#slots').innerHTML=SLOTS.map(([k,t,h])=>`<div class="slot"><span><b>${t}</b><small>${custom[k]?'تسجيلك الخاص':(h||'الصوت الجاهز')}</small></span><label class="mini">رفع<input type="file" accept="audio/*" data-up="${k}" aria-label="رفع ${t}"></label><button class="mini" data-play="${k}" aria-label="تشغيل ${t}">▶</button>${custom[k]?`<button class="mini" data-del="${k}" aria-label="حذف ${t}">✕</button>`:''}</div>`).join('');
}
$('#slots').onchange=async e=>{
  const k=e.target.dataset.up,f=e.target.files&&e.target.files[0];if(!k||!f)return;
  const m=$('#err');m.textContent='';
  if(f.size>8e6){m.textContent='الملف كبير، اختر تسجيلًا أقل من ٨ ميجابايت.';return}
  const ab=await f.arrayBuffer();
  try{ensureAC();await decode(ab.slice(0))}catch(x){m.textContent='تعذّر تشغيل هذا الملف، جرّب ملف MP3.';return}
  custom[k]=ab;delete cache['u:'+k];
  try{await dbDo('readwrite',s=>s.put(ab,k))}catch(x){m.textContent='سيعمل التسجيل الآن، لكن المتصفح لن يحفظه بعد الإغلاق.'}
  renderSlots();
};
$('#slots').onclick=async e=>{
  const pl=e.target.closest('[data-play]'),dl=e.target.closest('[data-del]');
  if(pl){const k=pl.dataset.play;ensureAC();if(k==='cheer'||k==='amb')playBuf(k,crowdBus,.6).then(s=>{try{s.stop(AC.currentTime+5)}catch(x){}}).catch(()=>{});else comment([k])}
  if(dl){const k=dl.dataset.del;delete custom[k];delete cache['u:'+k];try{await dbDo('readwrite',s=>s.delete(k))}catch(x){}renderSlots()}
};
