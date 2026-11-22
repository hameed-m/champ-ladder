#!/usr/bin/env python3
"""يولّد أصوات معلّق «سلّم الأبطال» عبر Gemini TTS.
الاستخدام:
  export GEMINI_API_KEY=مفتاحك
  python3 generate_voices.py --sample        # يجرب الأصوات المرشحة
  python3 generate_voices.py --voice Fenrir  # يولّد كل المقاطع والأسماء
"""
import argparse, base64, csv, http.client, json, os, re, shutil, socket, ssl, subprocess, sys, time, urllib.parse, wave
HERE=os.path.dirname(os.path.abspath(__file__))
BASE='https://generativelanguage.googleapis.com/v1beta/models'
SAMPLE_IDS=['correct_0','wrong_0','win_0','n35']
SAMPLE_VOICES=['Fenrir','Puck','Algenib','Sadachbia']
NAME_STYLE="announcing a player's name, proud and excited, loud"
_CONN=None

def rows(path):
    if not os.path.exists(path): return []
    with open(path,encoding='utf-8-sig',newline='') as f: return list(csv.DictReader(f))

def _connect(host):
    ctx=ssl.create_default_context()
    c=http.client.HTTPSConnection(host,timeout=120,context=ctx)
    ip=socket.getaddrinfo(host,443,socket.AF_INET,socket.SOCK_STREAM)[0][4][0]
    raw=socket.create_connection((ip,443),timeout=30)
    c.sock=ctx.wrap_socket(raw,server_hostname=host)
    return c

def _parse_429(raw_resp):
    txt=raw_resp.decode('utf8','replace')
    is_daily='PerDay' in txt or 'per_day' in txt or 'day' in txt.lower() and 'quota' in txt.lower() and 'minute' not in txt.lower()
    m=re.search(r'"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"',txt)
    retry_s=float(m.group(1)) if m else None
    qm=re.search(r'"quotaId"\s*:\s*"([^"]+)"',txt)
    if qm and 'Day' in qm.group(1): is_daily=True
    elif qm and 'Minute' in qm.group(1): is_daily=False
    return is_daily,retry_s,qm.group(1) if qm else txt[:200]

def request(a,text,style,voice):
    global _CONN
    part={'text':text}
    if style: part['speech_metadata']={'style':style}
    body=json.dumps({'contents':[{'role':'user','parts':[part]}],
      'generationConfig':{'responseModalities':['AUDIO'],'speechConfig':{'voiceConfig':{'voice':voice}}}}).encode()
    u=urllib.parse.urlsplit(f'{a.base_url}/{a.model}:generateContent')
    path=u.path+(f'?{u.query}' if u.query else '')
    for attempt in range(12):
        key=a.keys[a.key_idx]
        headers={'Content-Type':'application/json','x-goog-api-key':key,'Connection':'keep-alive','User-Agent':'sulam-al-abtal-voice-kit/1.0'}
        try:
            if _CONN is None: _CONN=_connect(u.netloc)
            _CONN.request('POST',path,body=body,headers=headers)
            r=_CONN.getresponse()
            raw_resp=r.read()
            if r.status==429:
                is_daily,retry_s,qinfo=_parse_429(raw_resp)
                if is_daily:
                    if len(a.keys)>1 and a.key_idx+1<len(a.keys):
                        a.key_idx+=1; print(f'  انتهت الحصة اليومية للمفتاح {a.key_idx} ({qinfo}) — التبديل للمفتاح التالي...'); continue
                    sys.exit(f'\nتوقف: انتهت الحصة اليومية المجانية (Daily Quota) لهذا المفتاح/النموذج ({qinfo}).\n'
                             f'الحلول لإكمال الباقي فورًا من حيث توقف:\n'
                             f'  1) ضع عدة مفاتيح مفصولة بفاصلة: export GEMINI_API_KEY="key1,key2,key3"\n'
                             f'  2) أو جرّب نموذج TTS آخر له حصة مستقلة عبر الخيار: --model <اسم_النموذج>\n'
                             f'  3) أو فعّل الفوترة (Pay-as-you-go) في Google AI Studio لرفع الحد اليومي.')
                if len(a.keys)>1:
                    a.key_idx=(a.key_idx+1)%len(a.keys)
                wait=max(retry_s+2 if retry_s else 0, min(90,a.delay*(2**min(attempt,4))+10))
                print(f'  حد الدقيقة (429: {qinfo}) — انتظار {wait:.0f} ثانية...'); time.sleep(wait); continue
            if r.status>=500:
                wait=min(90,a.delay*(2**min(attempt,5))+5); print(f'  انتظار {wait:.0f} ثانية ({r.status})'); time.sleep(wait); continue
            if r.status>=400:
                sys.exit(f'خطأ من Google {r.status}: {raw_resp.decode("utf8","replace")[:300]}')
            data=json.loads(raw_resp)
            return base64.b64decode(data['candidates'][0]['content']['parts'][0]['inlineData']['data'])
        except (KeyError,IndexError,TypeError,json.JSONDecodeError,OSError,http.client.HTTPException,ssl.SSLError) as e:
            if _CONN is not None:
                try: _CONN.close()
                except Exception: pass
                _CONN=None
            wait=min(45,a.delay+attempt*4+3); print(f'  إعادة المحاولة بعد {wait:.0f} ثانية: {e}'); time.sleep(wait)
    sys.exit('فشل التوليد بعد عدة محاولات. أعد التشغيل وسيكمل من حيث توقف.')

def save(raw,out):
    tmp=out+'.wav'
    if raw[:4]==b'RIFF':
        with open(tmp,'wb') as f: f.write(raw)
    else:
        with wave.open(tmp,'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(raw)
    if shutil.which('ffmpeg'):
        af='silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,alimiter=limit=0.95'
        subprocess.run(['ffmpeg','-v','error','-y','-i',tmp,'-af',af,'-ac','1','-codec:a','libmp3lame','-b:a','64k',out],check=True)
        os.remove(tmp); return out
    final=out[:-4]+'.wav'; os.replace(tmp,final); return final

def safe(name): return 'name_'+re.sub(r'\W+','_',name,flags=re.UNICODE).strip('_')

def make_batches(jobs,out_dir,force=False,max_per_batch=25):
    pending=[]
    for cid,text,style,name in jobs:
        mp3=os.path.join(out_dir,cid+'.mp3'); wav=os.path.join(out_dir,cid+'.wav')
        if force or (not os.path.exists(mp3) and not os.path.exists(wav)):
            pending.append({'id':cid,'text':text,'style':style,'name':name})
    by_style={}
    for item in pending:
        by_style.setdefault(item['style'],[]).append(item)
    batches=[]
    for style,items in by_style.items():
        for i in range(0,len(items),max_per_batch):
            chunk=items[i:i+max_per_batch]
            batches.append({'index':len(batches)+1,'style':style,'items':chunk})
    return batches

def split_batch_audio(audio_path,items,out_dir):
    if not shutil.which('ffmpeg'):
        sys.exit('يتطلب تقسيم الدفعات وجود برنامج ffmpeg في النظام.')
    n=len(items)
    if n==1:
        with open(audio_path,'rb') as f: return [(items[0],save(f.read(),os.path.join(out_dir,items[0]['id']+'.mp3')))]
    dur_cmd=['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',audio_path]
    total_dur=float(subprocess.check_output(dur_cmd,text=True).strip())
    chosen=None
    for thresh in ['-38dB','-32dB','-26dB','-22dB']:
        for min_d in ['0.35','0.22','0.14','0.08']:
            p=subprocess.run(['ffmpeg','-i',audio_path,'-af',f'silencedetect=n={thresh}:d={min_d}','-f','null','-'],
                             capture_output=True,text=True,encoding='utf8',errors='replace')
            starts=[float(x) for x in re.findall(r'silence_start:\s*([0-9.]+)',p.stderr)]
            ends=[float(x) for x in re.findall(r'silence_end:\s*([0-9.]+)',p.stderr)]
            sils=[]
            for s,e in zip(starts,ends):
                if s<0.25 or e>total_dur-0.25: continue
                sils.append((e-s,(s+e)/2.0,s,e))
            sils.sort(key=lambda x:x[0],reverse=True)
            picked=[]
            for d,mid,s,e in sils:
                if all(abs(mid-pm)>0.35 for _,pm,_,_ in picked):
                    picked.append((d,mid,s,e))
                if len(picked)==n-1: break
            if len(picked)==n-1:
                chosen=sorted(m for _,m,_,_ in picked); break
        if chosen: break
    if not chosen:
        step=total_dur/n
        chosen=[step*i for i in range(1,n)]
        print(f'  تنبيه: لم يتم رصد {n-1} وقفات واضحة في {os.path.basename(audio_path)}، تم التقسيم المتساوي.')
    bounds=[0.0]+chosen+[total_dur]
    results=[]
    af='silenceremove=start_periods=1:start_threshold=-42dB,areverse,silenceremove=start_periods=1:start_threshold=-42dB,areverse,alimiter=limit=0.95'
    for idx,item in enumerate(items):
        t0,t1=bounds[idx],bounds[idx+1]
        out_mp3=os.path.join(out_dir,item['id']+'.mp3')
        subprocess.run(['ffmpeg','-v','error','-y','-ss',f'{t0:.3f}','-to',f'{t1:.3f}','-i',audio_path,
                        '-af',af,'-ac','1','-codec:a','libmp3lame','-b:a','64k',out_mp3],check=True)
        results.append((item,out_mp3))
    return results

def export_studio(batches,bdir):
    os.makedirs(bdir,exist_ok=True)
    meta_path=os.path.join(bdir,'batches.json')
    with open(meta_path,'w',encoding='utf8') as f: json.dump(batches,f,ensure_ascii=False,indent=2)
    cards=[]
    for b in batches:
        idx=b['index']; style=b['style']; items=b['items']
        joined='\n\n. . . . .\n\n'.join(x['text'] for x in items)
        ids=', '.join(x['id'] for x in items)
        cards.append(f"""
        <div class="card">
          <h3>الدفعة {idx} من {len(batches)} ({len(items)} مقطع) — احفظ الملف باسم: <code>batch_{idx}.wav</code></h3>
          <div class="ids">{ids}</div>
          <div class="row">
            <button onclick="copyText('style_{idx}', this)">1. نسخ Style Instructions</button>
            <input id="style_{idx}" value="{style.replace('"', '&quot;')}" readonly>
          </div>
          <div class="row">
            <button onclick="copyText('text_{idx}', this)">2. نسخ نص الدفعة ({len(items)} جملة)</button>
          </div>
          <textarea id="text_{idx}" rows="6" readonly>{joined}</textarea>
        </div>""")
    html=f"""<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
    <title>دفعات Google AI Studio — سلّم الأبطال</title>
    <style>
      body{{font-family:system-ui,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;background:#0f172a;color:#f8fafc}}
      .card{{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px;margin-bottom:18px}}
      h3{{margin:0 0 8px;color:#38bdf8}} .ids{{font-size:12px;color:#94a3b8;margin-bottom:10px;direction:ltr}}
      .row{{display:flex;gap:10px;margin-bottom:8px;align-items:center}}
      button{{background:#0284c7;color:#fff;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap}}
      button.done{{background:#16a34a}}
      input,textarea{{width:100%;background:#0f172a;color:#e2e8f0;border:1px solid #475569;border-radius:8px;padding:8px;font-family:inherit}}
      code{{background:#334155;padding:2px 6px;border-radius:4px;color:#fbbf24;direction:ltr;display:inline-block}}
      ol li{{margin-bottom:6px;line-height:1.6}}
    </style></head><body>
    <h1>توليد أصوات «سلّم الأبطال» من Google AI Studio بـ {len(batches)} دفعات فقط</h1>
    <ol>
      <li>افتح <b>Google AI Studio &rarr; Generate Speech</b> واختر الصوت <b>Fenrir</b> (Single-speaker audio).</li>
      <li>لكل دفعة بالأسفل: اضغط <b>نسخ Style Instructions</b> والصقه في خانة الـ Style، ثم اضغط <b>نسخ نص الدفعة</b> والصقه في خانة النص.</li>
      <li>شغّل التوليد (Run) وحمّل الملف الصوتي داخل المجلد: <code>{bdir}</code> باسم <code>batch_1.wav</code>، <code>batch_2.wav</code> ... إلخ.</li>
      <li>بعد تحميل الدفعات، شغّل الأمر: <code>python3 generate_voices.py --split-studio</code> ليقوم بتقطيعها تلقائيًا إلى {sum(len(b['items']) for b in batches)} ملف MP3 وتحديث <code>manifest.json</code>!</li>
    </ol>
    {''.join(cards)}
    <script>
      function copyText(id, btn){{
        const el=document.getElementById(id);
        navigator.clipboard.writeText(el.value);
        const old=btn.textContent; btn.textContent='✓ تم النسخ!'; btn.classList.add('done');
        setTimeout(()=>{{btn.textContent=old;btn.classList.remove('done')}},1800);
      }}
    </script></body></html>"""
    html_path=os.path.join(HERE,'studio_batches.html')
    with open(html_path,'w',encoding='utf8') as f: f.write(html)
    print(f'تم تجهيز {len(batches)} دفعة فقط (لإجمالي {sum(len(b["items"]) for b in batches)} مقطع متبقٍ)!\n'
          f'1) افتح الملف في المتصفح: {html_path}\n'
          f'2) احفظ ملفات الصوت من AI Studio داخل: {bdir} باسم batch_1.wav و batch_2.wav ...\n'
          f'3) شغّل: python3 generate_voices.py --split-studio')

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--voice',default='Fenrir'); p.add_argument('--model',default='gemini-3.8-flash-tts')
    p.add_argument('--out',default=os.path.join(HERE,'..','public','voices')); p.add_argument('--delay',type=float,default=7)
    p.add_argument('--sample',action='store_true'); p.add_argument('--only',help='معرفات مفصولة بفواصل، مثل win_0,n35')
    p.add_argument('--force',action='store_true',help='أعد توليد الموجود'); p.add_argument('--base-url',default=BASE)
    p.add_argument('--keys',help='مفاتيح إضافية مفصولة بفواصل للتبديل التلقائي عند انتهاء الحصة')
    p.add_argument('--batch',action='store_true',help='توليد كل 25 مقطع في طلب API واحد ثم تقسيمها تلقائيًا (يختصر 198 طلب إلى ~10 طلبات)')
    p.add_argument('--export-studio',action='store_true',help='تصدير صفحة HTML جاهزة للنسخ بضغطة زر إلى Google AI Studio Web')
    p.add_argument('--split-studio',action='store_true',help='تقطيع ملفات الصوت المحمّلة من Google AI Studio داخل مجلد batches تلقائيًا')
    p.add_argument('--batch-size',type=int,default=25,help='عدد المقاطع في كل دفعة (افتراضي 25)')
    a=p.parse_args()
    all_rows=rows(os.path.join(HERE,'voice_prompts.csv')); names=[r for r in rows(os.path.join(HERE,'names.csv')) if r.get('name','').strip()]
    os.makedirs(a.out,exist_ok=True)
    only=set(a.only.split(',')) if a.only else None
    jobs=[(r['id'],r['text'],r['style'],None) for r in all_rows if not only or r['id'] in only]
    if not only:
        for r in names: jobs.append((safe(r['name'].strip()),(r.get('spoken') or r['name']).strip()+'!',NAME_STYLE,r['name'].strip()))
    mpath=os.path.join(a.out,'manifest.json')
    man=json.load(open(mpath,encoding='utf8')) if os.path.exists(mpath) else {'clips':{},'names':{}}
    bdir=os.path.join(HERE,'batches')

    if a.export_studio:
        batches=make_batches(jobs,a.out,a.force,a.batch_size)
        if not batches: print('كل المقاطع موجودة بالفعل!'); return
        export_studio(batches,bdir); return

    if a.split_studio:
        meta_path=os.path.join(bdir,'batches.json')
        batches=json.load(open(meta_path,encoding='utf8')) if os.path.exists(meta_path) else make_batches(jobs,a.out,a.force,a.batch_size)
        done_any=False
        for b in batches:
            idx=b['index']
            cand=[os.path.join(bdir,f'batch_{idx}{ext}') for ext in ('.wav','.mp3','.ogg','.m4a')]
            found=next((c for c in cand if os.path.exists(c)),None)
            if not found:
                print(f'[تخطي] لم يتم العثور على batch_{idx}.wav في {bdir}')
                continue
            print(f'[تقسيم الدفعة {idx}] ({len(b["items"])} مقطع) من {os.path.basename(found)}...')
            for item,out_mp3 in split_batch_audio(found,b['items'],a.out):
                fn=os.path.basename(out_mp3)
                if item['name']: man['names'][item['name']]=fn
                else: man['clips'][item['id']]=fn
            with open(mpath,'w',encoding='utf8') as f: json.dump(man,f,ensure_ascii=False,indent=1)
            done_any=True
        for cid,_,_,name in jobs:
            mp3=os.path.join(a.out,cid+'.mp3'); wav=os.path.join(a.out,cid+'.wav')
            have=mp3 if os.path.exists(mp3) else wav if os.path.exists(wav) else None
            if have:
                if name: man['names'][name]=os.path.basename(have)
                else: man['clips'][cid]=os.path.basename(have)
        with open(mpath,'w',encoding='utf8') as f: json.dump(man,f,ensure_ascii=False,indent=1)
        if done_any: print('تم تقسيم الدفعات وتحديث manifest.json بنجاح!')
        return

    raw_keys=(a.keys or '')+','+os.environ.get('GEMINI_API_KEY','')
    a.keys=[k.strip() for k in re.split(r'[,\s]+',raw_keys) if k.strip()]
    a.key_idx=0
    if not a.keys: sys.exit('ضع المفتاح أولًا: export GEMINI_API_KEY=...')
    if a.sample:
        d=os.path.join(HERE,'samples'); os.makedirs(d,exist_ok=True)
        for v in SAMPLE_VOICES:
            for r in [x for x in all_rows if x['id'] in SAMPLE_IDS]:
                out=os.path.join(d,f"{v}_{r['id']}.mp3"); print(v,r['id']); save(request(a,r['text'],r['style'],v),out); time.sleep(a.delay)
        print('استمع إلى المجلد samples ثم اختر الصوت.'); return

    if a.batch:
        batches=make_batches(jobs,a.out,a.force,a.batch_size)
        os.makedirs(bdir,exist_ok=True)
        for b in batches:
            idx=b['index']; items=b['items']
            print(f'[دفعة {idx}/{len(batches)}] توليد {len(items)} مقطع في طلب واحد...')
            joined='\n\n. . . . .\n\n'.join(x['text'] for x in items)
            raw=request(a,joined,b['style'],a.voice)
            bwav=os.path.join(bdir,f'batch_{idx}.wav')
            if raw[:4]==b'RIFF':
                with open(bwav,'wb') as f: f.write(raw)
            else:
                with wave.open(bwav,'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(raw)
            for item,out_mp3 in split_batch_audio(bwav,items,a.out):
                fn=os.path.basename(out_mp3)
                if item['name']: man['names'][item['name']]=fn
                else: man['clips'][item['id']]=fn
            with open(mpath,'w',encoding='utf8') as f: json.dump(man,f,ensure_ascii=False,indent=1)
            time.sleep(a.delay)
        print('تم. ارفع مجلد voices مع index.html إلى GitHub Pages.'); return

    for i,(cid,text,style,name) in enumerate(jobs,1):
        out=os.path.join(a.out,cid+'.mp3'); wav=out[:-4]+'.wav'
        have=out if os.path.exists(out) else wav if os.path.exists(wav) else None
        if not have or a.force:
            print(f'[{i}/{len(jobs)}] {cid}'); have=save(request(a,text,style,a.voice),out); time.sleep(a.delay)
        fn=os.path.basename(have)
        if name: man['names'][name]=fn
        else: man['clips'][cid]=fn
        with open(mpath,'w',encoding='utf8') as f: json.dump(man,f,ensure_ascii=False,indent=1)
    print('تم. ارفع مجلد voices مع index.html إلى GitHub Pages.')
if __name__=='__main__': main()
