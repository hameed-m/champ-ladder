/* ---------- Client ---------- */
let cRetry=0,cLast=0,cConn=null,cTimer=0,cCode='',cSeated=false,cBarOn=false;
const cToken=()=>{const k='sullam-token';let t;try{t=localStorage.getItem(k)}catch(e){}if(!t){t=uid()+uid();try{localStorage.setItem(k,t)}catch(e){}}return t};

function connMsg(t,m,back){show('connect');$('#connT').textContent=t;$('#connM').textContent=m;$('#connBack').hidden=!back}
$('#connBack').onclick=()=>{location.href=location.pathname+(PS?'?ps='+PS:'')};

function startClient(c){
  mode='client';cCode=c;keepAwake();connMsg('جارٍ الاتصال…','نبحث عن المباراة '+c);
  try{if(peer)peer.destroy()}catch(e){}
  peer=new Peer(undefined,peerOpts());
  peer.on('open',()=>cConnect());
  peer.on('error',e=>{
    if(e.type==='peer-unavailable'){if(!cSeated&&cRetry>2)return connMsg('لم أجد المباراة','تأكد من الرمز وأن الجهاز الأساسي ما زال في غرفة الانتظار.',true);return scheduleRetry()}
    if(!cSeated&&cRetry>3)return connMsg('تعذر الاتصال','تحقق من الإنترنت ثم أعد المحاولة.',true);
    scheduleRetry();
  });
  peer.on('disconnected',()=>{try{if(!peer.destroyed)peer.reconnect()}catch(e){}});
  clearInterval(cTimer);
  cTimer=setInterval(()=>{
    if(cConn&&cConn.open&&Date.now()-cLast>12000){setStatus('انقطع الاتصال، جارٍ إعادة المحاولة…');try{cConn.close()}catch(e){}cConn=null;cConnect()}
    if(cConn&&cConn.open)try{cConn.send({t:'pong'})}catch(e){}
  },4000);
  if(!cBarOn){cBarOn=true;setInterval(tickBar,100)}
}

function tickBar(){
  const b=$('#ctlC .bar');if(!b||ctlState.paused)return;
  const l=ctlState.left-(performance.now()-ctlState.at);b.style.width=Math.max(0,l/ctlState.total*100)+'%';
}
function scheduleRetry(){cRetry++;setTimeout(()=>{if(mode==='client'&&!(cConn&&cConn.open))cConnect()},Math.min(5000,800*cRetry))}
function setStatus(t){$('#cStatus').textContent=t}

function cConnect(){
  if(!peer||peer.destroyed)return startClient(cCode);
  if(peer.disconnected)try{peer.reconnect()}catch(e){}
  const c=peer.connect('sullam-'+cCode,{reliable:true});cConn=c;
  const to=setTimeout(()=>{if(!c.open&&c===cConn){try{c.close()}catch(e){}scheduleRetry()}},8000);
  c.on('open',()=>{clearTimeout(to);cRetry=0;cLast=Date.now();setStatus('');c.send({t:'hello',token:cToken()})});
  c.on('data',cData);
  c.on('close',()=>{if(c===cConn){cConn=null;setStatus('انقطع الاتصال، جارٍ إعادة المحاولة…');scheduleRetry()}});
  c.on('error',()=>{});
}

function buzz(k){try{navigator.vibrate&&navigator.vibrate({turn:[120,60,120],good:60,bad:[200]}[k]||0)}catch(e){}}

function cData(m){
  cLast=Date.now();
  if(m.t==='ping')return;
  if(m.t==='pickme'){
    show('pick');
    $('#pickList').innerHTML=m.list.map(p=>`<button class="btn alt pk" data-p="${esc(p.id)}">${esc(p.emoji)} ${esc(p.name)}</button>`).join('')||'';
  }
  if(m.t==='wait'){cSeated=true;show('client');setStatus('');$('#cMe').innerHTML=`<p class="hint" style="text-align:center;font-size:20px">مرحبًا ${esc(m.name)}! بانتظار بدء المباراة…</p>`;$('#ctlC').innerHTML=''}
  if(m.t==='full')connMsg('المباراة مكتملة','بدأت المباراة أو اكتمل عدد اللاعبين.',true);
  if(m.t==='kicked'){try{localStorage.removeItem('sullam-token')}catch(e){}cSeated=false;cConn=null;connMsg('خرجت من الغرفة','أخرجك الوالد من هذه المباراة.',true)}
  if(m.t==='bye'){cConn=null;clearInterval(cTimer);connMsg('انتهت الجلسة','أغلق الجهاز الأساسي الغرفة.',true)}
  if(m.t==='view'){
    cSeated=true;show('client');setStatus('');
    if(m.buzz)buzz(m.buzz);
    $('#cMe').innerHTML=`<div class="me"><span style="background:${m.color}">${esc(m.emoji)}</span><div><b>${esc(m.name)}</b><small>المركز ${ar(m.rank)} من ${ar(m.n)}، خانة ${ar(m.pos)} من ${ar(m.last)}${m.streak>1?`، 🔥 ${ar(m.streak)}`:''}</small></div><strong>${ar(m.score)}</strong></div>`;
    renderCtl($('#ctlC'),m,x=>{try{cConn.send(x)}catch(e){}});
  }
}

$('#pickList').onclick=e=>{const b=e.target.closest('[data-p]');if(b)cConn.send({t:'pick',pid:b.dataset.p,token:cToken()})};
$('#pickGo').onclick=()=>{const v=$('#pickName').value.trim();if(v)cConn.send({t:'pick',name:v,token:cToken()})};
