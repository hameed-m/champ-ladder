/* ---------- Network ---------- */
function peerOpts(){if(!PS)return{debug:0};const[h,pt]=PS.split(':');return{host:h,port:+pt,path:'/',secure:false,debug:0}}
function joinUrl(c){return location.origin+location.pathname+'?j='+c+(PS?'&ps='+PS:'')}

function openRoom(forceNewCode){
  if(!isAuthed()){show('setup');renderAuthUI();return}
  const rm=curRoom();
  mode='online';seats=[];show('lobby');renderLobby();
  $('#lobRoomName').textContent=`🏠 ${rm.name}`;
  $('#lobLocal').hidden=true;$('#netMsg').textContent='جارٍ تجهيز الغرفة…';
  try{if(peer)peer.destroy()}catch(e){}
  if(forceNewCode||!rm.code||!/^\d{6}$/.test(rm.code)){
    rm.code=String(rnd(100000,999999));
    saveStore();
  }
  code=rm.code;
  let opened=false;
  const pr=new Peer('sullam-'+code,peerOpts());peer=pr;
  const fail=setTimeout(()=>{if(!opened&&pr===peer)netFail()},15000);
  pr.on('open',()=>{
    opened=true;clearTimeout(fail);
    $('#netMsg').textContent='';$('#codeBig').textContent=code.replace(/(...)(...)/,'$1 $2');
    const q=qrcode(0,'M');q.addData(joinUrl(code));q.make();$('#qr').innerHTML=q.createSvgTag({cellSize:6,margin:12,scalable:true});
  });
  pr.on('connection',handleConn);
  pr.on('error',e=>{
    if(pr!==peer)return;
    if(e.type==='unavailable-id'&&!opened)return openRoom(true);
    if(!opened){clearTimeout(fail);netFail()}
  });
  pr.on('disconnected',()=>{try{if(pr===peer&&!pr.destroyed)pr.reconnect()}catch(e){}});
}

function netFail(){$('#netMsg').textContent='تعذر إنشاء الغرفة. تأكد من الإنترنت أو العب على هذا الجهاز.';$('#lobLocal').hidden=false}

function handleConn(c){
  c.on('data',m=>{
    if(!m||typeof m!=='object')return;
    if(m.t==='hello')return hello(c,m);
    const s=seats.find(x=>x.conn===c);
    if(m.t==='pick')return pick(c,m);
    if(!s)return;
    s.seen=Date.now();
    if(m.t==='pong')return;
    const i=P.findIndex(p=>p.token===s.token);
    if(i>=0)act(i,m);
  });
  c.on('close',()=>lost(c));
}

function hello(c,m){
  const s=seats.find(x=>x.token===m.token);
  if(s){
    const old=s.conn;s.conn=c;s.seen=Date.now();
    if(old&&old!==c)try{old.close()}catch(e){}
    const pObj=prof(s.pid);
    if(inGame()){changed();push(P.findIndex(p=>p.token===s.token))}else c.send({t:'wait',name:pObj?pObj.name:'لاعب'});
    renderLobby();return;
  }
  if(inGame()||seats.length>=MAXP)return c.send({t:'full'});
  sendPick(c);
}

const inGame=()=>!$('#game').hidden;

function sendPick(c){
  const used=seats.map(s=>s.pid);
  c.send({t:'pickme',list:curRoom().profiles.filter(p=>!used.includes(p.id)).map(p=>({id:p.id,name:p.name,emoji:p.emoji}))});
}

function pick(c,m){
  if(inGame()||seats.length>=MAXP||seats.some(s=>s.token===m.token))return;
  let p=m.pid?prof(m.pid):null;
  if(p&&seats.some(s=>s.pid===p.id))return sendPick(c);
  if(!p){const nm=String(m.name||'').trim().slice(0,14);if(!nm)return;p=curRoom().profiles.find(x=>x.name===nm)||newProfile(nm)}
  seats.push({pid:p.id,token:String(m.token),conn:c,seen:Date.now()});
  c.send({t:'wait',name:p.name});renderLobby();
}

function lost(c){
  const s=seats.find(x=>x.conn===c);if(!s)return;
  s.conn=null;
  if(!inGame()){renderLobby();return}
  changed();
}

const live=s=>s&&s.conn&&s.conn.open;
setInterval(()=>{
  if(mode!=='online')return;
  const now=Date.now();
  seats.forEach(s=>{
    if(!live(s))return;
    if(s.seen&&now-s.seen>14000){const c=s.conn;s.conn=null;try{c.close()}catch(e){}if(inGame())changed();else renderLobby()}
    else try{s.conn.send({t:'ping'})}catch(e){}
  });
},4000);

function renderLobby(){
  $('#seats').innerHTML=seats.map((s,i)=>{const p=prof(s.pid);return`<li><i class="dot" style="background:${COLORS[i]}"></i><b>${p?p.emoji:'🦁'} ${esc(p?p.name:'لاعب')}</b>${live(s)?'':'<small>منقطع</small>'}<button class="mini" data-kick="${i}" aria-label="إخراج ${esc(p?p.name:'')}">✕</button></li>`}).join('')||'<li class="hint">بانتظار انضمام اللاعبين (من ١ إلى ٦ لاعبين)…</li>';
  $('#lobGo').disabled=!seats.length;
}
$('#seats').onclick=e=>{
  const b=e.target.closest('[data-kick]');if(!b)return;
  const[s]=seats.splice(+b.dataset.kick,1);try{s.conn.send({t:'kicked'})}catch(x){}renderLobby();
};
$('#lobGo').onclick=()=>startGame();
$('#lobBack').onclick=()=>toMenu();
$('#lobLocal').onclick=()=>{S().mode='device';toMenu()};
