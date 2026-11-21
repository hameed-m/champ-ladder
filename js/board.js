/* ---------- Board (Host & Client SVG Renderer + 5 Arena Designs + Fullscreen) ---------- */
function cellFor(k,sz){const n=sz||N,i=k-1,r=Math.floor(i/n),c=r%2?n-1-i%n:i%n;return{x:c*100+50,y:(n-1-r)*100+50,r,c}}
function cell(k){return cellFor(k,N)}
function segDist(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(a.x+t*dx-p.x,a.y+t*dy-p.y)}
const crossSeg=(a,b,c,d)=>{const o=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);return o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0};

const ARENA_STYLES={
  classic:{
    bg:'#1b1b3a',
    tiles:['#e4572e','#f0a202','#2e86de','#8e44ad','#d6336c'],
    lastTile:'#c98a1b',
    tileStroke:'none',
    rx:12,
    numFill:'#ffffff',
    numStroke:'#1b1b3a',
    goalIcon:'🏆',
    allIcon:'⭐',
    surpIcon:'🎁'
  },
  horror:{
    bg:'#090514',
    tiles:['#1e1333','#2d122b','#17152b','#341224','#231942'],
    lastTile:'#6b21a8',
    tileStroke:'#4c1d95',
    rx:8,
    numFill:'#f3e8ff',
    numStroke:'#090514',
    goalIcon:'🔮',
    allIcon:'🕯️',
    surpIcon:'🎃'
  },
  funny:{
    bg:'#2e1065',
    tiles:['#ff595e','#ffca3a','#8ac926','#1982c4','#ff85a1'],
    lastTile:'#ff9f1c',
    tileStroke:'#ffffff',
    rx:22,
    numFill:'#ffffff',
    numStroke:'#2e1065',
    goalIcon:'🎪',
    allIcon:'🌟',
    surpIcon:'🎈'
  },
  space:{
    bg:'#030712',
    tiles:['#0f172a','#1e1b4b','#0c2444','#25113b','#082f38'],
    lastTile:'#0284c7',
    tileStroke:'#06b6d4',
    rx:14,
    numFill:'#67e8f9',
    numStroke:'#030712',
    goalIcon:'🛸',
    allIcon:'☄️',
    surpIcon:'🛰️'
  },
  jungle:{
    bg:'#071f12',
    tiles:['#2d6a4f','#40916c','#8c5a32','#52796f','#3b7a57'],
    lastTile:'#ca8a04',
    tileStroke:'#1b4332',
    rx:12,
    numFill:'#fefae0',
    numStroke:'#071f12',
    goalIcon:'🗿',
    allIcon:'🧭',
    surpIcon:'🥥'
  }
};

function genBoard(){
  const s=S();
  LAST=N*N;
  const wantLad=s.ladders!==false?Math.round(N*.7):0;
  const wantSnk=s.snakes!==false?Math.round(N*.7):0;
  const maxRows=N>=8?3:2;
  let best=null;
  if(wantLad>0||wantSnk>0){
    for(let tries=0;tries<300;tries++){
      const lad={},snk={},used=new Set([1,LAST]),segs=[];
      const clear=(a,b)=>{
        const A=cell(a),B=cell(b);
        return segs.every(sg=>!crossSeg(A,B,sg[0],sg[1])&&segDist(A,sg[0],sg[1])>40&&segDist(B,sg[0],sg[1])>40&&segDist(sg[0],A,B)>40&&segDist(sg[1],A,B)>40);
      };
      const add=(low,high,map,from,to)=>{
        if(used.has(low)||used.has(high))return false;
        const L=cell(low),H=cell(high),dr=H.r-L.r;
        if(dr<1||dr>maxRows||Math.abs(H.c-L.c)>dr+1||!clear(low,high))return false;
        map[from]=to;used.add(low);used.add(high);segs.push([L,H]);return true;
      };
      let nl=0,ns=0;
      for(let i=0;i<2500&&(nl<wantLad||ns<wantSnk);i++){
        const low=rnd(2,LAST-N),high=low+rnd(N-2,N*maxRows+2);
        if(i%2){if(nl<wantLad&&high<LAST&&add(low,high,lad,low,high))nl++}
        else if(ns<wantSnk&&high<LAST-1&&add(low,high,snk,high,low))ns++;
      }
      const heads=Object.keys(snk).map(Number).sort((a,b)=>a-b);
      const run=heads.some((h,i)=>i>1&&heads[i-2]===h-2&&heads[i-1]===h-1);
      if(run||heads.filter(h=>h>LAST-7).length>2)continue;
      if(!best||nl+ns>best.c)best={c:nl+ns,lad,snk};
      if(nl===wantLad&&ns===wantSnk)break;
    }
  }
  LAD=best?best.lad:{};SNK=best?best.snk:{};
  const taken=new Set([1,LAST,...Object.entries(LAD).flat().map(Number),...Object.entries(SNK).flat().map(Number)]);
  const free=shuffle(Array.from({length:LAST},(_,i)=>i+1).filter(k=>!taken.has(k)&&k>3&&k<LAST-1));
  const c=Math.max(2,Math.round(N*.5));
  ALLQ=new Set(mode==='online'&&s.allq?free.splice(0,c):[]);
  SURP=new Set(s.cards?free.splice(0,c):[]);
}

function getBoardData(){
  return{
    n:N,
    arena:S().arena||'classic',
    lad:LAD,
    snk:SNK,
    allq:[...ALLQ],
    surp:[...SURP]
  };
}

function drawLadderSVG(p,w,arena){
  const dx=w.x-p.x,dy=w.y-p.y,L=Math.hypot(dx,dy),nx=-dy/L*11,ny=dx/L*11;
  const m=Math.floor(L/30);
  let rungs='';
  for(let i=1;i<m;i++){
    const t=i/m,x=p.x+dx*t,y=p.y+dy*t;
    rungs+=`<line x1="${x+nx}" y1="${y+ny}" x2="${x-nx}" y2="${y-ny}"/>`;
  }
  if(arena==='horror'){
    return `<g stroke="#c084fc" stroke-linecap="round" opacity=".95">
      <g stroke="#581c87" stroke-width="11"><line x1="${p.x+nx}" y1="${p.y+ny}" x2="${w.x+nx}" y2="${w.y+ny}"/><line x1="${p.x-nx}" y1="${p.y-ny}" x2="${w.x-nx}" y2="${w.y-ny}"/></g>
      <g stroke="#e9d5ff" stroke-width="5"><line x1="${p.x+nx}" y1="${p.y+ny}" x2="${w.x+nx}" y2="${w.y+ny}"/><line x1="${p.x-nx}" y1="${p.y-ny}" x2="${w.x-nx}" y2="${w.y-ny}"/>${rungs}</g>
    </g>`;
  }
  if(arena==='funny'){
    return `<g stroke-linecap="round">
      <g stroke="#ffffff" stroke-width="10"><line x1="${p.x+nx}" y1="${p.y+ny}" x2="${w.x+nx}" y2="${w.y+ny}"/><line x1="${p.x-nx}" y1="${p.y-ny}" x2="${w.x-nx}" y2="${w.y-ny}"/></g>
      <g stroke="#ff007f" stroke-width="6" stroke-dasharray="10 10"><line x1="${p.x+nx}" y1="${p.y+ny}" x2="${w.x+nx}" y2="${w.y+ny}"/><line x1="${p.x-nx}" y1="${p.y-ny}" x2="${w.x-nx}" y2="${w.y-ny}"/></g>
      <g stroke="#ffee32" stroke-width="6">${rungs}</g>
    </g>`;
  }
  if(arena==='space'){
    return `<g stroke-linecap="round">
      <g stroke="#0891b2" stroke-width="11" opacity=".6"><line x1="${p.x+nx}" y1="${p.y+ny}" x2="${w.x+nx}" y2="${w.y+ny}"/><line x1="${p.x-nx}" y1="${p.y-ny}" x2="${w.x-nx}" y2="${w.y-ny}"/></g>
      <g stroke="#22d3ee" stroke-width="5"><line x1="${p.x+nx}" y1="${p.y+ny}" x2="${w.x+nx}" y2="${w.y+ny}"/><line x1="${p.x-nx}" y1="${p.y-ny}" x2="${w.x-nx}" y2="${w.y-ny}"/></g>
      <g stroke="#a5f3fc" stroke-width="4" stroke-dasharray="6 4">${rungs}</g>
    </g>`;
  }
  if(arena==='jungle'){
    return `<g stroke-linecap="round">
      <g stroke="#5c3a21" stroke-width="10"><line x1="${p.x+nx}" y1="${p.y+ny}" x2="${w.x+nx}" y2="${w.y+ny}"/><line x1="${p.x-nx}" y1="${p.y-ny}" x2="${w.x-nx}" y2="${w.y-ny}"/></g>
      <g stroke="#d4a373" stroke-width="6"><line x1="${p.x+nx}" y1="${p.y+ny}" x2="${w.x+nx}" y2="${w.y+ny}"/><line x1="${p.x-nx}" y1="${p.y-ny}" x2="${w.x-nx}" y2="${w.y-ny}"/></g>
      <g stroke="#faedcd" stroke-width="5">${rungs}</g>
    </g>`;
  }
  return `<g stroke="#ffffff" stroke-linecap="round"><g stroke-width="7"><line x1="${p.x+nx}" y1="${p.y+ny}" x2="${w.x+nx}" y2="${w.y+ny}"/><line x1="${p.x-nx}" y1="${p.y-ny}" x2="${w.x-nx}" y2="${w.y-ny}"/></g><g stroke-width="5">${rungs}</g></g>`;
}

function drawSnakeSVG(p,w,arena){
  const dx=w.x-p.x,dy=w.y-p.y,L=Math.hypot(dx,dy),nx=-dy/L*45,ny=dx/L*45;
  const d=`M${p.x} ${p.y} C${p.x+nx+dx*.15} ${p.y+ny+dy*.15} ${w.x-nx-dx*.15} ${w.y-ny-dy*.15} ${w.x} ${w.y}`;
  const ang=Math.atan2(ny+dy*.15,nx+dx*.15)*180/Math.PI+180;

  if(arena==='horror'){
    return `<path d="${d}" fill="none" stroke="#3b0764" stroke-width="24" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#991b1b" stroke-width="16" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#f87171" stroke-width="6" stroke-dasharray="6 14"/>
      <g transform="translate(${p.x} ${p.y}) rotate(${ang})">
        <path d="M18 0 L36 0 M36 0 L43 -7 M36 0 L43 7" stroke="#ef4444" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <ellipse rx="22" ry="17" fill="#450a0a" stroke="#dc2626" stroke-width="3"/>
        <circle cx="6" cy="-8" r="6" fill="#fef08a"/><circle cx="6" cy="8" r="6" fill="#fef08a"/>
        <ellipse cx="8" cy="-8" rx="2" ry="4.5" fill="#dc2626"/><ellipse cx="8" cy="8" rx="2" ry="4.5" fill="#dc2626"/>
      </g>
      <text x="${p.x-26}" y="${p.y-22}" text-anchor="middle" font-size="22">👻</text>`;
  }
  if(arena==='funny'){
    return `<path d="${d}" fill="none" stroke="#7209b7" stroke-width="24" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#f72585" stroke-width="17" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#4cc9f0" stroke-width="9" stroke-dasharray="10 12" stroke-linecap="round"/>
      <g transform="translate(${p.x} ${p.y}) rotate(${ang})">
        <path d="M16 0 Q28 10 36 0" stroke="#ffbe0b" stroke-width="5" fill="none" stroke-linecap="round"/>
        <ellipse rx="22" ry="18" fill="#f72585" stroke="#ffffff" stroke-width="3"/>
        <circle cx="6" cy="-9" r="7.5" fill="#fff"/><circle cx="6" cy="9" r="7.5" fill="#fff"/>
        <circle cx="8" cy="-7" r="3.5" fill="#111"/><circle cx="4" cy="11" r="3.5" fill="#111"/>
      </g>
      <text x="${p.x-26}" y="${p.y-22}" text-anchor="middle" font-size="22">🍌</text>`;
  }
  if(arena==='space'){
    return `<path d="${d}" fill="none" stroke="#3b0764" stroke-width="24" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#9333ea" stroke-width="15" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#f0abfc" stroke-width="5" stroke-dasharray="4 12"/>
      <g transform="translate(${p.x} ${p.y}) rotate(${ang})">
        <ellipse rx="21" ry="16" fill="#1e1b4b" stroke="#c084fc" stroke-width="3"/>
        <ellipse cx="6" cy="-8" rx="6" ry="4" fill="#4ade80"/><ellipse cx="6" cy="8" rx="6" ry="4" fill="#4ade80"/>
        <circle cx="7" cy="-8" r="2" fill="#052e16"/><circle cx="7" cy="8" r="2" fill="#052e16"/>
      </g>
      <text x="${p.x-26}" y="${p.y-22}" text-anchor="middle" font-size="20">🌀</text>`;
  }
  if(arena==='jungle'){
    return `<path d="${d}" fill="none" stroke="#081c15" stroke-width="23" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#2d6a4f" stroke-width="17" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#b7e4c7" stroke-width="7" stroke-dasharray="12 14"/>
      <g transform="translate(${p.x} ${p.y}) rotate(${ang})">
        <path d="M18 0 L34 0 M34 0 L40 -6 M34 0 L40 6" stroke="#e11d48" stroke-width="3" fill="none" stroke-linecap="round"/>
        <ellipse rx="21" ry="16" fill="#2d6a4f" stroke="#081c15" stroke-width="3"/>
        <circle cx="5" cy="-8" r="5.5" fill="#fef08a"/><circle cx="5" cy="8" r="5.5" fill="#fef08a"/>
        <circle cx="7" cy="-8" r="2.8" fill="#111"/><circle cx="7" cy="8" r="2.8" fill="#111"/>
      </g>`;
  }
  return `<path d="${d}" fill="none" stroke="#14532d" stroke-width="22" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#3fae5a" stroke-width="16" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#f5c542" stroke-width="7" stroke-dasharray="9 15"/>
    <g transform="translate(${p.x} ${p.y}) rotate(${ang})">
      <path d="M18 0 L33 0 M33 0 L39 -6 M33 0 L39 6" stroke="#e11d48" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse rx="20" ry="16" fill="#3fae5a" stroke="#14532d" stroke-width="3"/>
      <circle cx="5" cy="-8" r="5.5" fill="#fff"/><circle cx="5" cy="8" r="5.5" fill="#fff"/>
      <circle cx="7" cy="-8" r="2.8" fill="#111"/><circle cx="7" cy="8" r="2.8" fill="#111"/>
    </g>`;
}

function renderBoardSVG(svgEl,bData,players,tokPrefix){
  if(!svgEl||!bData)return;
  const n=bData.n||6,last=n*n,box=n*100;
  const arena=bData.arena||'classic';
  const st=ARENA_STYLES[arena]||ARENA_STYLES.classic;
  svgEl.dataset.arena=arena;
  let s=`<rect width="${box}" height="${box}" fill="${st.bg}"/>`;
  svgEl.setAttribute('viewBox',`0 0 ${box} ${box}`);
  svgEl.setAttribute('aria-label',`لوحة اللعبة ${ar(n)} في ${ar(n)}`);

  for(let k=1;k<=last;k++){
    const p=cellFor(k,n);
    const fill=k===last?st.lastTile:st.tiles[(p.c+n-1-Math.floor(p.y/100))%st.tiles.length];
    const strokeAttr=st.tileStroke!=='none'?` stroke="${st.tileStroke}" stroke-width="2.5"`:'';
    s+=`<rect x="${p.x-46}" y="${p.y-46}" width="92" height="92" rx="${st.rx}" fill="${fill}"${strokeAttr}/>`;
    if(arena==='space'&&k%3===0){
      s+=`<circle cx="${p.x-30}" cy="${p.y-30}" r="2" fill="#e0f2fe" opacity=".6"/>`;
    }else if(arena==='horror'&&k%4===0&&k<last){
      s+=`<path d="M${p.x-44} ${p.y-30} Q${p.x-34} ${p.y-34} ${p.x-30} ${p.y-44}" stroke="#a855f7" stroke-width="1.5" fill="none" opacity=".35"/>`;
    }else if(arena==='funny'&&k%3===0&&k<last){
      s+=`<circle cx="${p.x-32}" cy="${p.y+32}" r="4" fill="#ffffff" opacity=".3"/>`;
    }
  }

  const lad=bData.lad||{};
  for(const a in lad){
    s+=drawLadderSVG(cellFor(+a,n),cellFor(lad[a],n),arena);
  }
  const snk=bData.snk||{};
  for(const a in snk){
    s+=drawSnakeSVG(cellFor(+a,n),cellFor(snk[a],n),arena);
  }
  for(let k=1;k<last;k++){
    const p=cellFor(k,n);
    s+=`<text class="cn" style="fill:${st.numFill};stroke:${st.numStroke}" x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="central">${ar(k)}</text>`;
  }
  const f=cellFor(last,n);
  s+=`<text x="${f.x}" y="${f.y+18}" text-anchor="middle" font-size="50">${st.goalIcon}</text>`;
  (bData.allq||[]).forEach(k=>{const p=cellFor(k,n);s+=`<text x="${p.x+27}" y="${p.y-20}" text-anchor="middle" font-size="26">${st.allIcon}</text>`});
  (bData.surp||[]).forEach(k=>{const p=cellFor(k,n);s+=`<text x="${p.x+27}" y="${p.y-20}" text-anchor="middle" font-size="26">${st.surpIcon}</text>`});
  const tk=1+(n-6)*.11;
  (players||[]).forEach((p,i)=>{
    s+=`<g class="tok" id="${tokPrefix}${i}" style="transition:none"><g transform="scale(${tk})"><circle r="14" fill="${p.color||COLORS[i]}" stroke="#fff" stroke-width="3"/><text y="6" text-anchor="middle" fill="#fff" font-size="16" font-weight="800">${ar(i+1)}</text></g></g>`;
  });
  svgEl.innerHTML=s;
}

function drawBoard(){
  const bData=getBoardData();
  renderBoardSVG($('#board'),bData,P,'t');
  const badge=$('#hostArenaBadge');
  const arObj=ARENAS.find(a=>a[0]===bData.arena)||ARENAS[0];
  if(badge)badge.textContent=arObj[1];
  const qSel=$('#hostArenaQuick');
  if(qSel)qSel.value=bData.arena;
  P.forEach(p=>{p.el=$('#t'+p.i);place(p)});
  requestAnimationFrame(()=>requestAnimationFrame(()=>P.forEach(p=>{if(p.el)p.el.style.transition=''})));
}

function place(p){
  if(!p.el)p.el=$('#t'+p.i);
  if(!p.el)return;
  const c=cell(p.pos),o=OFF[p.i]||[0,0],tk=1+(N-6)*.11;
  p.el.style.transform=`translate(${c.x+o[0]*tk}px,${c.y+o[1]*tk}px)`;
}

/* Client Board Sync */
let cBoardSig='';
function syncClientBoard(bData,players){
  const svg=$('#cBoard');
  if(!svg||!bData||!players)return;
  const sig=JSON.stringify([bData.n,bData.arena,bData.lad,bData.snk,bData.allq,bData.surp,players.length]);
  if(sig!==cBoardSig){
    cBoardSig=sig;
    renderBoardSVG(svg,bData,players,'ct');
    const lbl=$('#clientArenaLabel');
    const arObj=ARENAS.find(a=>a[0]===(bData.arena||'classic'))||ARENAS[0];
    if(lbl)lbl.textContent=arObj[1];
    players.forEach((p,i)=>{
      const el=$('#ct'+i);
      if(el)placeTokenOn(el,p.pos,i,bData.n);
    });
    requestAnimationFrame(()=>requestAnimationFrame(()=>players.forEach((_,i)=>{
      const el=$('#ct'+i);
      if(el)el.style.transition='';
    })));
  }else{
    players.forEach((p,i)=>{
      const el=$('#ct'+i);
      if(el)placeTokenOn(el,p.pos,i,bData.n);
    });
  }
}

function placeTokenOn(el,pos,idx,sz){
  const c=cellFor(pos,sz),o=OFF[idx]||[0,0],tk=1+(sz-6)*.11;
  el.style.transform=`translate(${c.x+o[0]*tk}px,${c.y+o[1]*tk}px)`;
}

/* Fullscreen toggle for Host & Client boards */
function toggleBoardFullscreen(wrapId){
  const wrap=document.getElementById(wrapId);
  if(!wrap)return;
  const isFs=document.fullscreenElement===wrap||wrap.classList.contains('fs-active');
  if(isFs){
    wrap.classList.remove('fs-active');
    if(document.fullscreenElement&&document.exitFullscreen){
      document.exitFullscreen().catch(()=>{});
    }
  }else{
    wrap.classList.add('fs-active');
    if(wrap.requestFullscreen){
      wrap.requestFullscreen().catch(()=>{});
    }
  }
  updateFsButtons();
}

function updateFsButtons(){
  ['hostBwrap','clientBwrap'].forEach(id=>{
    const w=document.getElementById(id);
    if(!w)return;
    const active=document.fullscreenElement===w||w.classList.contains('fs-active');
    if(document.fullscreenElement!==w&&!w.classList.contains('fs-active'))w.classList.remove('fs-active');
    const btn=w.querySelector('.fs-btn');
    if(btn){
      btn.textContent=active?'✕ خروج من ملء الشاشة':'⛶ ملء الشاشة';
      btn.setAttribute('aria-pressed',active);
    }
  });
}

document.addEventListener('fullscreenchange',()=>{
  ['hostBwrap','clientBwrap'].forEach(id=>{
    const w=document.getElementById(id);
    if(w&&!document.fullscreenElement){
      w.classList.remove('fs-active');
    }
  });
  updateFsButtons();
});
