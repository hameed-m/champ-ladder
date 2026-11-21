/* ---------- Host game ---------- */
function toMenu(){
  epoch++;clearInterval(tid);stopComment();stopCrowd();paused=false;
  seats.forEach(s=>{try{s.conn.send({t:'bye'})}catch(e){}});
  try{if(peer)peer.destroy()}catch(e){}peer=null;seats=[];
  $('#end').hidden=true;show('setup');renderSetup();
}
$('#again').onclick=()=>{$('#end').hidden=true;stopComment();startGame()};
$('#menu').onclick=toMenu;
$('#quit').onclick=toMenu;

function startGame(){
  if(!isAuthed()){show('setup');renderAuthUI();return}
  epoch++;paused=false;
  const s=S();N=s.size;LAST=N*N;
  if(s.theme&&!themePref.userPicked)setAppTheme(s.theme,false);
  P=seats.map((st,i)=>{const pr=prof(st.pid);return{i,pid:pr.id,token:st.token,name:pr.name,named:true,emoji:pr.emoji,color:COLORS[i],pos:1,score:0,correct:0,wrong:0,streak:0,wrun:0,adj:0,cards:[],recent:[],frozen:false,dbl:false,buzz:null}});
  cur=0;won=false;G={phase:'busy',msg:''};$('#cap').textContent='';
  genBoard();show('game');
  $('#pLocal').hidden=true;
  drawBoard();setTurn(true);
  startCrowd();whistle();
  comment(['welcome_0'],'أهلًا بكم في الملعب!');
}

const rankOf=i=>[...P].sort((a,b)=>b.pos-a.pos||b.score-a.score).findIndex(p=>p.i===i)+1;

function renderScore(){
  $('#score').innerHTML=P.map((p,i)=>{const off=mode==='online'&&!live(seats.find(s=>s.token===p.token));return`<div class="pl${i===cur?' on':''}${off?' off':''}"><i class="dot" style="background:${p.color}"></i><div><b>${p.emoji} ${esc(p.name)}</b><small>${off?'منقطع، ':''}${ar(p.score)} نقطة، خانة ${ar(p.pos)}${p.cards.length?' '+p.cards.map(c=>CARD[c][0]).join(''):''}</small></div></div>`}).join('');
}

function getPushTargets(playerIdx){
  if(!S().pushback||P.length<=1)return[];
  return P.filter((x,idx)=>idx!==playerIdx&&x.pos>1).map(x=>({i:x.i,name:x.name,emoji:x.emoji,pos:x.pos,color:x.color}));
}

function viewFor(i){
  const p=P[i],r=G.race&&G.race.qs[i],q=r||(G.phase==='q'&&i===cur?G.q:null);
  const canFwd=G.dice?(p.pos+G.dice<=LAST):true;
  const targets=(i===cur&&G.phase==='choose')?getPushTargets(i):[];
  const v={
    t:'view',
    phase:G.phase,
    paused,
    name:p.name,
    emoji:p.emoji,
    color:p.color,
    score:p.score,
    pos:p.pos,
    last:LAST,
    rank:rankOf(i),
    n:P.length,
    streak:p.streak,
    cards:p.cards,
    turn:i===cur,
    cur:P[cur].name,
    dice:G.dice||0,
    canFwd,
    targets,
    theme:S().theme||'green',
    board:getBoardData(),
    players:P.map(x=>({i:x.i,name:x.name,emoji:x.emoji,color:x.color,pos:x.pos,score:x.score,turn:x.i===cur})),
    msg:(i===cur||G.phase==='race'||G.phase==='end'||G.phase==='choose')?G.msg||'':'',
    title:G.race?G.race.title:'',
    left:G.left||0,
    total:G.total||1,
    online:mode==='online',
    buzz:p.buzz,
    out:G.race?G.race.out.includes(i):false,
    won:G.winner
  };
  if(q)Object.assign(v,{qid:q.id,q:{text:q.text,fig:q.fig||'',kind:q.kind,opts:q.opts},reveal:q.reveal?{ans:q.ans,pick:q.reveal.pick}:null});
  p.buzz=null;return v;
}

function push(i){
  if(i<0||!P[i])return;
  const s=seats.find(x=>x.token===P[i].token);
  if(live(s))try{s.conn.send(viewFor(i))}catch(e){}
}

function changed(){
  renderScore();renderHost();
  if(mode==='online')P.forEach((_,i)=>push(i));
  else renderCtl($('#ctl'),viewFor(cur),m=>act(cur,m));
}

function renderHost(){
  const p=P[cur],on=mode==='online';
  $('#wt').innerHTML=`<i class="dot" style="background:${p.color}"></i> دور ${p.emoji} ${esc(p.name)}`;
  $('#hp').hidden=!on;$('#ctl').hidden=on;
  $('#hDice').textContent=G.dice?ar(G.dice):'🎲';
  const off=on&&!live(seats.find(s=>s.token===p.token));
  $('#hTitle').textContent=paused?'⏸ اللعب متوقف':G.race?G.race.title:off?`${p.name} منقطع، بانتظار عودته`:'';
  $('#hq').innerHTML=!G.race&&G.phase==='q'?`${G.q.fig?`<div class="qfig">${G.q.fig}</div>`:''}<div class="qt ${G.q.kind==='geo'?'geo':''}" dir="${G.q.kind==='geo'?'rtl':'ltr'}">${esc(G.q.text)}</div>`:G.race?`<p class="hint">${G.race.ids.map(i=>P[i].emoji+' '+esc(P[i].name)+(G.race.out.includes(i)?' ✕':'')).join(' · ')}</p>`:'';
  $('#hTrack').hidden=!(G.phase==='q'||G.race);
  $('#hMsg').textContent=G.msg||(G.phase==='ready'?`${p.name} يستعد لعرض السؤال من جهازه`:G.phase==='roll'?`${p.name} يرمي النرد من جهازه`:G.phase==='choose'?`${p.name} يختار التقدم أو إرجاع خصم`:'');
  $('#hMsg').className='msg '+(G.mc||'');
  $('#pPause').textContent=paused?'▶ متابعة':'⏸ إيقاف';
  $('#pNewQ').disabled=G.phase!=='q';
  $('#pLocal').hidden=!(on&&P.some(x=>!live(seats.find(s=>s.token===x.token))));
  const fsHud=$('#hostFsHud');
  if(fsHud){
    fsHud.innerHTML=`<span><i class="dot" style="background:${p.color}"></i> دور <b>${esc(p.emoji)} ${esc(p.name)}</b> (خانة ${ar(p.pos)}/${ar(LAST)})</span><span>🎲 ${G.dice?ar(G.dice):'-'}</span><span>${esc(G.msg||'')}</span>`;
  }
}

const setMsg=(t,c)=>{G.msg=t;G.mc=c||''};
const gate=async ep=>{while(paused&&ep===epoch)await sleep(150);return ep===epoch};

function runTimer(ms,end){
  clearInterval(tid);G.left=G.total=ms;lastSec=0;$('#hBar').style.width='100%';
  tid=setInterval(()=>{
    if(paused||(mode==='online'&&G.phase==='q'&&!live(seats.find(s=>s.token===P[cur].token))))return;
    G.left-=100;
    const pc=Math.max(0,G.left/G.total*100)+'%';$('#hBar').style.width=pc;
    const b=$('#ctl .bar');if(b)b.style.width=pc;
    const s=G.left/1000;if(s>0&&s<=3&&Math.ceil(s)!==lastSec){lastSec=Math.ceil(s);SFX.warn()}
    if(G.left<=0){clearInterval(tid);end()}
  },100);
}

/* Turn flow: ready -> q -> roll -> (choose if pushback enabled & targets exist, else execute move) -> advance/pushback */
function setTurn(first){
  G.phase='ready';G.q=null;G.dice=0;setMsg('');
  P[cur].buzz='turn';changed();
}

const netRules=()=>mode==='online';

function ask(){
  const p=P[cur];
  G.q=makeQ(p);G.phase='q';
  let ms=(LEVELS[G.q.level][1]+(G.q.extra||0))*1000;
  if(p.frozen){ms/=2;p.frozen=false}
  setMsg('أجب إجابة صحيحة لترمي النرد وتتقدم!');
  runTimer(ms,()=>answer(-1));changed();
}

async function onRoll(){
  const ep=epoch,p=P[cur];G.phase='busy';changed();
  const anim=(async()=>{for(let i=0;i<9;i++){SFX.tick();$('#hDice').textContent=ar(rnd(1,6));await sleep(70)}})();
  await within(Promise.all([anim,comment([p,'roll'],`${p.name} يرمي النرد!`)]),4500);
  if(!await gate(ep))return;
  G.dice=rnd(1,6)+(p.dbl?rnd(1,6):0);p.dbl=false;changed();
  await within(comment(['n'+Math.min(100,G.dice)]),1500);
  if(!await gate(ep))return;

  const rem=LAST-p.pos;
  const over=G.dice>rem;
  const targets=getPushTargets(cur);

  if(S().pushback&&targets.length>0){
    G.phase='choose';
    if(over){
      setMsg(`🎲 ظهر ${ar(G.dice)} (أكبر من المتبقي ${ar(rem)}). يمكنك إرجاع خصم أو تخطي الدور!`,'bad');
    }else{
      setMsg(`🎲 ظهر ${ar(G.dice)}! اختر: التقدم للأمام أو إرجاع خصم ${ar(G.dice)} خانات`,'ok');
    }
    p.buzz='turn';
    changed();
    return;
  }

  await executeForwardMove(p,G.dice,ep);
}

async function executeForwardMove(p,d,ep){
  G.phase='busy';changed();
  const rem=LAST-p.pos;
  if(d>rem){
    SFX.bad();
    setMsg(`🎲 ظهر ${ar(d)} وتحتاج إلى ${ar(rem)} بالضبط للوصول للنهاية! انتظر الدور القادم.`,'bad');
    crowdFx('aww',.55);changed();
    await sleep(2200);
    if(ep!==epoch||won||!await gate(ep))return;
    cur=(cur+1)%P.length;setTurn();
    return;
  }
  await advance(p,d,ep);
  if(ep!==epoch||won||!await gate(ep))return;
  cur=(cur+1)%P.length;setTurn();
}

async function executePushOpponent(actor,targetIdx,d,ep){
  const target=P[targetIdx];
  if(!target||target===actor||target.pos<=1)return;
  G.phase='busy';
  setMsg(`↩️ ${actor.name} قرر إرجاع ${target.name} ${ar(d)} خانات للخلف!`,'ok');
  SFX.down();crowdFx('roar',.7);changed();
  await sleep(900);
  if(ep!==epoch||!await gate(ep))return;
  await stepBackTo(target,d,ep);
  if(ep!==epoch||!await gate(ep))return;
  await resolveSquareEffects(target,ep);
  if(ep!==epoch||won||!await gate(ep))return;
  cur=(cur+1)%P.length;setTurn();
}

function act(i,m){
  if(paused&&m.t!=='react')return;
  if(m.t==='react'){
    react(i,m.e);
    if(mode==='online')P.forEach((_,idx)=>pushSocketMsg(idx,{t:'fx',e:m.e,color:P[i].color}));
    return;
  }
  if(m.t==='ask'&&G.phase==='ready'&&i===cur)return ask();
  if(m.t==='roll'&&G.phase==='roll'&&i===cur)return onRoll();
  if(m.t==='move'&&G.phase==='choose'&&i===cur){
    if(m.dir==='fwd'||m.dir==='skip'){
      return executeForwardMove(P[cur],G.dice,epoch);
    }
    if(m.dir==='back'){
      const ti=+m.target;
      if(ti>=0&&ti<P.length&&ti!==cur&&P[ti].pos>1){
        return executePushOpponent(P[cur],ti,G.dice,epoch);
      }
    }
    return;
  }
  if(m.t==='answer'){
    if(G.phase==='q'&&i===cur&&!G.q.reveal&&m.id===G.q.id)return answer(+m.i);
    if(G.phase==='race'&&G.race&&G.race.qs[i]&&m.id===G.race.qs[i].id)return raceAnswer(i,+m.i);
  }
  if(m.t==='card'&&i===cur)useCard(i,m.c);
}

function pushSocketMsg(i,msg){
  if(i<0||!P[i])return;
  const s=seats.find(x=>x.token===P[i].token);
  if(live(s))try{s.conn.send(msg)}catch(e){}
}

function gainCard(p){
  if(!S().cards||p.cards.length>=3)return false;
  const c=pickOne(Object.keys(CARD));p.cards.push(c);p.buzz='good';return c;
}

function useCard(i,c){
  const p=P[i],at=p.cards.indexOf(c);if(at<0)return;
  if(c==='double'&&G.phase==='roll'&&!p.dbl){
    p.cards.splice(at,1);p.dbl=true;comment(['double'],'نرد مضاعف!');setMsg('🎲 ستُرمى نردان في هذا الدور','ok');changed();
  }
  if(c==='freeze'&&(G.phase==='ready'||G.phase==='roll')&&P.length>1){
    p.cards.splice(at,1);P[(cur+1)%P.length].frozen=true;comment(['freeze'],'تجميد! وقت اللاعب التالي نصف!');setMsg('❄️ وقت اللاعب التالي نصف');changed();
  }
  if(c==='swap'&&G.phase==='q'&&!G.q.reveal){
    p.cards.splice(at,1);comment(['swap'],'تبديل السؤال!');ask();
  }
}

const reactAt={};
function react(i,e){
  const now=Date.now();if(now-(reactAt[i]||0)<1200||!REACT.includes(e))return;reactAt[i]=now;
  spawnFx('#fx',e,P[i].color);
}
function spawnFx(sel,e,color){
  const box=$(sel);if(!box)return;
  const d=document.createElement('span');d.className='fl';d.textContent=e;d.style.insetInlineStart=rnd(8,86)+'%';d.style.background=color||'#2f7fd6';
  box.appendChild(d);setTimeout(()=>d.remove(),2400);
}

async function answer(i){
  if(G.phase!=='q'||G.q.reveal)return;
  clearInterval(tid);
  const ep=epoch,p=P[cur],q=G.q,left=Math.max(0,G.left/1000),T=G.total/1000,ok=i>=0&&q.opts[i]===q.ans;
  q.reveal={pick:i};record(p,q,ok);
  if(ok){
    p.correct++;p.streak++;p.wrun=0;
    if(p.streak%3===0)p.adj++;
    const hot=p.streak>=3,fast=left/T>.65,pts=10+q.level*5+Math.round(left/T*5)+(hot?5:0);p.score+=pts;p.buzz='good';
    const card=p.streak%3===0?gainCard(p):false;
    setMsg(`صحيح! +${ar(pts)} نقطة`+(hot?' 🔥':'')+(card?` ${CARD[card][0]} بطاقة ${CARD[card][1]}`:''),'ok');
    SFX.ok();crowdFx(hot?'chant':'cheer',hot?.8:.65);changed();
    await within(comment([hot?'streak':fast?'fast':'correct'],hot?'سلسلة نارية! الجمهور يشتعل!':fast?'بسرعة البرق!':'إجابة صحيحة! يا سلام!'),3800);
    if(!await gate(ep))return;
    G.q=null;G.phase='roll';
    setMsg('أحسنت! ارمِ النرد الآن 🎲','ok');
    p.buzz='turn';changed();
    return;
  }else{
    p.wrong++;p.streak=0;p.wrun++;p.buzz='bad';if(p.wrun===2){p.adj--;p.wrun=0}
    SFX.bad();setMsg((i<0?'انتهى الوقت! ':'إجابة خاطئة! ')+`الصحيح: ${q.show}`,'bad');
    crowdFx('aww',.6);if(i<0)whistle();changed();
    await within(Promise.all([sleep(2200),comment([i<0?'timeout':'wrong'],i<0?'انتهى الوقت! الحكم يطلق الصافرة!':'يا خسارة! الكرة خارج المرمى!')]),4800);
    if(!await gate(ep))return;
    if(S().steal&&netRules()&&P.length>1){
      const ids=P.filter(x=>x.i!==cur&&connected(x)).map(x=>x.i);
      if(ids.length){
        comment(['steal'],'الفرصة مفتوحة! من يخطف الإجابة؟');
        const w=await race(ids,'⚡ سرقة الإجابة! الأسرع يأخذ ١٠ نقاط',10000,ep);
        if(ep!==epoch)return;
        if(w>=0){P[w].score+=10;P[w].buzz='good';setMsg(`⚡ ${P[w].name} خطف ١٠ نقاط!`,'ok');crowdFx('cheer',.6);changed();await within(comment(['stolen'],`${P[w].name} خطفها!`),3000)}
      }
    }
  }
  if(ep!==epoch||won||!await gate(ep))return;
  cur=(cur+1)%P.length;setTurn();
}

const connected=p=>mode!=='online'||live(seats.find(s=>s.token===p.token));

function race(ids,title,ms,ep){
  return new Promise(res=>{
    const qs={};ids.forEach(i=>{const q=makeQ(P[i]);qs[i]=q;P[i].buzz='turn'});
    G.phase='race';G.race={ids,qs,out:[],title,res};
    runTimer(ms,()=>endRace(-1));changed();
  });
}
function endRace(w){
  clearInterval(tid);const r=G.race;if(!r)return;
  G.race=null;G.phase='busy';changed();r.res(w);
}
function raceAnswer(i,idx){
  const r=G.race;if(r.out.includes(i))return;
  const q=r.qs[i],p=P[i],ok=q.opts[idx]===q.ans;
  record(p,q,ok);
  if(ok){p.correct++;endRace(i);return}
  p.wrong++;r.out.push(i);p.buzz='bad';
  if(r.ids.every(x=>r.out.includes(x)||!connected(P[x])))endRace(-1);else changed();
}

async function stepTo(p,k,ep){
  for(let i=0;i<k&&p.pos<LAST;i++){
    p.pos++;place(p);SFX.step();changed();
    await sleep(260);if(ep!==epoch)return;
  }
  renderScore();
}

async function stepBackTo(p,k,ep){
  for(let i=0;i<k&&p.pos>1;i++){
    p.pos--;place(p);SFX.step();changed();
    await sleep(260);if(ep!==epoch)return;
  }
  renderScore();
}

function finishIf(p){if(p.pos>=LAST){finish(p);return true}return false}

async function advance(p,d,ep){
  await stepTo(p,d,ep);if(ep!==epoch||finishIf(p))return;
  await resolveSquareEffects(p,ep);
}

async function resolveSquareEffects(p,ep){
  if(ep!==epoch||finishIf(p))return;
  const from=p.pos,to=LAD[from]||SNK[from],up=!!LAD[from];
  const shield=to&&!up&&p.cards.includes('shield');
  if(shield){
    p.cards.splice(p.cards.indexOf('shield'),1);setMsg(`🛡️ الدرع أنقذ ${p.name} من الحية!`,'ok');crowdFx('cheer',.6);SFX.up();changed();
    await within(comment(['shield'],'الدرع ينقذه من الحية!'),3500);
  }else if(to){
    setMsg(up?`🪜 سلّم! ${p.name} يصعد إلى ${ar(to)}`:`🐍 حية! ${p.name} ينزل إلى ${ar(to)}`,up?'ok':'bad');
    p.buzz=up?'good':'bad';up?SFX.up():SFX.down();crowdFx(up?'cheer':'aww',.65);changed();
    const c=within(comment([up?'ladder':'snake','n'+to],up?`صعود صاروخي إلى الخانة ${ar(to)}!`:`يا للهول! الحية تُنزله إلى الخانة ${ar(to)}!`),6000);
    await sleep(700);if(ep!==epoch)return;
    p.pos=to;place(p);changed();
    await Promise.all([sleep(700),c]);
    if(ep!==epoch||finishIf(p))return;
  }else{
    await within(comment(['move','n'+from],`${p.name} في الخانة ${ar(from)}!`),3500);
  }
  if(!await gate(ep))return;
  if(SURP.has(p.pos)){
    const c=gainCard(p);if(!c)p.score+=5;
    setMsg(c?`🎁 مفاجأة لـ ${p.name}! ${CARD[c][0]} بطاقة ${CARD[c][1]}`:`🎁 مفاجأة لـ ${p.name}! +٥ نقاط`,'ok');changed();
    await within(comment(['surprise'],'مفاجأة!'),2600);
    if(!await gate(ep))return;
  }
  if(ALLQ.has(p.pos)&&S().allq&&netRules()&&P.length>1){
    const ids=P.filter(connected).map(x=>x.i);
    comment(['all'],'سؤال للجميع! الأسرع يفوز!');
    const w=await race(ids,'⭐ سؤال الجميع! الأسرع يتقدم ٣ خانات',14000,ep);
    if(ep!==epoch)return;
    if(w>=0){
      const q=P[w];q.score+=15;q.buzz='good';setMsg(`⭐ ${q.name} كان الأسرع!`,'ok');crowdFx('cheer',.7);changed();
      await within(comment(['allwin'],`${q.name} الأسرع!`),3000);
      if(q.pos+3<=LAST){
        await stepTo(q,3,ep);if(ep!==epoch||finishIf(q))return;
      }
    }
    if(!await gate(ep))return;
  }
  const rival=S().penalty&&netRules()&&p.pos>1?P.find(x=>x!==p&&x.pos===p.pos&&connected(x)):null;
  if(rival){
    comment(['penalty'],'ضربة جزاء! مواجهة مباشرة!');
    const w=await race([p.i,rival.i],`⚽ ضربة جزاء: ${p.name} ضد ${rival.name}`,12000,ep);
    if(ep!==epoch)return;
    if(w>=0){
      const q=P[w];q.score+=15;q.buzz='good';setMsg(`⚽ ${q.name} فاز بالمواجهة!`,'ok');crowdFx('cheer',.7);changed();
      await within(comment(['penwin'],`${q.name} يسجل!`),3000);
      if(q.pos+2<=LAST){
        await stepTo(q,2,ep);if(ep!==epoch)return;finishIf(q);
      }
    }
  }
}

function finish(p){
  won=true;clearInterval(tid);G.phase='end';G.winner=p.name;SFX.win();whistle();crowdFx('roar',.95);
  setMsg(`🏆 ${p.name} يفوز!`,'ok');
  comment(['win'],`هدف! ${p.name} يفوز بالمباراة!`);
  P.forEach(x=>{const pr=prof(x.pid);if(pr){pr.games++;pr.best=Math.max(pr.best,x.score);if(x===p)pr.wins++}});saveStore();
  changed();
  const rank=[...P].sort((a,b)=>(b===p)-(a===p)||b.pos-a.pos||b.score-a.score);
  if(typeof sbLogMatch==='function'){
    sbLogMatch(p.name,rank.map((x,idx)=>({rank:idx+1,name:x.name,score:x.score,correct:x.correct,wrong:x.wrong,pos:x.pos})));
  }
  $('#winner').textContent='🏆 '+p.name+' يفوز!';
  $('#rank').innerHTML=rank.map(x=>`<li><i class="dot" style="background:${x.color}"></i><b>${x.emoji} ${esc(x.name)}</b><span>${ar(x.score)} نقطة، ${ar(x.correct)} من ${ar(x.correct+x.wrong)} صحيحة</span></li>`).join('');
  $('#end').hidden=false;
  $('#resTxt').value=`نتيجة لعبة سلّم الأبطال 🏟️\n🏆 الفائز: ${p.name}\n`+rank.map((x,i)=>`${ar(i+1)}. ${x.name}: ${ar(x.score)} نقطة، ${ar(x.correct)} من ${ar(x.correct+x.wrong)} صحيحة`).join('\n');
  $('#copy').textContent='نسخ النتيجة';
}

$('#copy').onclick=async()=>{
  const t=$('#resTxt');
  try{await navigator.clipboard.writeText(t.value);$('#copy').textContent='تم النسخ ✓';return}catch(e){}
  t.focus();t.select();
  try{if(document.execCommand('copy')){$('#copy').textContent='تم النسخ ✓';return}}catch(e){}
  $('#copy').textContent='حدّد النص وانسخه يدويًا';
};

/* Parent controls */
$('#pPause').onclick=()=>{paused=!paused;if(paused)stopComment();changed()};
$('#pNewQ').onclick=()=>{if(G.phase==='q'&&!G.q.reveal&&!paused)ask()};
$('#pSkip').onclick=()=>{
  if(won||(G.phase!=='ready'&&G.phase!=='roll'&&G.phase!=='q'&&G.phase!=='choose'))return;
  clearInterval(tid);epoch++;paused=false;stopComment();cur=(cur+1)%P.length;setTurn();
};
$('#pLocal').onclick=()=>{
  mode='local';seats.forEach(s=>{try{s.conn.send({t:'bye'})}catch(e){}});
  try{if(peer)peer.destroy()}catch(e){}peer=null;
  if(G.race){const r=G.race;endRace(-1);void r}
  changed();
};
