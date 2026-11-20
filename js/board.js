/* ---------- Board (Host & Client SVG Renderer + Fullscreen) ---------- */
function cellFor(k,sz){const n=sz||N,i=k-1,r=Math.floor(i/n),c=r%2?n-1-i%n:i%n;return{x:c*100+50,y:(n-1-r)*100+50,r,c}}
function cell(k){return cellFor(k,N)}
function segDist(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(a.x+t*dx-p.x,a.y+t*dy-p.y)}
const crossSeg=(a,b,c,d)=>{const o=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);return o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0};

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
    lad:LAD,
    snk:SNK,
    allq:[...ALLQ],
    surp:[...SURP]
  };
}

function renderBoardSVG(svgEl,bData,players,tokPrefix){
  if(!svgEl||!bData)return;
  const n=bData.n||6,last=n*n,box=n*100;
  let s='';
  svgEl.setAttribute('viewBox',`0 0 ${box} ${box}`);
  svgEl.setAttribute('aria-label',`لوحة اللعبة ${ar(n)} في ${ar(n)}`);
  for(let k=1;k<=last;k++){
    const p=cellFor(k,n);
    s+=`<rect x="${p.x-46}" y="${p.y-46}" width="92" height="92" rx="12" fill="${k===last?'#c98a1b':['#e4572e','#f0a202','#2e86de','#8e44ad','#d6336c'][(p.c+n-1-Math.floor(p.y/100))%5]}"/>`;
  }
  const lad=bData.lad||{};
  for(const a in lad){
    const p=cellFor(+a,n),w=cellFor(lad[a],n),dx=w.x-p.x,dy=w.y-p.y,L=Math.hypot(dx,dy),nx=-dy/L*10,ny=dx/L*10;
    s+=`<g stroke="#ffffff" stroke-linecap="round"><g stroke-width="7"><line x1="${p.x+nx}" y1="${p.y+ny}" x2="${w.x+nx}" y2="${w.y+ny}"/><line x1="${p.x-nx}" y1="${p.y-ny}" x2="${w.x-nx}" y2="${w.y-ny}"/></g><g stroke-width="5">`;
    const m=Math.floor(L/30);
    for(let i=1;i<m;i++){const t=i/m,x=p.x+dx*t,y=p.y+dy*t;s+=`<line x1="${x+nx}" y1="${y+ny}" x2="${x-nx}" y2="${y-ny}"/>`}
    s+=`</g></g>`;
  }
  const snk=bData.snk||{};
  for(const a in snk){
    const p=cellFor(+a,n),w=cellFor(snk[a],n),dx=w.x-p.x,dy=w.y-p.y,L=Math.hypot(dx,dy),nx=-dy/L*45,ny=dx/L*45;
    const d=`M${p.x} ${p.y} C${p.x+nx+dx*.15} ${p.y+ny+dy*.15} ${w.x-nx-dx*.15} ${w.y-ny-dy*.15} ${w.x} ${w.y}`;
    const ang=Math.atan2(ny+dy*.15,nx+dx*.15)*180/Math.PI+180;
    s+=`<path d="${d}" fill="none" stroke="#14532d" stroke-width="22" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#3fae5a" stroke-width="16" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#f5c542" stroke-width="7" stroke-dasharray="9 15"/><g transform="translate(${p.x} ${p.y}) rotate(${ang})"><path d="M18 0 L33 0 M33 0 L39 -6 M33 0 L39 6" stroke="#e11d48" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse rx="20" ry="16" fill="#3fae5a" stroke="#14532d" stroke-width="3"/><circle cx="5" cy="-8" r="5.5" fill="#fff"/><circle cx="5" cy="8" r="5.5" fill="#fff"/><circle cx="7" cy="-8" r="2.8" fill="#111"/><circle cx="7" cy="8" r="2.8" fill="#111"/></g>`;
  }
  for(let k=1;k<last;k++){
    const p=cellFor(k,n);
    s+=`<text class="cn" x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="central">${ar(k)}</text>`;
  }
  const f=cellFor(last,n);
  s+=`<text x="${f.x}" y="${f.y+18}" text-anchor="middle" font-size="50">🏆</text>`;
  (bData.allq||[]).forEach(k=>{const p=cellFor(k,n);s+=`<text x="${p.x+27}" y="${p.y-20}" text-anchor="middle" font-size="26">⭐</text>`});
  (bData.surp||[]).forEach(k=>{const p=cellFor(k,n);s+=`<text x="${p.x+27}" y="${p.y-20}" text-anchor="middle" font-size="26">🎁</text>`});
  const tk=1+(n-6)*.11;
  (players||[]).forEach((p,i)=>{
    s+=`<g class="tok" id="${tokPrefix}${i}" style="transition:none"><g transform="scale(${tk})"><circle r="14" fill="${p.color||COLORS[i]}" stroke="#fff" stroke-width="3"/><text y="6" text-anchor="middle" fill="#fff" font-size="16" font-weight="800">${ar(i+1)}</text></g></g>`;
  });
  svgEl.innerHTML=s;
}

function drawBoard(){
  renderBoardSVG($('#board'),getBoardData(),P,'t');
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
  const sig=JSON.stringify([bData.n,bData.lad,bData.snk,bData.allq,bData.surp,players.length]);
  if(sig!==cBoardSig){
    cBoardSig=sig;
    renderBoardSVG(svg,bData,players,'ct');
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
