import { ref } from 'vue';
import { pickOne } from '@/utils/format';

let AC: AudioContext | null = null;
let master: GainNode | null = null;
let voiceBus: GainNode | null = null;
let crowdBus: GainNode | null = null;
let ambGain: GainNode | null = null;
let ambSrc: AudioBufferSourceNode | null = null;

const cache: Record<string, AudioBuffer> = {};
const custom: Record<string, ArrayBuffer> = {};
const lastPick: Record<string, string> = {};

let VOICE: Record<string, string> = {};
let VNAMES: Record<string, string> = {};
let fallbackAud: Record<string, string> | null = null;
let fallbackPromise: Promise<Record<string, string>> | null = null;

export const muted = ref(false);
export const crowdOn = ref(true);
export const selectedDeviceVoice = ref('');
export const deviceVoices = ref<SpeechSynthesisVoice[]>([]);
export const customSlotKeys = ref<string[]>([]);
export const captionText = ref('');
export const loadedVoiceCount = ref(0);

const AMB_VOL = 0.2;
const AMB_DUCK = 0.09;

let cTok = 0;
let cSrc: AudioBufferSourceNode | null = null;
let audioEpoch = 0;

async function getFallbackAud(): Promise<Record<string, string>> {
  if (fallbackAud) return fallbackAud;
  if (!fallbackPromise) {
    fallbackPromise = fetch('/aud-data.json')
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: Record<string, string>) => {
        fallbackAud = d;
        return d;
      })
      .catch(() => ({}));
  }
  return fallbackPromise;
}

export async function loadVoicesManifest(): Promise<void> {
  if (!/^https?:/.test(location.protocol)) return;
  try {
    const r = await fetch('/voices/manifest.json', { cache: 'no-cache' });
    if (!r.ok) return;
    const m = (await r.json()) as { clips?: Record<string, string>; names?: Record<string, string> };
    VOICE = m.clips || {};
    VNAMES = m.names || {};
    loadedVoiceCount.value = Object.keys(VOICE).length;
  } catch {
    // Ignore
  }
}

export function ensureAC(): void {
  if (!AC) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    AC = new Ctx();
    master = AC.createGain();
    master.gain.value = muted.value ? 0 : 1;
    const lim = AC.createDynamicsCompressor();
    lim.threshold.value = -8;
    lim.ratio.value = 8;
    master.connect(lim);
    lim.connect(AC.destination);
    voiceBus = AC.createGain();
    voiceBus.connect(master);
    crowdBus = AC.createGain();
    crowdBus.gain.value = crowdOn.value ? 1 : 0;
    crowdBus.connect(master);
  }
  if (AC.state === 'suspended') {
    AC.resume().catch(() => {});
  }
}

export function setMuted(val: boolean): void {
  muted.value = val;
  if (val) stopComment();
  if (AC && master) master.gain.setTargetAtTime(val ? 0 : 1, AC.currentTime, 0.03);
}

export function setCrowdOn(val: boolean): void {
  crowdOn.value = val;
  if (AC && crowdBus) crowdBus.gain.setTargetAtTime(val ? 1 : 0, AC.currentTime, 0.08);
}

export function suspendOrResumeOnVisibility(hidden: boolean): void {
  try {
    if (AC) {
      if (hidden) AC.suspend();
      else AC.resume();
    }
  } catch {
    // Ignore
  }
}

function decode(ab: ArrayBuffer): Promise<AudioBuffer> {
  ensureAC();
  return new Promise((ok, no) => AC!.decodeAudioData(ab, ok, no));
}

async function buf(k: string): Promise<AudioBuffer> {
  if (custom[k]) {
    if (!cache['u:' + k]) cache['u:' + k] = await decode(custom[k].slice(0));
    return cache['u:' + k]!;
  }
  if (cache[k]) return cache[k]!;
  const file = k.startsWith('name:') ? VNAMES[k.slice(5)] : VOICE[k];
  if (file) {
    try {
      const r = await fetch('/voices/' + encodeURIComponent(file));
      if (r.ok) {
        cache[k] = await decode(await r.arrayBuffer());
        return cache[k]!;
      }
    } catch {
      // Fall through to embedded fallback
    }
  }
  const aud = await getFallbackAud();
  const b64 = aud[k];
  if (!b64) throw new Error('Audio clip missing: ' + k);
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  cache[k] = await decode(u.buffer);
  return cache[k]!;
}

export function preloadAudio(): void {
  const keys = Object.keys(VOICE).length ? Object.keys(VOICE) : ['correct_0', 'wrong_0', 'win_0', 'amb', 'cheer'];
  keys.filter((k) => !/^n\d/.test(k)).slice(0, 20).forEach((k) => buf(k).catch(() => {}));
}

async function playBuf(k: string, bus: GainNode, vol?: number, rate?: number): Promise<AudioBufferSourceNode> {
  ensureAC();
  const b = await buf(k);
  const s = AC!.createBufferSource();
  const g = AC!.createGain();
  s.buffer = b;
  s.playbackRate.value = rate || 1;
  g.gain.value = vol == null ? 1 : vol;
  s.connect(g);
  g.connect(bus);
  s.start();
  return s;
}

export async function startCrowd(): Promise<void> {
  stopCrowd();
  ensureAC();
  const ep = ++audioEpoch;
  try {
    const b = await buf('amb');
    if (ep !== audioEpoch || !AC || !crowdBus) return;
    const s = AC.createBufferSource();
    const g = AC.createGain();
    s.buffer = b;
    s.loop = true;
    if (!custom.amb) {
      s.loopStart = 0.2;
      s.loopEnd = Math.min(b.duration, 16.2);
    }
    g.gain.setValueAtTime(0.0001, AC.currentTime);
    g.gain.linearRampToValueAtTime(AMB_VOL, AC.currentTime + 1.5);
    s.connect(g);
    g.connect(crowdBus);
    s.start(0, custom.amb ? 0 : 0.2);
    ambSrc = s;
    ambGain = g;
  } catch {
    // Ignore
  }
}

export function stopCrowd(): void {
  audioEpoch++;
  try {
    if (ambSrc && ambGain && AC) {
      const s = ambSrc;
      const g = ambGain;
      const t = AC.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(0.0001, t, 0.15);
      s.stop(t + 0.8);
    }
  } catch {
    // Ignore
  }
  ambSrc = null;
  ambGain = null;
}

function duck(on: boolean): void {
  try {
    if (ambGain && AC) ambGain.gain.setTargetAtTime(on ? AMB_DUCK : AMB_VOL, AC.currentTime, 0.12);
  } catch {
    // Ignore
  }
}

export function crowdFx(k: string, vol?: number): void {
  if (muted.value || !crowdOn.value) return;
  ensureAC();
  if (!crowdBus) return;
  const key = (k === 'cheer' || k === 'roar') && custom.cheer ? 'cheer' : k;
  playBuf(key, crowdBus, vol).catch(() => {});
}

export function stopComment(): void {
  cTok++;
  try {
    if (cSrc) cSrc.stop();
  } catch {
    // Ignore
  }
  cSrc = null;
  try {
    if ('speechSynthesis' in window && (speechSynthesis.speaking || speechSynthesis.pending)) {
      speechSynthesis.cancel();
    }
  } catch {
    // Ignore
  }
}

function clipFor(ev: string): string | null {
  if (custom[ev] || VOICE[ev]) return ev;
  const voiceOpts = Object.keys(VOICE).filter((k) => k.startsWith(ev + '_'));
  if (voiceOpts.length) {
    let k: string;
    do {
      k = pickOne(voiceOpts);
    } while (voiceOpts.length > 1 && k === lastPick[ev]);
    lastPick[ev] = k;
    return k;
  }
  return ev + '_0';
}

export function refreshArabicVoices(): SpeechSynthesisVoice[] {
  try {
    if (!('speechSynthesis' in window)) return [];
    const vs = speechSynthesis.getVoices().filter((x) => x.lang && x.lang.toLowerCase().replace('_', '-').startsWith('ar'));
    deviceVoices.value = vs;
    return vs;
  } catch {
    return [];
  }
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const vs = refreshArabicVoices();
  const sel = selectedDeviceVoice.value;
  return (
    vs.find((x) => x.name === sel) ||
    vs.find((x) => /majed|maged|tarik|tareq|naayf|hamed|ahmed|male/i.test(x.name) && !/female/i.test(x.name)) ||
    vs.find((x) => !/laila|mariam|zeina|noura|salma|amira|female/i.test(x.name)) ||
    vs[0]
  );
}

export function speakDevice(text: string): Promise<boolean> {
  return new Promise((res) => {
    let done = false;
    let to = 0;
    const end = (ok: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(to);
      res(ok);
    };
    try {
      const v = pickVoice();
      if (!v) return end(false);
      const u = new SpeechSynthesisUtterance(text);
      u.lang = v.lang;
      u.voice = v;
      u.rate = 1.15;
      u.pitch = 1;
      u.volume = 1;
      u.onend = () => end(true);
      u.onerror = () => end(false);
      to = window.setTimeout(() => end(true), 700 + text.length * 260);
      speechSynthesis.resume();
      speechSynthesis.speak(u);
    } catch {
      end(false);
    }
  });
}

function clipPlay(k: string, tok: number): Promise<void> {
  return new Promise((res) => {
    if (tok !== cTok) return res();
    ensureAC();
    if (!voiceBus) return res();
    playBuf(k, voiceBus, 1, 1)
      .then((s) => {
        if (tok !== cTok) {
          try {
            s.stop();
          } catch {
            // Ignore
          }
          return res();
        }
        cSrc = s;
        const to = window.setTimeout(res, (s.buffer?.duration || 1) * 1000 + 400);
        s.onended = () => {
          clearTimeout(to);
          res();
        };
      })
      .catch(() => res());
  });
}

export type CommentPart = string | { i: number; name: string; named?: boolean };

export async function comment(parts: CommentPart[], cap?: string | null): Promise<void> {
  stopComment();
  const tok = cTok;
  if (cap != null) captionText.value = cap;
  if (muted.value) return;
  ensureAC();
  duck(true);
  let skipNum = false;
  for (const part of parts) {
    if (tok !== cTok) return;
    if (typeof part === 'object') {
      if (VNAMES[part.name]) {
        await clipPlay('name:' + part.name, tok);
      } else {
        const nm = part.named && refreshArabicVoices().length ? await speakDevice(part.name) : false;
        if (!nm) await clipPlay('p_' + Math.min(4, (part.i || 0) + 1), tok);
      }
    } else if (/^n\d/.test(part)) {
      if (!skipNum) await clipPlay(part, tok);
    } else {
      skipNum = !!custom[part];
      const k = clipFor(part);
      if (k) await clipPlay(k, tok);
    }
  }
  if (tok === cTok) duck(false);
}

function snd(f: number, d: number, type?: OscillatorType, v?: number, t?: number, f2?: number): void {
  try {
    if (muted.value) return;
    ensureAC();
    if (!AC || !master) return;
    const o = AC.createOscillator();
    const g = AC.createGain();
    const s = AC.currentTime + (t || 0);
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, s);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, s + d);
    g.gain.setValueAtTime(v || 0.15, s);
    g.gain.exponentialRampToValueAtTime(0.001, s + d);
    o.connect(g);
    g.connect(master);
    o.start(s);
    o.stop(s + d);
  } catch {
    // Ignore
  }
}

export function whistle(): void {
  try {
    if (muted.value) return;
    ensureAC();
    if (!AC || !master) return;
    [
      [0, 0.28],
      [0.34, 0.75],
    ].forEach(([at, d]) => {
      const s = AC!.currentTime + at!;
      const g = AC!.createGain();
      const lfo = AC!.createOscillator();
      const lg = AC!.createGain();
      lfo.frequency.value = 38;
      lg.gain.value = 90;
      lfo.connect(lg);
      [2350, 2520].forEach((f) => {
        const o = AC!.createOscillator();
        o.frequency.value = f;
        lg.connect(o.frequency);
        o.connect(g);
        o.start(s);
        o.stop(s + d!);
      });
      lfo.start(s);
      lfo.stop(s + d!);
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.09, s + 0.02);
      g.gain.setValueAtTime(0.09, s + d! - 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, s + d!);
      g.connect(master!);
    });
  } catch {
    // Ignore
  }
}

export const SFX = {
  tick: () => snd(500 + Math.random() * 300, 0.05, 'square', 0.05),
  step: () => snd(660, 0.08, 'triangle', 0.09),
  ok: () => {
    snd(660, 0.15, 'sine', 0.14);
    snd(880, 0.25, 'sine', 0.14, 0.12);
  },
  bad: () => snd(220, 0.35, 'sawtooth', 0.09, 0, 110),
  up: () => [523, 659, 784, 1047].forEach((f, i) => snd(f, 0.15, 'triangle', 0.13, i * 0.1)),
  down: () => snd(700, 0.7, 'sawtooth', 0.08, 0, 120),
  win: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => snd(f, 0.22, 'square', 0.06, i * 0.15)),
  warn: () => snd(900, 0.08, 'square', 0.07),
};

/* Custom Recordings in IndexedDB */
let dbP: Promise<IDBDatabase> | null = null;
function openDB(): Promise<IDBDatabase> {
  if (!dbP) {
    dbP = new Promise((ok, no) => {
      const r = indexedDB.open('sullam-sounds', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('c');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error);
    });
  }
  return dbP;
}

async function dbDo<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await openDB();
  return new Promise((ok, no) => {
    const t = d.transaction('c', mode);
    const r = fn(t.objectStore('c'));
    t.oncomplete = () => ok(r.result);
    t.onerror = () => no(t.error);
  });
}

export async function loadCustomRecordings(): Promise<void> {
  try {
    const ks = await dbDo<IDBValidKey[]>('readonly', (s) => s.getAllKeys());
    for (const k of ks) {
      const key = String(k);
      custom[key] = await dbDo<ArrayBuffer>('readonly', (s) => s.get(key));
    }
    customSlotKeys.value = Object.keys(custom);
  } catch {
    // Ignore
  }
}

export async function uploadCustomSlot(key: string, file: File): Promise<{ ok: boolean; msg?: string }> {
  if (file.size > 8e6) return { ok: false, msg: 'الملف كبير، اختر تسجيلًا أقل من ٨ ميجابايت.' };
  const ab = await file.arrayBuffer();
  try {
    ensureAC();
    await decode(ab.slice(0));
  } catch {
    return { ok: false, msg: 'تعذّر تشغيل هذا الملف، جرّب ملف MP3.' };
  }
  custom[key] = ab;
  delete cache['u:' + key];
  customSlotKeys.value = Object.keys(custom);
  try {
    await dbDo('readwrite', (s) => s.put(ab, key));
  } catch {
    return { ok: true, msg: 'سيعمل التسجيل الآن، لكن المتصفح لن يحفظه بعد الإغلاق.' };
  }
  return { ok: true };
}

export async function deleteCustomSlot(key: string): Promise<void> {
  delete custom[key];
  delete cache['u:' + key];
  customSlotKeys.value = Object.keys(custom);
  try {
    await dbDo('readwrite', (s) => s.delete(key));
  } catch {
    // Ignore
  }
}

export function previewSlot(key: string): void {
  ensureAC();
  if ((key === 'cheer' || key === 'amb') && crowdBus) {
    playBuf(key, crowdBus, 0.6)
      .then((s) => {
        try {
          if (AC) s.stop(AC.currentTime + 5);
        } catch {
          // Ignore
        }
      })
      .catch(() => {});
  } else {
    comment([key]);
  }
}
