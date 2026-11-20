/* ---------- Board ---------- */
function cell(k){const i=k-1,r=Math.floor(i/N),c=r%2?N-1-i%N:i%N;return{x:c*100+50,y:(N-1-r)*100+50,r,c}}
function segDist(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(a.x+t*dx-p.x,a.y+t*dy-p.y)}
const crossSeg=(a,b,c,d)=>{const o=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);return o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0};

function genBoard(){
  LAST=N*N;
  const want=Math.round(N*.7),maxRows=N>=8?3:2;
  let best=null;
  for(let tries=0;tries<300;tries++){
    const lad={},snk={},used=new Set([1,LAST]),segs=[];
    const clear=(a,b)=>{
      const A=cell(a),B=cell(b);
      return segs.every(s=>!crossSeg(A,B,s[0],s[1])&&segDist(A,s[0],s[1])>40&&segDist(B,s[0],s[1])>40&&segDist(s[0],A,B)>40&&segDist(s[1],A,B)>40);
    };
    const add=(low,high,map,from,to)=>{
      if(used.has(low)||used.has(high))return false;
      const L=cell(low),H=cell(high),dr=H.r-L.r;
      if(dr<1||dr>maxRows||Math.abs(H.c-L.c)>dr+1||!clear(low,high))return false;
      map[from]=to;used.add(low);used.add(high);segs.push([L,H]);return true;
    };
    let nl=0,ns=0;
    for(let i=0;i<2500&&(nl<want||ns<want);i++){
      const low=rnd(2,LAST-N),high=low+rnd(N-2,N*maxRows+2);
      if(i%2){if(nl<want&&high<LAST&&add(low,high,lad,low,high))nl++}
      else if(ns<want&&high<LAST-1&&add(low,high,snk,high,low))ns++;
    }
    const heads=Object.keys(snk).map(Number).sort((a,b)=>a-b);
    const run=heads.some((h,i)=>i>1&&heads[i-2]===h-2&&heads[i-1]===h-1);
    if(run||heads.filter(h=>h>LAST-7).length>2)continue;
    if(!best||nl+ns>best.c)best={c:nl+ns,lad,snk};
    if(nl===want&&ns===want)break;
  }
  LAD=best?best.lad:{};SNK=best?best.snk:{};
  const taken=new Set([1,LAST,...Object.entries(LAD).flat().map(Number),...Object.entries(SNK).flat().map(Number)]);
  const free=shuffle(Array.from({length:LAST},(_,i)=>i+1).filter(k=>!taken.has(k)&&k>3&&k<LAST-1));
  const c=Math.max(2,Math.round(N*.5));
  ALLQ=new Set(mode==='online'&&S().allq?free.splice(0,c):[]);
  SURP=new Set(S().cards?free.splice(0,c):[]);
}

function drawBoard(){
  const box=N*100;let s='';
  $('#board').setAttribute('viewBox',`0 0 ${box} ${box}`);
  $('#board').setAttribute('aria-label',`لوحة اللعبة ${ar(N)} في ${ar(N)}`);
  for(let k=1;k<=LAST;k++){const p=cell(k);
    s+=`<rect x="${p.x-46}" y="${p.y-46}" width="92" height="92" rx="12" fill="${k===LAST?'#c98a1b':['#e4572e','#f0a202','#2e86de','#8e44ad','#d6336c'][(p.c+N-1-Math.floor(p.y/100))%5]}"/>`}
  for(const a in LAD){
    const p=cell(+a),w=cell(LAD[a]),dx=w.x-p.x,dy=w.y-p.y,L=Math.hypot(dx,dy),nx=-dy/L*10,ny=dx/L*10;
    s+=`<g stroke="#ffffff" stroke-linecap="round"><g stroke-width="7"><line x1="${p.x+nx}" y1="${p.y+ny}" x2="${w.x+nx}" y2="${w.y+ny}"/><line x1="${p.x-nx}" y1="${p.y-ny}" x2="${w.x-nx}" y2="${w.y-ny}"/></g><g stroke-width="5">`;
    const m=Math.floor(L/30);
    for(let i=1;i<m;i++){const t=i/m,x=p.x+dx*t,y=p.y+dy*t;s+=`<line x1="${x+nx}" y1="${y+ny}" x2="${x-nx}" y2="${y-ny}"/>`}
    s+=`</g></g>`;
  }
  for(const a in SNK){
    const p=cell(+a),w=cell(SNK[a]),dx=w.x-p.x,dy=w.y-p.y,L=Math.hypot(dx,dy),nx=-dy/L*45,ny=dx/L*45;
    const d=`M${p.x} ${p.y} C${p.x+nx+dx*.15} ${p.y+ny+dy*.15} ${w.x-nx-dx*.15} ${w.y-ny-dy*.15} ${w.x} ${w.y}`;
    const ang=Math.atan2(ny+dy*.15,nx+dx*.15)*180/Math.PI+180;
    s+=`<path d="${d}" fill="none" stroke="#14532d" stroke-width="22" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#3fae5a" stroke-width="16" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#f5c542" stroke-width="7" stroke-dasharray="9 15"/><g transform="translate(${p.x} ${p.y}) rotate(${ang})"><path d="M18 0 L33 0 M33 0 L39 -6 M33 0 L39 6" stroke="#e11d48" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse rx="20" ry="16" fill="#3fae5a" stroke="#14532d" stroke-width="3"/><circle cx="5" cy="-8" r="5.5" fill="#fff"/><circle cx="5" cy="8" r="5.5" fill="#fff"/><circle cx="7" cy="-8" r="2.8" fill="#111"/><circle cx="7" cy="8" r="2.8" fill="#111"/></g>`;
  }
  for(let k=1;k<LAST;k++){const p=cell(k);s+=`<text class="cn" x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="central">${ar(k)}</text>`}
  const f=cell(LAST);s+=`<text x="${f.x}" y="${f.y+18}" text-anchor="middle" font-size="50">🏆</text>`;
  ALLQ.forEach(k=>{const p=cell(k);s+=`<text x="${p.x+27}" y="${p.y-20}" text-anchor="middle" font-size="26">⭐</text>`});
  SURP.forEach(k=>{const p=cell(k);s+=`<text x="${p.x+27}" y="${p.y-20}" text-anchor="middle" font-size="26">🎁</text>`});
  const tk=1+(N-6)*.11;
  P.forEach((p,i)=>{s+=`<g class="tok" id="t${i}" style="transition:none"><g transform="scale(${tk})"><circle r="14" fill="${p.color}" stroke="#fff" stroke-width="3"/><text y="6" text-anchor="middle" fill="#fff" font-size="16" font-weight="800">${ar(i+1)}</text></g></g>`});
  $('#board').innerHTML=s;
  P.forEach(p=>{p.el=$('#t'+p.i);place(p)});
  requestAnimationFrame(()=>requestAnimationFrame(()=>P.forEach(p=>p.el.style.transition='')));
}
function place(p){const c=cell(p.pos),o=OFF[p.i],tk=1+(N-6)*.11;p.el.style.transform=`translate(${c.x+o[0]*tk}px,${c.y+o[1]*tk}px)`}
