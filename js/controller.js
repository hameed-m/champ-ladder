/* ---------- Controller (player device, or host panel in one-device mode) ---------- */
let ctlState={qid:null,sent:false,left:0,at:0,total:1,paused:false},ctlBar=0;

function renderCtl(root,v,send){
  if(!root.firstChild){
    root.innerHTML=`<div class="who"><b class="c-who"></b><div class="dicebox c-dice">🎲</div></div>
    <div class="rt c-title"></div>
    <button class="btn c-ask" style="width:100%;margin-top:12px" hidden>ابدأ الدور — اعرض السؤال ❓</button>
    <button class="btn c-roll" style="width:100%;margin-top:12px" hidden>ارمِ النرد 🎲</button>
    <div class="c-choose" hidden style="margin-top:12px">
      <div class="choose-grid">
        <button class="btn c-fwd" style="width:100%"></button>
        <div class="c-push-box">
          <span class="h" style="margin:6px 0 4px">أو اختر خصمًا لإرجاعه للخلف:</span>
          <div class="c-targets"></div>
        </div>
        <button class="btn alt c-skip-turn" style="width:100%" hidden>تخطي الدور (الرقم أكبر من المتبقي)</button>
      </div>
    </div>
    <div class="cards c-cards"></div>
    <div class="c-q" hidden><div class="qfig c-fig"></div><div class="qt c-text"></div><div class="track"><i class="bar"></i></div><div class="opts c-opts"></div></div>
    <p class="msg c-msg" aria-live="polite"></p>
    <div class="reacts c-re" hidden>${REACT.map(e=>`<button class="mini" data-e="${e}" aria-label="تفاعل ${e}">${e}</button>`).join('')}</div>`;
    root.onclick=e=>{
      const t=e.target;
      if(t.closest('.c-ask')){t.closest('.c-ask').disabled=true;ensureOK();return root._send({t:'ask'})}
      if(t.closest('.c-roll')){t.closest('.c-roll').disabled=true;ensureOK();return root._send({t:'roll'})}
      if(t.closest('.c-fwd')&&!t.closest('.c-fwd').disabled){t.closest('.c-fwd').disabled=true;ensureOK();return root._send({t:'move',dir:'fwd'})}
      if(t.closest('.c-skip-turn')){t.closest('.c-skip-turn').disabled=true;ensureOK();return root._send({t:'move',dir:'skip'})}
      const tb=t.closest('[data-push]');
      if(tb&&!tb.disabled){tb.disabled=true;ensureOK();return root._send({t:'move',dir:'back',target:+tb.dataset.push})}
      const o=t.closest('.opt');
      if(o&&!ctlState.sent){ctlState.sent=true;return root._send({t:'answer',i:+o.dataset.i,id:ctlState.qid})}
      const c=t.closest('[data-c]');if(c)return root._send({t:'card',c:c.dataset.c});
      const r=t.closest('[data-e]');if(r)root._send({t:'react',e:r.dataset.e});
    };
  }
  root._send=send;
  const q$=s=>root.querySelector(s),hasQ=!!v.q;
  const canAsk=v.turn&&v.phase==='ready'&&!v.paused;
  const canRoll=v.turn&&v.phase==='roll'&&!v.paused;
  const canChoose=v.turn&&v.phase==='choose'&&!v.paused;
  q$('.c-who').innerHTML=v.phase==='end'?`🏆 ${esc(v.won||'')} فاز`:v.turn?`<i class="dot" style="background:${v.color}"></i> دورك يا ${esc(v.name)}`:`دور ${esc(v.cur)}`;
  q$('.c-dice').textContent=(v.turn||v.phase==='choose')&&v.dice?ar(v.dice):'🎲';
  q$('.c-title').textContent=v.paused?'⏸ اللعب متوقف':v.title||'';
  const askBtn=q$('.c-ask');askBtn.hidden=!canAsk;askBtn.disabled=false;
  const r=q$('.c-roll');r.hidden=!canRoll;r.disabled=false;

  const chBox=q$('.c-choose');
  chBox.hidden=!canChoose;
  if(canChoose){
    const fwdBtn=q$('.c-fwd'),skipBtn=q$('.c-skip-turn'),tBox=q$('.c-targets');
    const d=v.dice||0;
    if(v.canFwd){
      fwdBtn.hidden=false;
      fwdBtn.disabled=false;
      fwdBtn.textContent=`⬆️ تقدم للأمام (+${ar(d)} خانات)`;
      skipBtn.hidden=true;
    }else{
      fwdBtn.hidden=true;
      skipBtn.hidden=false;
      skipBtn.disabled=false;
    }
    const targets=v.targets||[];
    tBox.innerHTML=targets.map(tg=>`<button class="btn alt push-btn" data-push="${tg.i}"><i class="dot" style="background:${tg.color}"></i> إرجاع ${esc(tg.emoji)} ${esc(tg.name)} (−${ar(d)} من خانة ${ar(tg.pos)})</button>`).join('');
  }

  q$('.c-cards').innerHTML=v.cards.map(c=>{
    const usable=v.turn&&(
      (c==='freeze'&&(v.phase==='ready'||v.phase==='roll'))||
      (c==='double'&&v.phase==='roll')||
      (c==='swap'&&v.phase==='q')
    );
    return`<button class="chip w sm" data-c="${c}" ${usable?'':'disabled'}>${CARD[c][0]} ${CARD[c][1]}</button>`;
  }).join('');
  q$('.c-q').hidden=!hasQ;
  if(hasQ){
    if(v.qid!==ctlState.qid){
      ctlState.qid=v.qid;ctlState.sent=false;
      q$('.c-fig').innerHTML=v.q.fig;const tx=q$('.c-text');tx.textContent=v.q.text;tx.className='qt c-text'+(v.q.kind==='geo'?' geo':'');tx.dir=v.q.kind==='geo'?'rtl':'ltr';
      q$('.c-opts').innerHTML=v.q.opts.map((o,i)=>`<button class="opt${/[ء-ي]/.test(o)?' txt':''}" data-i="${i}">${esc(o)}</button>`).join('');
    }
    const os=[...q$('.c-opts').children];
    if(v.reveal)os.forEach((b,x)=>{if(v.q.opts[x]===v.reveal.ans)b.classList.add('ok');else if(x===v.reveal.pick)b.classList.add('bad')});
    if(v.out){os.forEach(b=>b.disabled=true)}
    ctlState.left=v.left;ctlState.total=v.total;ctlState.at=performance.now();ctlState.paused=v.paused||!!v.reveal;
  }else{ctlState.qid=null}
  const m=q$('.c-msg');m.textContent=v.msg||((v.phase==='ready'||v.phase==='roll'||v.phase==='choose')&&!v.turn?`بانتظار ${v.cur}`:'');
  q$('.c-re').hidden=!v.online;
}
function ensureOK(){try{keepAwake()}catch(e){}}
