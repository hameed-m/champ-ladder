/* ---------- Authentication & Admin Management ---------- */
const AUTH_KEY='sullam-auth-v1';

// Built-in primary admin (supports both a.alhofufy@gmail.com and alhofufy.a@gmail.com)
const ROOT_ADMIN={
  email:'a.alhofufy@gmail.com',
  aliases:['alhofufy.a@gmail.com'],
  hash:'57972265854348ce50452cb2560b61c1b802cc116b8f1c0bbb8ba5a860570bcf',
  root:true
};

function normalizeAdminEmail(email){
  const em=String(email||'').trim().toLowerCase();
  if(ROOT_ADMIN.aliases.includes(em))return ROOT_ADMIN.email;
  return em;
}

// Pure-JS SHA-256 fallback (works over file:// and non-HTTPS local IPs where crypto.subtle is unavailable)
function sha256Fallback(ascii){
  const rightRotate=(v,a)=>(v>>>a)|(v<<(32-a));
  const mathPow=Math.pow,maxWord=mathPow(2,32);
  let result='',words=[],asciiBitLength=ascii.length*8;
  let hash=[],k=[];
  let primeCounter=0;
  const isComposite={};
  for(let candidate=2;primeCounter<64;candidate++){
    if(!isComposite[candidate]){
      for(let i=0;i<313;i+=candidate)isComposite[i]=candidate;
      hash[primeCounter]=(mathPow(candidate,.5)*maxWord)|0;
      k[primeCounter++]=(mathPow(candidate,1/3)*maxWord)|0;
    }
  }
  ascii+='\x80';
  while(ascii.length%64-56)ascii+='\x00';
  for(let i=0;i<ascii.length;i++){
    const j=ascii.charCodeAt(i);
    words[i>>2]|=j<<((3-i)%4)*8;
  }
  words[words.length]=(asciiBitLength/maxWord)|0;
  words[words.length]=asciiBitLength;
  for(let j=0;j<words.length;){
    const w=words.slice(j,j+=16),oldHash=hash.slice(0);
    for(let i=0;i<64;i++){
      const w15=w[i-15],w2=w[i-2];
      const a=hash[0],e=hash[4];
      const t1=hash[7]+(rightRotate(e,6)^rightRotate(e,11)^rightRotate(e,25))+((e&hash[5])^((~e)&hash[6]))+k[i]+(w[i]=(i<16)?w[i]:(w[i-16]+(rightRotate(w15,7)^rightRotate(w15,18)^(w15>>>3))+w[i-7]+(rightRotate(w2,17)^rightRotate(w2,19)^(w2>>>10)))|0);
      const t2=(rightRotate(a,2)^rightRotate(a,13)^rightRotate(a,22))+((a&hash[1])^(a&hash[2])^(hash[1]&hash[2]));
      hash=[(t1+t2)|0].concat(hash);
      hash[4]=(hash[4]+t1)|0;
      hash.pop();
    }
    for(let i=0;i<8;i++)hash[i]=(hash[i]+oldHash[i])|0;
  }
  for(let i=0;i<8;i++){
    for(let j=3;j+1;j--){
      const b=(hash[i]>>(j*8))&255;
      result+=((b<16)?0:'')+b.toString(16);
    }
  }
  return result;
}

async function hashCreds(email,password){
  const raw=`${normalizeAdminEmail(email)}:${String(password||'')}`;
  try{
    if(window.crypto&&crypto.subtle){
      const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }
  }catch(e){}
  const utf8=unescape(encodeURIComponent(raw));
  return sha256Fallback(utf8);
}

function getAllAdmins(){
  const list=[ROOT_ADMIN];
  if(Array.isArray(store.admins)){
    store.admins.forEach(a=>{
      const em=normalizeAdminEmail(a&&a.email);
      if(em&&a.hash&&em!==ROOT_ADMIN.email&&!list.some(x=>x.email===em)){
        list.push({email:em,hash:a.hash,root:false});
      }
    });
  }
  return list;
}

function getSession(){
  try{
    const s=JSON.parse(localStorage.getItem(AUTH_KEY));
    if(!s||!s.email||!s.hash)return null;
    const em=normalizeAdminEmail(s.email);
    const match=getAllAdmins().find(a=>a.email===em&&a.hash===s.hash);
    return match||null;
  }catch(e){return null}
}

function isAuthed(){return !!getSession()}

async function loginAdmin(email,password){
  const em=normalizeAdminEmail(email);
  if(!em||!password)return{ok:false,msg:'أدخل البريد الإلكتروني وكلمة المرور.'};
  if(typeof sbFetchAdmins==='function'){
    await sbFetchAdmins();
  }
  const admins=getAllAdmins();
  const h=await hashCreds(em,password);
  let found=admins.find(a=>a.email===em&&a.hash===h);
  if(!found&&String(password).trim()!==String(password)){
    const hTrim=await hashCreds(em,String(password).trim());
    found=admins.find(a=>a.email===em&&a.hash===hTrim);
  }
  if(!found)return{ok:false,msg:'البريد الإلكتروني أو كلمة المرور غير صحيحة.'};
  try{localStorage.setItem(AUTH_KEY,JSON.stringify({email:found.email,hash:found.hash}))}catch(e){}
  switchAdminWorkspace(found.email);
  if(typeof sbLoadAdminWorkspace==='function'){
    await sbLoadAdminWorkspace(found.email);
  }
  if(typeof renderSetup==='function')renderSetup();
  else renderAuthUI();
  return{ok:true};
}

function logoutAdmin(){
  try{localStorage.removeItem(AUTH_KEY)}catch(e){}
  renderAuthUI();
}

async function addAdminAccount(email,password){
  const sess=getSession();
  if(!sess)return{ok:false,msg:'يجب تسجيل الدخول أولًا.'};
  const em=normalizeAdminEmail(email);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))return{ok:false,msg:'أدخل بريدًا إلكترونيًا صحيحًا.'};
  if(!password||password.length<4)return{ok:false,msg:'أدخل كلمة مرور (٤ أحرف على الأقل).'};
  if(typeof sbFetchAdmins==='function')await sbFetchAdmins();
  if(getAllAdmins().some(a=>a.email===em))return{ok:false,msg:'هذا البريد مسجّل بالفعل ضمن المشرفين.'};
  const h=await hashCreds(em,password);
  store.admins=store.admins||[];
  store.admins.push({email:em,hash:h});
  saveStoreLocal();

  let cloudNote=' (تم الحفظ في قاعدة البيانات الدائمة Supabase)';
  if(typeof sbUpsertAdmin==='function'){
    try{
      await sbUpsertAdmin(em,h,sess.email);
      await sbFetchAdmins();
    }catch(e){
      cloudNote=' (تم الحفظ محليًا — تأكد من تشغيل supabase_schema.sql في Supabase)';
    }
  }
  renderAdminList();
  return{ok:true,msg:`تمت إضافة المشرف ${em} بنجاح${cloudNote}.`};
}

async function removeAdminAccount(email){
  if(!isAuthed())return;
  const em=normalizeAdminEmail(email);
  if(em===ROOT_ADMIN.email)return;
  store.admins=(store.admins||[]).filter(a=>normalizeAdminEmail(a.email)!==em);
  saveStoreLocal();
  if(typeof sbDeleteAdmin==='function'){
    try{await sbDeleteAdmin(em)}catch(e){}
  }
  if(!isAuthed()){renderAuthUI();return}
  renderAdminList();
}

function renderAdminList(){
  const ul=$('#admList');if(!ul)return;
  const admins=getAllAdmins();
  ul.innerHTML=admins.map(a=>`<li>
    <span><b>${esc(a.email)}</b> ${a.root?'<small class="adm-badge">مشرف أساسي</small>':''}</span>
    ${a.root?'':`<button class="mini" data-del-adm="${esc(a.email)}" aria-label="حذف المشرف ${esc(a.email)}">✕</button>`}
  </li>`).join('');
}

function renderAuthUI(){
  const sess=getSession();
  const loginBox=$('#loginBox'),hostPanel=$('#hostPanel');
  if(!loginBox||!hostPanel)return;
  if(sess){
    if(store.activeAdmin!==sess.email)switchAdminWorkspace(sess.email);
    loginBox.hidden=true;
    hostPanel.hidden=false;
    $('#authUser').textContent=`👤 المشرف: ${sess.email}`;
    renderAdminList();
  }else{
    loginBox.hidden=false;
    hostPanel.hidden=true;
    $('#authErr').textContent='';
  }
}

async function initAuth(){
  $('#loginBtn').onclick=async()=>{
    const btn=$('#loginBtn');
    const em=$('#loginEmail').value,pw=$('#loginPass').value;
    btn.disabled=true;
    const res=await loginAdmin(em,pw);
    btn.disabled=false;
    if(!res.ok)$('#authErr').textContent=res.msg;
    else{$('#loginPass').value='';$('#authErr').textContent=''}
  };
  const onEnter=e=>{if(e.key==='Enter')$('#loginBtn').click()};
  $('#loginEmail').onkeydown=onEnter;
  $('#loginPass').onkeydown=onEnter;

  $('#logoutBtn').onclick=()=>{logoutAdmin()};

  $('#addAdmBtn').onclick=async()=>{
    const btn=$('#addAdmBtn');
    const em=$('#newAdmEmail').value,pw=$('#newAdmPass').value,msg=$('#admMsg');
    btn.disabled=true;
    const res=await addAdminAccount(em,pw);
    btn.disabled=false;
    msg.textContent=res.msg;
    msg.className=res.ok?'ok':'';
    if(res.ok){$('#newAdmEmail').value='';$('#newAdmPass').value=''}
  };
  $('#admList').onclick=e=>{
    const b=e.target.closest('[data-del-adm]');
    if(b)removeAdminAccount(b.dataset.delAdm);
  };

  renderAuthUI();
  if(typeof sbFetchAdmins==='function'){
    await sbFetchAdmins();
    const sess=getSession();
    if(sess){
      switchAdminWorkspace(sess.email);
      await sbLoadAdminWorkspace(sess.email);
      if(typeof renderSetup==='function')renderSetup();
    }else{
      renderAuthUI();
    }
  }
}
