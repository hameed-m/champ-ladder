/* ---------- Boot ---------- */
function fillVoices(){
  try{
    const vs=arVoices(),sel=$('#voiceSel');
    if(!vs.length){sel.hidden=true;return}
    const c=sel.value;
    sel.innerHTML='<option value="">صوت نطق الأسماء: تلقائي</option>'+vs.map(x=>`<option value="${esc(x.name)}">${esc(x.name)}</option>`).join('');
    sel.value=c;sel.hidden=false;
  }catch(e){}
}
if('speechSynthesis' in window){speechSynthesis.onvoiceschanged=fillVoices;fillVoices()}
$('#voiceSel').onchange=()=>{const nm=store.profiles[0]&&store.profiles[0].name;if(nm)speakDevice(nm)};

loadStore();
initQuickThemeBar();
initAuth();
const J0=QS.get('j');
if(J0&&/^\d{6}$/.test(J0))startClient(J0);
else{
  show('setup');
  switchMainTab(isAuthed()?'host':'join');
  renderSetup();
  loadCustom();
  loadVoices();
}
