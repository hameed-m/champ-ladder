/* ---------- Questions ---------- */
function numOpts(ans,deltas,min,fmt){
  const set=new Set([ans]);
  for(const d of shuffle(deltas)){const c=ans+d;if(c>=min&&set.size<4)set.add(c)}
  let k=1;while(set.size<4){if(ans+k>=min)set.add(ans+k);k++}
  return shuffle([...set]).map(fmt||ar);
}
function calc(text,show,ans,deltas,min,key){return{key,kind:'calc',text,ans:ar(ans),show,opts:numOpts(ans,deltas,min)}}
const MULB=[[1,5],[1,9],[2,12]];
function qMul(){
  const a=pickOne([...tables]),b=rnd(...MULB[level]),ans=a*b,sw=Math.random()<.5,x=sw?b:a,y=sw?a:b;
  return Object.assign(calc(`${ar(x)} × ${ar(y)} = ؟`,`${ar(x)} × ${ar(y)} = ${ar(ans)}`,ans,[a,-a,b,-b,10,-10,1,-1,2],1,`m${a}x${b}`),{tbl:a});
}
function qDiv(){
  const a=pickOne([...tables]),b=rnd(...MULB[level]),t=a*b;
  return Object.assign(calc(`${ar(t)} ÷ ${ar(a)} = ؟`,`${ar(t)} ÷ ${ar(a)} = ${ar(b)}`,b,[1,-1,2,-2,3,-3],a===1?1:0,`d${t}/${a}`),{tbl:a});
}
function addPair(){
  if(level===0){const x=rnd(1,20),y=rnd(1,20);return[x,y]}
  if(level===1){const x=rnd(11,85);return[x,rnd(5,100-x)]}
  const x=rnd(100,850);return[x,rnd(50,1000-x)];
}
const NEAR=[1,-1,2,-2,10,-10,9,-9,11,-11];
function qAdd(){const[a,b]=addPair(),c=a+b;return calc(`${ar(a)} + ${ar(b)} = ؟`,`${ar(a)} + ${ar(b)} = ${ar(c)}`,c,NEAR,1,`a${a}+${b}`)}
function qSub(){const[a,b]=addPair(),c=a+b;return calc(`${ar(c)} − ${ar(b)} = ؟`,`${ar(c)} − ${ar(b)} = ${ar(a)}`,a,NEAR,0,`s${c}-${b}`)}

/* Square Roots (الجذور التربيعية) */
function qSqrt(){
  if(level===0){
    const r=rnd(1,10),sq=r*r;
    return calc(`√${ar(sq)} = ؟`,`√${ar(sq)} = ${ar(r)}`,r,[1,-1,2,-2,3,-3,4],1,`sq${sq}`);
  }
  if(level===1){
    const r=rnd(2,15),sq=r*r;
    return calc(`√${ar(sq)} = ؟`,`√${ar(sq)} = ${ar(r)}`,r,[1,-1,2,-2,3,-3,5,-5],1,`sq${sq}`);
  }
  // Level 2 (Hard): √1 to √400 (roots 1–20) + simple expressions like √a + √b or √a − √b
  if(Math.random()<.45){
    const a=rnd(2,12),b=rnd(1,a),op=Math.random()<.65?'+':'−';
    const sqA=a*a,sqB=b*b,ans=op==='+'?a+b:a-b;
    return calc(`√${ar(sqA)} ${op} √${ar(sqB)} = ؟`,`√${ar(sqA)} ${op} √${ar(sqB)} = ${ar(ans)}`,ans,[1,-1,2,-2,3,-3,4,-4],0,`sqe${sqA}${op}${sqB}`);
  }
  const r=rnd(4,20),sq=r*r;
  return calc(`√${ar(sq)} = ؟`,`√${ar(sq)} = ${ar(r)}`,r,[1,-1,2,-2,3,-3,4,-4,10,-10],1,`sq${sq}`);
}

/* Geometry */
const svgW=i=>`<svg viewBox="0 0 150 120" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">${i}</svg>`;
const lbl=(x,y,t)=>`<text x="${x}" y="${y}" fill="currentColor" stroke="none" font-size="14" font-weight="800" text-anchor="middle">${t}</text>`;
function reg(k,rot){const p=[];for(let i=0;i<k;i++){const t=(rot==null?-90:rot)*Math.PI/180+i*2*Math.PI/k;p.push((75+52*Math.cos(t)).toFixed(1)+','+(60+52*Math.sin(t)).toFixed(1))}return`<polygon points="${p.join(' ')}"/>`}
const SH={
  square:['مربع',4,'<rect x="33" y="18" width="84" height="84"/>'],
  rect:['مستطيل',4,'<rect x="15" y="30" width="120" height="62"/>'],
  tri:['مثلث',3,reg(3)],
  circle:['دائرة',0,'<circle cx="75" cy="60" r="50"/>'],
  pent:['مخمّس',5,reg(5)],
  hex:['مسدّس',6,reg(6)],
  oct:['مثمّن',8,reg(8,22.5)],
  rhom:['معيّن',4,'<polygon points="75,8 125,60 75,112 25,60"/>'],
  para:['متوازي أضلاع',4,'<polygon points="42,28 138,28 108,92 12,92"/>']
};
const shapeName=(pool)=>{const k=pickOne(pool),o=shuffle(pool.filter(x=>x!==k)).slice(0,3).map(x=>SH[x][0]);return{key:'gn'+k,text:'ما اسم هذا الشكل؟',fig:svgW(SH[k][2]),ans:SH[k][0],opts:shuffle([SH[k][0],...o])}};
const cm=v=>`${ar(v)} سم`,cm2=v=>`${ar(v)} سم²`,deg=v=>`${ar(v)}°`;
const gNum=(key,text,ans,deltas,min,fmt,fig)=>({key,text,fig,ans:(fmt||ar)(ans),opts:numOpts(ans,deltas,min,fmt)});
const gTxt=(key,text,ans,others,fig)=>({key,text,fig,ans,opts:shuffle([ans,...others])});
function angleFig(a){
  const r=a*Math.PI/180,x=40+90*Math.cos(r),y=98-90*Math.sin(r);
  const m=a===90?'<path d="M40 82 H56 V98" stroke-width="3"/>':`<path d="M64 98 A24 24 0 0 0 ${(40+24*Math.cos(r)).toFixed(1)} ${(98-24*Math.sin(r)).toFixed(1)}" stroke-width="3"/>`;
  return svgW(`<path d="M130 98 H40 L${x.toFixed(1)} ${Math.max(6,y).toFixed(1)}"/>${m}`);
}
const rectFig=(w,h)=>svgW(`<rect x="28" y="28" width="94" height="58"/>`+lbl(75,20,ar(w))+lbl(135,62,ar(h)));
const GEO=[
 [()=>shapeName(['square','rect','tri','circle','pent','hex']),
  ()=>{const k=pickOne(['tri','square','rect','pent','hex']);return gNum('gs'+k,'كم ضلعًا لهذا الشكل؟',SH[k][1],[1,-1,2,-2,3],1,ar,svgW(SH[k][2]))},
  ()=>gTxt('gc','أي شكل ليس له أضلاع ولا رؤوس؟','الدائرة',['المربع','المثلث','المستطيل']),
  ()=>gTxt('ge','أي شكل أضلاعه الأربعة متساوية وزواياه قائمة؟','المربع',['المثلث','الدائرة','المسدّس']),
  ()=>gNum('gt','كم رأسًا للمثلث؟',3,[1,2,3,-1],1)],
 [()=>shapeName(['pent','hex','oct','rhom','tri']),
  ()=>{const k=pickOne(['pent','hex','oct']);return gNum('gv'+k,`كم رأسًا لهذا الشكل؟`,SH[k][1],[1,-1,2,-2],1,ar,svgW(SH[k][2]))},
  ()=>{const ty=pickOne(['acute','right','obtuse']),a={acute:rnd(30,70),right:90,obtuse:rnd(110,150)}[ty],L={acute:'حادة',right:'قائمة',obtuse:'منفرجة'};return gTxt('ga'+ty,'ما نوع هذه الزاوية؟',L[ty],Object.values(L).filter(x=>x!==L[ty]).concat('مستقيمة'),angleFig(a))},
  ()=>gNum('gr','كم زاوية قائمة في المستطيل؟',4,[-1,-2,-3,1],0),
  ()=>gNum('g90','كم درجة قياس الزاوية القائمة؟',90,[-45,90,-30,30],1,deg),
  ()=>{const s=rnd(2,12);return gNum('gps'+s,`مربع طول ضلعه ${cm(s)}. كم محيطه؟`,4*s,[s,-s,2,-2,4,s*s-4*s||5],1,cm)},
  ()=>{const w=rnd(4,12),h=rnd(2,w-1);return gNum('gpr'+w+h,'كم محيط هذا المستطيل بالسنتيمتر؟',2*(w+h),[-(w+h),2,-2,4,-4,w,-h],1,cm,rectFig(w,h))},
  ()=>{const t=pickOne([['متساوي الأضلاع',5,5,5],['متساوي الساقين',6,6,4],['مختلف الأضلاع',3,4,5]]);return gTxt('gtt'+t[0],`مثلث أطوال أضلاعه ${ar(t[1])} و${ar(t[2])} و${ar(t[3])} سم. ما نوعه؟`,t[0],['متساوي الأضلاع','متساوي الساقين','مختلف الأضلاع'].filter(x=>x!==t[0]).concat('شبه منحرف'))}],
 [()=>{const w=rnd(4,15),h=rnd(2,9);return gNum('gar'+w+h,'كم مساحة هذا المستطيل؟',w*h,[w,-w,h,-h,2*(w+h)-w*h||3,10],1,cm2,rectFig(w,h))},
  ()=>{const s=rnd(3,12);return gNum('gas'+s,`مربع طول ضلعه ${cm(s)}. كم مساحته؟`,s*s,[s,-s,4*s-s*s||2,1,-1],1,cm2)},
  ()=>{const a=rnd(30,80),b=rnd(30,80);return gNum('g3'+a+b,`في مثلث، زاويتان قياسهما ${deg(a)} و${deg(b)}. كم قياس الزاوية الثالثة؟`,180-a-b,[10,-10,20,-5,5],1,deg)},
  ()=>{const l=rnd(6,15),w=rnd(2,l-1);return gNum('gw'+l+w,`مستطيل محيطه ${cm(2*(l+w))} وطوله ${cm(l)}. كم عرضه؟`,w,[1,-1,2,-2,l-w],1,cm)},
  ()=>{const a=rnd(3,9),b=rnd(3,9),c=rnd(3,9);return gNum('gpt'+a+b+c,`مثلث أطوال أضلاعه ${ar(a)} و${ar(b)} و${ar(c)} سم. كم محيطه؟`,a+b+c,[1,-1,2,-2,3,-3],1,cm)},
  ()=>gNum('g360','كم مجموع قياسات زوايا الشكل الرباعي؟',360,[-180,-270,180,-90],1,deg),
  ()=>gNum('g180','كم مجموع قياسات زوايا المثلث؟',180,[-90,180,90,-45],1,deg),
  ()=>pickOne([['وجهًا','faces',6,[-2,2,-1,6]],['حرفًا','edges',12,[-4,-6,2,6]],['رأسًا','verts',8,[-2,-4,2,4]]].map(([w,k,v,d])=>()=>gNum('gc'+k,`كم ${w} للمكعب؟`,v,d,1)))()]
];
function qGeo(){return Object.assign({kind:'geo',extra:8},pickOne(GEO[level])())}
const GEN={mul:qMul,div:qDiv,add:qAdd,sub:qSub,sqrt:qSqrt,geo:qGeo};
function makeQ(p){
  const c=cfgOf(p);level=c.level;topics=new Set(c.topics);tables=new Set(c.tables);
  const list=[...topics].filter(k=>GEN[k]);
  if(!list.length)list.push('mul');
  const rec=p.recent;let x,k,t=0;
  do{k=pickOne(list);x=GEN[k]()}while(rec.includes(x.key)&&++t<25);
  rec.push(x.key);if(rec.length>10)rec.shift();
  if(!x.show)x.show=x.ans;
  x.topic=k;x.level=c.level;x.id=++qSeq;
  return x;
}
