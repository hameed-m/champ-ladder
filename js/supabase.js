/* ---------- Supabase Cloud Sync & REST Client ---------- */
const SUPABASE_URL='https://dajienajgfeurozefawq.supabase.co';
const SUPABASE_KEY='sb_publishable_VlDVBW8KRA88d1YaHGehwQ_JE4wFBQU';

let sbOnline=false,sbSyncTimer=0;

function setCloudBadge(state,text){
  const el=$('#cloudStatus');
  if(!el)return;
  el.textContent=text;
  el.dataset.state=state;
}

async function sbFetch(path,opts={}){
  if(!canNet())throw new Error('offline-protocol');
  const headers=Object.assign({
    'apikey':SUPABASE_KEY,
    'Authorization':`Bearer ${SUPABASE_KEY}`,
    'Content-Type':'application/json'
  },opts.headers||{});
  const res=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,Object.assign({},opts,{headers}));
  if(!res.ok){
    const errTxt=await res.text().catch(()=>'');
    const err=new Error(`Supabase HTTP ${res.status}: ${errTxt}`);
    err.status=res.status;
    throw err;
  }
  const ct=res.headers.get('content-type')||'';
  if(ct.includes('application/json')){
    const txt=await res.text();
    return txt?JSON.parse(txt):null;
  }
  return null;
}

/* --- Admins Sync --- */
async function sbFetchAdmins(){
  try{
    const rows=await sbFetch('sullam_admins?select=email,password_hash,is_root,created_at&order=created_at.asc');
    if(Array.isArray(rows)){
      sbOnline=true;
      setCloudBadge('ok','☁️ متصل بقاعدة البيانات (Supabase)');
      const list=[];
      rows.forEach(r=>{
        const em=normalizeAdminEmail(r.email);
        if(em&&r.password_hash&&em!==ROOT_ADMIN.email){
          list.push({email:em,hash:r.password_hash,root:!!r.is_root});
        }
      });
      store.admins=list;
      saveStoreLocal();
      return rows;
    }
  }catch(e){
    sbOnline=false;
    if(e.status===404||String(e.message).includes('42P01')||String(e.message).includes('PGRST205')){
      setCloudBadge('warn','⚠️ يرجى تشغيل ملف supabase_schema.sql في Supabase');
    }else{
      setCloudBadge('off','⚠️ وضع محلي (تعذر الاتصال بـ Supabase)');
    }
  }
  return null;
}

async function sbEnsureRootAdmin(){
  try{
    await sbFetch('sullam_admins?on_conflict=email',{
      method:'POST',
      headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify([{
        email:ROOT_ADMIN.email,
        password_hash:ROOT_ADMIN.hash,
        is_root:true,
        created_by:'system'
      }])
    });
  }catch(e){}
}

async function sbUpsertAdmin(email,hash,createdBy){
  const em=normalizeAdminEmail(email);
  await sbFetch('sullam_admins?on_conflict=email',{
    method:'POST',
    headers:{'Prefer':'resolution=merge-duplicates,return=representation'},
    body:JSON.stringify([{
      email:em,
      password_hash:hash,
      is_root:em===ROOT_ADMIN.email,
      created_by:createdBy||ROOT_ADMIN.email
    }])
  });
}

async function sbDeleteAdmin(email){
  const em=normalizeAdminEmail(email);
  await sbFetch(`sullam_admins?email=eq.${encodeURIComponent(em)}`,{
    method:'DELETE'
  });
}

/* --- Rooms & Players Sync per Admin --- */
async function sbLoadAdminWorkspace(adminEmail){
  const em=normalizeAdminEmail(adminEmail);
  if(!em)return false;
  try{
    await sbEnsureRootAdmin();
    const [rooms,players]=await Promise.all([
      sbFetch(`sullam_rooms?admin_email=eq.${encodeURIComponent(em)}&order=created_at.asc`),
      sbFetch(`sullam_players?admin_email=eq.${encodeURIComponent(em)}&order=created_at.asc`)
    ]);
    if(!Array.isArray(rooms))return false;
    sbOnline=true;
    setCloudBadge('ok','☁️ متصل بقاعدة البيانات (Supabase)');

    if(rooms.length>0){
      const mappedRooms=rooms.map(r=>({
        id:r.id,
        name:r.name,
        code:r.join_code||'',
        set:{...DEF,...(r.settings||{})},
        profiles:(players||[]).filter(p=>p.room_id===r.id).map(p=>({
          id:p.id,
          name:p.name,
          emoji:p.emoji||'🦁',
          on:p.is_active!==false,
          level:typeof p.level==='number'?p.level:1,
          topics:Array.isArray(p.topics)&&p.topics.length?p.topics:['mul'],
          tables:Array.isArray(p.tables)&&p.tables.length?p.tables:ALLT.slice(),
          games:p.games||0,
          wins:p.wins||0,
          best:p.best||0,
          st:p.stats&&p.stats.t?p.stats:{t:{},tb:{},miss:{}}
        }))
      }));
      setAdminRooms(em,mappedRooms);
    }else{
      // Push local rooms for this admin to Supabase if they don't exist remotely yet
      await sbSyncAdminWorkspace(em);
    }
    return true;
  }catch(e){
    sbOnline=false;
    if(e.status===404||String(e.message).includes('42P01')||String(e.message).includes('PGRST205')){
      setCloudBadge('warn','⚠️ يرجى تشغيل ملف supabase_schema.sql في Supabase');
    }else{
      setCloudBadge('off','⚠️ وضع محلي (حفظ تلقائي في المتصفح)');
    }
    return false;
  }
}

async function sbSyncAdminWorkspace(adminEmail){
  const em=normalizeAdminEmail(adminEmail||(getSession()&&getSession().email));
  if(!em||!canNet())return;
  try{
    const ws=getAdminWorkspace(em);
    if(!ws||!Array.isArray(ws.rooms)||!ws.rooms.length)return;

    const roomRows=ws.rooms.map(r=>({
      id:r.id,
      admin_email:em,
      name:r.name,
      join_code:r.code||null,
      settings:r.set||{...DEF},
      updated_at:new Date().toISOString()
    }));

    await sbFetch('sullam_rooms?on_conflict=id',{
      method:'POST',
      headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify(roomRows)
    });

    const playerRows=[];
    ws.rooms.forEach(r=>{
      (r.profiles||[]).forEach(p=>{
        playerRows.push({
          id:p.id,
          room_id:r.id,
          admin_email:em,
          name:p.name,
          emoji:p.emoji||'🦁',
          is_active:p.on!==false,
          level:typeof p.level==='number'?p.level:1,
          topics:Array.isArray(p.topics)?p.topics:['mul'],
          tables:Array.isArray(p.tables)?p.tables:ALLT.slice(),
          games:p.games||0,
          wins:p.wins||0,
          best:p.best||0,
          stats:p.st||{t:{},tb:{},miss:{}},
          updated_at:new Date().toISOString()
        });
      });
    });

    if(playerRows.length){
      await sbFetch('sullam_players?on_conflict=id',{
        method:'POST',
        headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify(playerRows)
      });
    }
    sbOnline=true;
    setCloudBadge('ok','☁️ تم الحفظ في Supabase');
  }catch(e){}
}

async function sbDeleteRoomRemote(roomId){
  if(!roomId||!canNet())return;
  try{
    await sbFetch(`sullam_rooms?id=eq.${encodeURIComponent(roomId)}`,{method:'DELETE'});
  }catch(e){}
}

async function sbDeletePlayerRemote(playerId){
  if(!playerId||!canNet())return;
  try{
    await sbFetch(`sullam_players?id=eq.${encodeURIComponent(playerId)}`,{method:'DELETE'});
  }catch(e){}
}

async function sbLogMatch(winnerName,rankings){
  const sess=getSession();
  const em=sess?normalizeAdminEmail(sess.email):ROOT_ADMIN.email;
  const rm=curRoom();
  if(!canNet())return;
  try{
    await sbFetch('sullam_matches',{
      method:'POST',
      headers:{'Prefer':'return=minimal'},
      body:JSON.stringify([{
        room_id:rm?rm.id:null,
        room_name:rm?rm.name:'غرفة افتراضية',
        admin_email:em,
        winner_name:winnerName,
        board_size:N,
        mode:mode,
        rankings:rankings,
        played_at:new Date().toISOString()
      }])
    });
  }catch(e){}
}

function scheduleCloudSync(){
  clearTimeout(sbSyncTimer);
  sbSyncTimer=setTimeout(()=>{
    const sess=getSession();
    if(sess)sbSyncAdminWorkspace(sess.email);
  },900);
}
