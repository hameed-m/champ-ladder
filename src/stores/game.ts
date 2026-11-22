import { defineStore } from 'pinia';
import { computed, markRaw, ref } from 'vue';
import Peer, { type DataConnection } from 'peerjs';
import QRCode from 'qrcode';
import { CARD, COLORS, LEVELS, MAXP, REACT } from '@/constants/game';
import {
  captionText,
  comment,
  type CommentPart,
  crowdFx,
  ensureAC,
  loadVoicesManifest,
  preloadAudio,
  SFX,
  startCrowd,
  stopComment,
  stopCrowd,
  whistle,
} from '@/services/audio';
import { generateBoardData } from '@/services/board';
import { logRemoteMatch } from '@/services/cloud';
import { generateQuestion } from '@/services/questions';
import type {
  ArenaId,
  BoardData,
  BoardPlayerView,
  CardType,
  ClientActionMessage,
  ClientAudioPacket,
  ClientViewMessage,
  FloatingFx,
  GamePhase,
  MatchRankingItem,
  PlayerRuntime,
  PushTarget,
  Question,
} from '@/types/game';
import { ar, pickOne, rnd, sleep, within } from '@/utils/format';
import { useThemeStore } from '@/stores/theme';
import { useWorkspaceStore } from '@/stores/workspace';

export interface LobbySeat {
  pid: string;
  token: string | null;
  conn: DataConnection | null;
  seen?: number;
}

interface RaceState {
  ids: number[];
  qs: Record<number, Question>;
  out: number[];
  title: string;
  res: (winner: number) => void;
}

const QS = new URLSearchParams(location.search);
const PS = QS.get('ps');

export function getPeerOpts() {
  if (!PS) return { debug: 0 };
  const [h, pt] = PS.split(':');
  return { host: h, port: Number(pt), path: '/', secure: false, debug: 0 };
}

export function getJoinUrl(c: string): string {
  return location.origin + location.pathname + '?j=' + c + (PS ? '&ps=' + PS : '');
}

let wakeLock: WakeLockSentinel | null = null;
export async function keepAwake(): Promise<void> {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    }
  } catch {
    // Ignore
  }
}

function speedStepsFor(ratio: number): number {
  if (ratio >= 0.8) return 6;
  if (ratio >= 0.65) return 5;
  if (ratio >= 0.5) return 4;
  if (ratio >= 0.35) return 3;
  if (ratio >= 0.2) return 2;
  return 1;
}

export const useGameStore = defineStore('game', () => {
  const ws = useWorkspaceStore();
  const theme = useThemeStore();

  const mode = ref<'local' | 'online'>('local');
  const seats = ref<LobbySeat[]>([]);
  const roomCode = ref('');
  const lobbyQrSvg = ref('');
  const netMsg = ref('');
  const canFallbackLocal = ref(false);

  const players = ref<PlayerRuntime[]>([]);
  const board = ref<BoardData>({ n: 6, arena: 'classic', lad: {}, snk: {}, allq: [], surp: [] });
  const cur = ref(0);
  const won = ref(false);
  const paused = ref(false);

  const phase = ref<GamePhase>('busy');
  const dice = ref(0);
  const animDice = ref<number | null>(null);
  const msg = ref('');
  const msgKind = ref<'' | 'ok' | 'bad'>('');
  const q = ref<Question | null>(null);
  const raceState = ref<RaceState | null>(null);
  const left = ref(0);
  const total = ref(1);
  const winnerName = ref('');
  const showEndModal = ref(false);
  const rankings = ref<MatchRankingItem[]>([]);
  const floatingFx = ref<FloatingFx[]>([]);

  let peer: Peer | null = null;
  let tid = 0;
  let pingTimer = 0;
  let lastSec = 0;
  let epoch = 0;
  let fxSeq = 0;
  const reactAt: Record<number, number> = {};

  const lastSquare = computed(() => board.value.n * board.value.n);
  const currentPlayer = computed(() => players.value[cur.value]);
  const live = (s: { conn?: { open?: boolean } | null } | undefined): boolean =>
    !!(s && s.conn && s.conn.open);
  const connected = (p: PlayerRuntime): boolean =>
    mode.value !== 'online' || live(seats.value.find((s) => s.token === p.token));

  const anyDisconnected = computed(
    () => mode.value === 'online' && players.value.some((p) => !connected(p)),
  );

  const boardPlayers = computed<BoardPlayerView[]>(() =>
    players.value.map((p, i) => ({
      i: p.i,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      pos: p.pos,
      score: p.score,
      turn: i === cur.value,
      off: mode.value === 'online' && !connected(p),
      cards: p.cards,
    })),
  );

  const localControllerView = computed<ClientViewMessage | null>(() => {
    if (mode.value !== 'local' || !players.value.length) return null;
    return buildViewFor(cur.value, false);
  });

  function spawnFx(emoji: string, color: string): void {
    const id = ++fxSeq;
    floatingFx.value.push({ id, emoji, color, leftPct: rnd(8, 86) });
    window.setTimeout(() => {
      floatingFx.value = floatingFx.value.filter((x) => x.id !== id);
    }, 2400);
  }

  /* ---------- Audio Broadcast Helpers (Req #22) ---------- */
  function broadcastAudio(packet: Omit<ClientAudioPacket, 't'>): void {
    if (mode.value !== 'online' || ws.currentSettings.clientAudio === false) return;
    const payload: ClientAudioPacket = { t: 'audio', ...packet };
    players.value.forEach((_, idx) => pushSocketMsg(idx, payload));
  }

  function playSfx(name: NonNullable<ClientAudioPacket['sfx']>): void {
    SFX[name]();
    broadcastAudio({ kind: 'sfx', sfx: name });
  }

  function playWhistle(): void {
    whistle();
    broadcastAudio({ kind: 'whistle' });
  }

  function playComment(parts: CommentPart[], cap?: string | null): Promise<void> {
    const cleanParts = parts.map((pt) =>
      typeof pt === 'string' ? pt : { i: pt.i, name: pt.name, named: pt.named },
    );
    broadcastAudio({ kind: 'comment', parts: cleanParts });
    return comment(parts, cap);
  }

  function toggleClientAudio(): void {
    ws.currentSettings.clientAudio = ws.currentSettings.clientAudio === false;
    ws.save();
    broadcastState();
  }

  function rankOf(idx: number): number {
    return (
      [...players.value]
        .sort((a, b) => b.pos - a.pos || b.score - a.score)
        .findIndex((p) => p.i === idx) + 1
    );
  }

  function getPushTargets(playerIdx: number): PushTarget[] {
    if (!ws.currentSettings.pushback || players.value.length <= 1) return [];
    return players.value
      .filter((x, idx) => idx !== playerIdx && x.pos > 1)
      .map((x) => ({ i: x.i, name: x.name, emoji: x.emoji, pos: x.pos, color: x.color }));
  }

  function buildViewFor(i: number, consumeBuzz = true): ClientViewMessage {
    const p = players.value[i]!;
    const rQ = raceState.value && raceState.value.qs[i];
    const activeQ = rQ || (phase.value === 'q' && i === cur.value ? q.value : null);
    const canFwd = dice.value ? p.pos + dice.value <= lastSquare.value : true;
    const targets = i === cur.value && phase.value === 'choose' ? getPushTargets(i) : [];
    const curP = players.value[cur.value];
    const v: ClientViewMessage = {
      t: 'view',
      phase: phase.value,
      paused: paused.value,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      score: p.score,
      pos: p.pos,
      last: lastSquare.value,
      rank: rankOf(i),
      n: players.value.length,
      streak: p.streak,
      cards: [...p.cards],
      turn: i === cur.value,
      cur: curP ? curP.name : '',
      dice: animDice.value || dice.value || 0,
      canFwd,
      targets,
      moveMode: ws.currentSettings.moveMode || 'dice',
      clientAudio: ws.currentSettings.clientAudio !== false,
      theme: ws.currentSettings.theme || 'green',
      board: {
        n: board.value.n,
        arena: board.value.arena,
        lad: { ...board.value.lad },
        snk: { ...board.value.snk },
        allq: [...board.value.allq],
        surp: [...board.value.surp],
      },
      players: boardPlayers.value.map((x) => ({
        i: x.i,
        name: x.name,
        emoji: x.emoji,
        color: x.color,
        pos: x.pos,
        score: x.score,
        turn: x.turn,
      })),
      msg:
        i === cur.value || phase.value === 'race' || phase.value === 'end' || phase.value === 'choose'
          ? msg.value || ''
          : '',
      title: raceState.value ? raceState.value.title : '',
      left: left.value,
      total: total.value || 1,
      online: mode.value === 'online',
      buzz: p.buzz,
      out: raceState.value ? raceState.value.out.includes(i) : false,
      won: winnerName.value,
    };
    if (activeQ) {
      v.qid = activeQ.id;
      v.q = {
        text: activeQ.text,
        fig: activeQ.fig || '',
        kind: activeQ.kind,
        opts: activeQ.opts,
        timeSec: activeQ.timeSec,
      };
      v.reveal = activeQ.reveal ? { ans: activeQ.ans, pick: activeQ.reveal.pick } : null;
    }
    if (consumeBuzz) p.buzz = null;
    return v;
  }

  function pushToPlayer(i: number): void {
    if (i < 0 || !players.value[i]) return;
    const s = seats.value.find((x) => x.token === players.value[i]!.token);
    if (live(s)) {
      try {
        s!.conn!.send(buildViewFor(i, true));
      } catch {
        // Ignore
      }
    }
  }

  function pushSocketMsg(i: number, payload: unknown): void {
    if (i < 0 || !players.value[i]) return;
    const s = seats.value.find((x) => x.token === players.value[i]!.token);
    if (live(s)) {
      try {
        s!.conn!.send(payload);
      } catch {
        // Ignore
      }
    }
  }

  function broadcastState(): void {
    if (mode.value === 'online') {
      players.value.forEach((_, i) => pushToPlayer(i));
    }
  }

  /* ---------- PeerJS Host Lobby ---------- */
  function startPingLoop(): void {
    clearInterval(pingTimer);
    pingTimer = window.setInterval(() => {
      if (mode.value !== 'online') return;
      const now = Date.now();
      seats.value.forEach((s) => {
        if (!live(s)) return;
        if (s.seen && now - s.seen > 14000) {
          const c = s.conn;
          s.conn = null;
          try {
            c?.close();
          } catch {
            // Ignore
          }
          if (ws.view === 'game') broadcastState();
        } else {
          try {
            s.conn?.send({ t: 'ping' });
          } catch {
            // Ignore
          }
        }
      });
    }, 4000);
  }

  function openRoom(forceNewCode = false): void {
    if (!ws.isAuthed) {
      ws.setView('setup');
      return;
    }
    const rm = ws.currentRoom;
    mode.value = 'online';
    seats.value = [];
    lobbyQrSvg.value = '';
    canFallbackLocal.value = false;
    netMsg.value = 'جارٍ تجهيز الغرفة…';
    ws.setView('lobby');

    try {
      peer?.destroy();
    } catch {
      // Ignore
    }

    if (forceNewCode || !rm.code || !/^\d{6}$/.test(rm.code)) {
      ws.renewRoomCode();
    }
    roomCode.value = rm.code;

    let opened = false;
    const pr = new Peer('sullam-' + roomCode.value, getPeerOpts());
    peer = pr;
    const fail = window.setTimeout(() => {
      if (!opened && pr === peer) {
        netMsg.value = 'تعذر إنشاء الغرفة. تأكد من الإنترنت أو العب على هذا الجهاز.';
        canFallbackLocal.value = true;
      }
    }, 15000);

    pr.on('open', async () => {
      opened = true;
      clearTimeout(fail);
      netMsg.value = '';
      try {
        lobbyQrSvg.value = await QRCode.toString(getJoinUrl(roomCode.value), {
          type: 'svg',
          margin: 2,
          errorCorrectionLevel: 'M',
        });
      } catch {
        lobbyQrSvg.value = '';
      }
      startPingLoop();
    });

    pr.on('connection', handleConn);

    pr.on('error', (e: { type?: string }) => {
      if (pr !== peer) return;
      if (e.type === 'unavailable-id' && !opened) {
        clearTimeout(fail);
        openRoom(true);
        return;
      }
      if (!opened) {
        clearTimeout(fail);
        netMsg.value = 'تعذر إنشاء الغرفة. تأكد من الإنترنت أو العب على هذا الجهاز.';
        canFallbackLocal.value = true;
      }
    });

    pr.on('disconnected', () => {
      try {
        if (pr === peer && !pr.destroyed) pr.reconnect();
      } catch {
        // Ignore
      }
    });
  }

  function sendPickList(c: DataConnection): void {
    const used = seats.value.map((s) => s.pid);
    c.send({
      t: 'pickme',
      list: ws.currentRoom.profiles
        .filter((p) => !used.includes(p.id))
        .map((p) => ({ id: p.id, name: p.name, emoji: p.emoji })),
    });
  }

  function handleHello(c: DataConnection, token: string): void {
    const existing = seats.value.find((x) => x.token === token);
    if (existing) {
      const old = existing.conn;
      existing.conn = markRaw(c);
      existing.seen = Date.now();
      if (old && old !== c) {
        try {
          old.close();
        } catch {
          // Ignore
        }
      }
      const pObj = ws.findProfile(existing.pid);
      if (ws.view === 'game') {
        broadcastState();
        pushToPlayer(players.value.findIndex((p) => p.token === existing.token));
      } else {
        c.send({ t: 'wait', name: pObj ? pObj.name : 'لاعب' });
      }
      return;
    }
    if (ws.view === 'game' || seats.value.length >= MAXP) {
      c.send({ t: 'full' });
      return;
    }
    sendPickList(c);
  }

  function handlePick(c: DataConnection, m: { pid?: string; name?: string; token?: string }): void {
    if (ws.view === 'game' || seats.value.length >= MAXP || seats.value.some((s) => s.token === m.token)) return;
    let p = m.pid ? ws.findProfile(m.pid) : undefined;
    if (p && seats.value.some((s) => s.pid === p!.id)) {
      sendPickList(c);
      return;
    }
    if (!p) {
      const nm = String(m.name || '').trim().slice(0, 14);
      if (!nm) return;
      p = ws.currentRoom.profiles.find((x) => x.name === nm) || ws.addProfile(nm);
    }
    seats.value.push({ pid: p.id, token: String(m.token || ''), conn: markRaw(c), seen: Date.now() });
    c.send({ t: 'wait', name: p.name });
  }

  function handleConn(c: DataConnection): void {
    c.on('data', (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const m = raw as Record<string, unknown>;
      if (m.t === 'hello') return handleHello(c, String(m.token || ''));
      if (m.t === 'pick') return handlePick(c, m as { pid?: string; name?: string; token?: string });
      const s = seats.value.find((x) => x.conn === c);
      if (!s) return;
      s.seen = Date.now();
      if (m.t === 'pong') return;
      const i = players.value.findIndex((p) => p.token === s.token);
      if (i >= 0) act(i, m as unknown as ClientActionMessage);
    });
    c.on('close', () => {
      const s = seats.value.find((x) => x.conn === c);
      if (!s) return;
      s.conn = null;
      if (ws.view === 'game') broadcastState();
    });
  }

  function kickSeat(idx: number): void {
    const [removed] = seats.value.splice(idx, 1);
    if (removed?.conn) {
      try {
        removed.conn.send({ t: 'kicked' });
      } catch {
        // Ignore
      }
    }
  }

  /* ---------- Game Lifecycle ---------- */
  function startLocalGame(): { ok: boolean; msg?: string } {
    const ps = ws.currentRoom.profiles.filter((p) => p.on).slice(0, MAXP);
    if (!ps.length) return { ok: false, msg: 'أضف لاعبًا واحدًا على الأقل واختره (من ١ إلى ٦ لاعبين).' };
    mode.value = 'local';
    seats.value = ps.map((p) => ({ pid: p.id, token: null, conn: null }));
    startGame();
    return { ok: true };
  }

  function startGame(): void {
    if (!ws.isAuthed) {
      ws.setView('setup');
      return;
    }
    epoch++;
    clearInterval(tid);
    paused.value = false;
    showEndModal.value = false;
    const s = ws.currentSettings;
    theme.applyHostDefault(s.theme);

    players.value = seats.value.map((st, i) => {
      const pr = ws.findProfile(st.pid)!;
      return {
        i,
        pid: pr.id,
        token: st.token,
        name: pr.name,
        named: true,
        emoji: pr.emoji,
        color: COLORS[i % COLORS.length]!,
        pos: 1,
        score: 0,
        correct: 0,
        wrong: 0,
        streak: 0,
        wrun: 0,
        adj: 0,
        cards: [],
        recent: [],
        frozen: false,
        dbl: false,
        buzz: null,
      };
    });

    cur.value = 0;
    won.value = false;
    phase.value = 'busy';
    msg.value = '';
    msgKind.value = '';
    q.value = null;
    raceState.value = null;
    dice.value = 0;
    animDice.value = null;
    captionText.value = '';

    board.value = generateBoardData(s, mode.value === 'online');
    ws.setView('game');
    setTurn();
    ensureAC();
    void loadVoicesManifest().then(() => preloadAudio());
    keepAwake();
    startCrowd();
    playWhistle();
    playComment(['welcome_0'], 'أهلًا بكم في تحدي الأبطال!');
  }

  function toMenu(): void {
    epoch++;
    clearInterval(tid);
    clearInterval(pingTimer);
    stopComment();
    stopCrowd();
    paused.value = false;
    seats.value.forEach((s) => {
      try {
        s.conn?.send({ t: 'bye' });
      } catch {
        // Ignore
      }
    });
    try {
      peer?.destroy();
    } catch {
      // Ignore
    }
    peer = null;
    seats.value = [];
    showEndModal.value = false;
    ws.setView('setup');
  }

  function changeLiveArena(arenaId: ArenaId): void {
    ws.currentSettings.arena = arenaId;
    board.value = { ...board.value, arena: arenaId };
    ws.save();
    broadcastState();
  }

  /* ---------- Turn & Timer Engine ---------- */
  function setMsg(text: string, kind: '' | 'ok' | 'bad' = ''): void {
    msg.value = text;
    msgKind.value = kind;
  }

  async function gate(ep: number): Promise<boolean> {
    while (paused.value && ep === epoch) await sleep(150);
    return ep === epoch;
  }

  function runTimer(ms: number, onEnd: () => void): void {
    clearInterval(tid);
    left.value = ms;
    total.value = ms;
    lastSec = 0;
    tid = window.setInterval(() => {
      const curP = players.value[cur.value];
      const pauseForDisconnect =
        mode.value === 'online' &&
        (phase.value === 'q' || phase.value === 'choose') &&
        curP &&
        !connected(curP);
      if (paused.value || pauseForDisconnect) return;
      left.value = Math.max(0, left.value - 100);
      const sec = left.value / 1000;
      if (sec > 0 && sec <= 3 && Math.ceil(sec) !== lastSec) {
        lastSec = Math.ceil(sec);
        playSfx('warn');
      }
      if (left.value <= 0) {
        clearInterval(tid);
        onEnd();
      }
    }, 100);
  }

  function setTurn(): void {
    clearInterval(tid);
    phase.value = 'ready';
    q.value = null;
    dice.value = 0;
    animDice.value = null;
    setMsg('');
    if (players.value[cur.value]) players.value[cur.value]!.buzz = 'turn';
    broadcastState();
  }

  function makeQuestionFor(p: PlayerRuntime): Question {
    const cfg = ws.cfgOf(p.pid, p.adj);
    return generateQuestion(cfg, p.recent);
  }

  function ask(): void {
    const p = players.value[cur.value];
    if (!p) return;
    const nextQ = makeQuestionFor(p);
    q.value = nextQ;
    phase.value = 'q';
    let ms = (nextQ.timeSec ?? ((LEVELS[nextQ.level]?.[1] ?? 18) + (nextQ.extra || 0))) * 1000;
    if (p.frozen) {
      ms = Math.max(5000, Math.round(ms / 2));
      p.frozen = false;
    }
    const moveHint =
      ws.currentSettings.moveMode === 'speed'
        ? 'أجب بأسرع وقت لتحصل على خطوات أكثر (١–٦ خطوات)!'
        : 'أجب إجابة صحيحة لترمي النرد وتتقدم!';
    setMsg(moveHint);
    runTimer(ms, () => answer(-1));
    broadcastState();
  }

  async function enterMoveDecisionOrAdvance(p: PlayerRuntime, steps: number, ep: number): Promise<void> {
    if (ep !== epoch || !(await gate(ep))) return;
    const rem = lastSquare.value - p.pos;
    const over = steps > rem;
    const targets = getPushTargets(cur.value);

    if (ws.currentSettings.pushback && targets.length > 0) {
      phase.value = 'choose';
      const decSec = ws.currentSettings.decisionTime;
      const timerNote = decSec > 0 ? ` (${ar(decSec)} ثوانٍ للاختيار)` : '';
      if (over) {
        setMsg(`🎯 لديك ${ar(steps)} خطوات (أكبر من المتبقي ${ar(rem)}). يمكنك إرجاع خصم أو تخطي الدور!${timerNote}`, 'bad');
      } else {
        setMsg(`🎯 لديك ${ar(steps)} خطوات! اختر: التقدم للأمام أو إرجاع خصم${timerNote}`, 'ok');
      }
      p.buzz = 'turn';
      if (decSec > 0) {
        runTimer(decSec * 1000, () => {
          if (phase.value === 'choose' && ep === epoch) {
            void executeForwardMove(p, steps, ep);
          }
        });
      } else {
        clearInterval(tid);
        left.value = 0;
        total.value = 1;
      }
      broadcastState();
      return;
    }

    await executeForwardMove(p, steps, ep);
  }

  async function onRoll(): Promise<void> {
    const ep = epoch;
    const p = players.value[cur.value];
    if (!p) return;
    phase.value = 'busy';
    broadcastState();

    const anim = (async () => {
      for (let i = 0; i < 9; i++) {
        playSfx('tick');
        animDice.value = rnd(1, 6);
        await sleep(70);
      }
      animDice.value = null;
    })();

    await within(Promise.all([anim, playComment([p, 'roll'], `${p.name} يرمي النرد!`)]), 4500);
    if (!(await gate(ep))) return;

    dice.value = rnd(1, 6) + (p.dbl ? rnd(1, 6) : 0);
    p.dbl = false;
    broadcastState();
    await within(playComment(['n' + Math.min(100, dice.value)]), 1500);
    if (!(await gate(ep))) return;

    await enterMoveDecisionOrAdvance(p, dice.value, ep);
  }

  async function executeForwardMove(p: PlayerRuntime, d: number, ep: number): Promise<void> {
    clearInterval(tid);
    phase.value = 'busy';
    broadcastState();
    const rem = lastSquare.value - p.pos;
    if (d > rem) {
      playSfx('bad');
      setMsg(`🎲 لديك ${ar(d)} خطوات وتحتاج إلى ${ar(rem)} بالضبط للوصول للنهاية! انتظر الدور القادم.`, 'bad');
      crowdFx('aww', 0.55);
      broadcastState();
      await sleep(2200);
      if (ep !== epoch || won.value || !(await gate(ep))) return;
      cur.value = (cur.value + 1) % players.value.length;
      setTurn();
      return;
    }
    await advance(p, d, ep);
    if (ep !== epoch || won.value || !(await gate(ep))) return;
    cur.value = (cur.value + 1) % players.value.length;
    setTurn();
  }

  async function executePushOpponent(actor: PlayerRuntime, targetIdx: number, d: number, ep: number): Promise<void> {
    clearInterval(tid);
    const target = players.value[targetIdx];
    if (!target || target === actor || target.pos <= 1) return;
    phase.value = 'busy';
    setMsg(`↩️ ${actor.name} قرر إرجاع ${target.name} ${ar(d)} خانات للخلف!`, 'ok');
    playSfx('down');
    crowdFx('roar', 0.7);
    broadcastState();
    await sleep(900);
    if (ep !== epoch || !(await gate(ep))) return;
    await stepBackTo(target, d, ep);
    if (ep !== epoch || !(await gate(ep))) return;
    await resolveSquareEffects(target, ep, 0);
    if (ep !== epoch || won.value || !(await gate(ep))) return;
    cur.value = (cur.value + 1) % players.value.length;
    setTurn();
  }

  function act(i: number, m: ClientActionMessage): void {
    if (paused.value && m.t !== 'react') return;
    if (m.t === 'react' && m.e) {
      react(i, m.e);
      if (mode.value === 'online') {
        players.value.forEach((_, idx) => pushSocketMsg(idx, { t: 'fx', e: m.e, color: players.value[i]?.color }));
      }
      return;
    }
    if (m.t === 'ask' && phase.value === 'ready' && i === cur.value) return ask();
    if (m.t === 'roll' && phase.value === 'roll' && i === cur.value) {
      void onRoll();
      return;
    }
    if (m.t === 'move' && phase.value === 'choose' && i === cur.value) {
      clearInterval(tid);
      phase.value = 'busy';
      const actor = players.value[cur.value]!;
      if (m.dir === 'fwd' || m.dir === 'skip') {
        void executeForwardMove(actor, dice.value, epoch);
        return;
      }
      if (m.dir === 'back' && typeof m.target === 'number') {
        const ti = m.target;
        if (ti >= 0 && ti < players.value.length && ti !== cur.value && players.value[ti]!.pos > 1) {
          void executePushOpponent(actor, ti, dice.value, epoch);
          return;
        }
      }
      phase.value = 'choose';
      return;
    }
    if (m.t === 'answer' && typeof m.i === 'number') {
      if (phase.value === 'q' && i === cur.value && q.value && !q.value.reveal && m.id === q.value.id) {
        void answer(m.i);
        return;
      }
      if (phase.value === 'race' && raceState.value && raceState.value.qs[i] && m.id === raceState.value.qs[i]!.id) {
        raceAnswer(i, m.i);
        return;
      }
    }
    if (m.t === 'card' && i === cur.value && m.c) {
      useCard(i, m.c);
    }
  }

  function gainCard(p: PlayerRuntime): CardType | false {
    if (!ws.currentSettings.cards || p.cards.length >= 3) return false;
    const c = pickOne(Object.keys(CARD) as CardType[]);
    p.cards.push(c);
    p.buzz = 'good';
    return c;
  }

  function useCard(i: number, c: CardType): void {
    const p = players.value[i];
    if (!p) return;
    const at = p.cards.indexOf(c);
    if (at < 0) return;
    const isSpeed = ws.currentSettings.moveMode === 'speed';
    if (
      c === 'double' &&
      !p.dbl &&
      ((!isSpeed && phase.value === 'roll') || (isSpeed && (phase.value === 'ready' || phase.value === 'q')))
    ) {
      p.cards.splice(at, 1);
      p.dbl = true;
      playComment(['double'], isSpeed ? 'مضاعفة الخطوات!' : 'نرد مضاعف!');
      setMsg(isSpeed ? '⚡ ستتضاعف خطوات سرعتك في هذا الدور!' : '🎲 ستُرمى نردان في هذا الدور', 'ok');
      broadcastState();
    } else if (c === 'freeze' && (phase.value === 'ready' || phase.value === 'roll') && players.value.length > 1) {
      p.cards.splice(at, 1);
      players.value[(cur.value + 1) % players.value.length]!.frozen = true;
      playComment(['freeze'], 'تجميد! وقت اللاعب التالي نصف!');
      setMsg('❄️ وقت اللاعب التالي نصف');
      broadcastState();
    } else if (c === 'swap' && phase.value === 'q' && q.value && !q.value.reveal) {
      p.cards.splice(at, 1);
      playComment(['swap'], 'تبديل السؤال!');
      ask();
    }
  }

  function react(i: number, e: string): void {
    const now = Date.now();
    if (now - (reactAt[i] || 0) < 1200 || !REACT.includes(e as (typeof REACT)[number])) return;
    reactAt[i] = now;
    spawnFx(e, players.value[i]?.color || '#2f7fd6');
  }

  async function answer(i: number): Promise<void> {
    if (phase.value !== 'q' || !q.value || q.value.reveal) return;
    clearInterval(tid);
    const ep = epoch;
    const p = players.value[cur.value]!;
    const activeQ = q.value;
    const leftSec = Math.max(0, left.value / 1000);
    const totalSec = (total.value || 1000) / 1000;
    const ratio = leftSec / totalSec;
    const ok = i >= 0 && activeQ.opts[i] === activeQ.ans;
    activeQ.reveal = { pick: i };
    ws.recordAnswer(p.pid, activeQ, ok);

    if (ok) {
      p.correct++;
      p.streak++;
      p.wrun = 0;
      if (p.streak % 3 === 0) p.adj++;
      const hot = p.streak >= 3;
      const fast = ratio > 0.65;
      const pts = 10 + activeQ.level * 5 + Math.round(ratio * 5) + (hot ? 5 : 0);
      p.score += pts;
      p.buzz = 'good';
      const card = p.streak % 3 === 0 ? gainCard(p) : false;

      const isSpeed = ws.currentSettings.moveMode === 'speed';
      const earnedSteps = isSpeed ? speedStepsFor(ratio) * (p.dbl ? 2 : 1) : 0;
      if (isSpeed) p.dbl = false;

      setMsg(
        `صحيح! +${ar(pts)} نقطة` +
          (isSpeed ? ` · ⚡ ${ar(earnedSteps)} خطوات` : '') +
          (hot ? ' 🔥' : '') +
          (card ? ` ${CARD[card][0]} بطاقة ${CARD[card][1]}` : ''),
        'ok',
      );
      playSfx('ok');
      crowdFx(hot ? 'chant' : 'cheer', hot ? 0.8 : 0.65);
      broadcastState();
      await within(
        playComment(
          [hot ? 'streak' : fast ? 'fast' : 'correct'],
          hot ? 'سلسلة نارية! الجمهور يشتعل!' : fast ? 'بسرعة البرق!' : 'إجابة صحيحة! يا سلام!',
        ),
        3800,
      );
      if (!(await gate(ep))) return;
      q.value = null;

      if (isSpeed) {
        dice.value = earnedSteps;
        broadcastState();
        await within(playComment(['n' + Math.min(100, earnedSteps)]), 1500);
        if (!(await gate(ep))) return;
        await enterMoveDecisionOrAdvance(p, earnedSteps, ep);
        return;
      }

      phase.value = 'roll';
      setMsg('أحسنت! ارمِ النرد الآن 🎲', 'ok');
      p.buzz = 'turn';
      broadcastState();
      return;
    } else {
      p.wrong++;
      p.streak = 0;
      p.wrun++;
      p.buzz = 'bad';
      p.dbl = false;
      if (p.wrun === 2) {
        p.adj--;
        p.wrun = 0;
      }
      playSfx('bad');
      setMsg((i < 0 ? 'انتهى الوقت! ' : 'إجابة خاطئة! ') + `الصحيح: ${activeQ.show}`, 'bad');
      crowdFx('aww', 0.6);
      if (i < 0) playWhistle();
      broadcastState();
      await within(
        Promise.all([
          sleep(2200),
          playComment(
            [i < 0 ? 'timeout' : 'wrong'],
            i < 0 ? 'انتهى الوقت! الحكم يطلق الصافرة!' : 'يا خسارة! الكرة خارج المرمى!',
          ),
        ]),
        4800,
      );
      if (!(await gate(ep))) return;
      if (ws.currentSettings.steal && mode.value === 'online' && players.value.length > 1) {
        const ids = players.value.filter((x) => x.i !== cur.value && connected(x)).map((x) => x.i);
        if (ids.length) {
          playComment(['steal'], 'الفرصة مفتوحة! من يخطف الإجابة؟');
          const w = await runRace(ids, '⚡ سرقة الإجابة! الأسرع يأخذ ١٠ نقاط', 10000);
          if (ep !== epoch) return;
          if (w >= 0) {
            const wp = players.value[w]!;
            wp.score += 10;
            wp.buzz = 'good';
            setMsg(`⚡ ${wp.name} خطف ١٠ نقاط!`, 'ok');
            crowdFx('cheer', 0.6);
            broadcastState();
            await within(playComment(['stolen'], `${wp.name} خطفها!`), 3000);
          }
        }
      }
    }

    if (ep !== epoch || won.value || !(await gate(ep))) return;
    cur.value = (cur.value + 1) % players.value.length;
    setTurn();
  }

  function runRace(ids: number[], title: string, ms: number): Promise<number> {
    return new Promise((res) => {
      const qs: Record<number, Question> = {};
      ids.forEach((i) => {
        qs[i] = makeQuestionFor(players.value[i]!);
        players.value[i]!.buzz = 'turn';
      });
      phase.value = 'race';
      raceState.value = { ids, qs, out: [], title, res };
      runTimer(ms, () => endRace(-1));
      broadcastState();
    });
  }

  function endRace(w: number): void {
    clearInterval(tid);
    const r = raceState.value;
    if (!r) return;
    raceState.value = null;
    phase.value = 'busy';
    broadcastState();
    r.res(w);
  }

  function raceAnswer(i: number, idx: number): void {
    const r = raceState.value;
    if (!r || r.out.includes(i)) return;
    const rq = r.qs[i];
    const p = players.value[i];
    if (!rq || !p) return;
    const ok = rq.opts[idx] === rq.ans;
    ws.recordAnswer(p.pid, rq, ok);
    if (ok) {
      p.correct++;
      endRace(i);
      return;
    }
    p.wrong++;
    r.out.push(i);
    p.buzz = 'bad';
    if (r.ids.every((x) => r.out.includes(x) || !connected(players.value[x]!))) {
      endRace(-1);
    } else {
      broadcastState();
    }
  }

  async function stepTo(p: PlayerRuntime, k: number, ep: number): Promise<void> {
    for (let i = 0; i < k && p.pos < lastSquare.value; i++) {
      p.pos++;
      playSfx('step');
      broadcastState();
      await sleep(260);
      if (ep !== epoch) return;
    }
  }

  async function stepBackTo(p: PlayerRuntime, k: number, ep: number): Promise<void> {
    for (let i = 0; i < k && p.pos > 1; i++) {
      p.pos--;
      playSfx('step');
      broadcastState();
      await sleep(260);
      if (ep !== epoch) return;
    }
  }

  function finishIf(p: PlayerRuntime): boolean {
    if (p.pos >= lastSquare.value) {
      finish(p);
      return true;
    }
    return false;
  }

  async function advance(p: PlayerRuntime, d: number, ep: number): Promise<void> {
    await stepTo(p, d, ep);
    if (ep !== epoch || finishIf(p)) return;
    await resolveSquareEffects(p, ep, 0);
  }

  async function resolveSquareEffects(p: PlayerRuntime, ep: number, depth = 0): Promise<void> {
    if (ep !== epoch || finishIf(p) || depth > 5) return;
    const from = p.pos;
    const ladTo = board.value.lad[from];
    const snkTo = board.value.snk[from];
    const to = ladTo ?? snkTo;
    const up = ladTo !== undefined;
    const shield = to !== undefined && !up && p.cards.includes('shield');

    if (shield) {
      p.cards.splice(p.cards.indexOf('shield'), 1);
      setMsg(`🛡️ الدرع أنقذ ${p.name} من الحية!`, 'ok');
      crowdFx('cheer', 0.6);
      playSfx('up');
      broadcastState();
      await within(playComment(['shield'], 'الدرع ينقذه من الحية!'), 3500);
    } else if (to !== undefined) {
      setMsg(up ? `🪜 سلّم! ${p.name} يصعد إلى ${ar(to)}` : `🐍 حية! ${p.name} ينزل إلى ${ar(to)}`, up ? 'ok' : 'bad');
      p.buzz = up ? 'good' : 'bad';
      playSfx(up ? 'up' : 'down');
      crowdFx(up ? 'cheer' : 'aww', 0.65);
      broadcastState();
      const c = within(
        playComment(
          [up ? 'ladder' : 'snake', 'n' + to],
          up ? `صعود صاروخي إلى الخانة ${ar(to)}!` : `يا للهول! الحية تُنزله إلى الخانة ${ar(to)}!`,
        ),
        6000,
      );
      await sleep(700);
      if (ep !== epoch) return;
      p.pos = to;
      broadcastState();
      await Promise.all([sleep(700), c]);
      if (ep !== epoch || finishIf(p)) return;
      if (board.value.lad[p.pos] !== undefined || board.value.snk[p.pos] !== undefined) {
        await resolveSquareEffects(p, ep, depth + 1);
        return;
      }
    } else {
      await within(playComment(['move', 'n' + from], `${p.name} في الخانة ${ar(from)}!`), 3500);
    }

    if (!(await gate(ep))) return;

    if (board.value.surp.includes(p.pos)) {
      const c = gainCard(p);
      if (!c) p.score += 5;
      setMsg(c ? `🎁 مفاجأة لـ ${p.name}! ${CARD[c][0]} بطاقة ${CARD[c][1]}` : `🎁 مفاجأة لـ ${p.name}! +٥ نقاط`, 'ok');
      broadcastState();
      await within(playComment(['surprise'], 'مفاجأة!'), 2600);
      if (!(await gate(ep))) return;
    }

    if (board.value.allq.includes(p.pos) && ws.currentSettings.allq && mode.value === 'online' && players.value.length > 1) {
      const ids = players.value.filter(connected).map((x) => x.i);
      playComment(['all'], 'سؤال للجميع! الأسرع يفوز!');
      const w = await runRace(ids, '⭐ سؤال الجميع! الأسرع يتقدم ٣ خانات', 14000);
      if (ep !== epoch) return;
      if (w >= 0) {
        const wp = players.value[w]!;
        wp.score += 15;
        wp.buzz = 'good';
        setMsg(`⭐ ${wp.name} كان الأسرع!`, 'ok');
        crowdFx('cheer', 0.7);
        broadcastState();
        await within(playComment(['allwin'], `${wp.name} الأسرع!`), 3000);
        if (wp.pos + 3 <= lastSquare.value) {
          await stepTo(wp, 3, ep);
          if (ep !== epoch || finishIf(wp)) return;
          /* Fix Req #1: Also trigger ladders/snakes/effects after bonus steps */
          await resolveSquareEffects(wp, ep, depth + 1);
          if (ep !== epoch || won.value) return;
        }
      }
      if (!(await gate(ep))) return;
    }

    const rival =
      ws.currentSettings.penalty && mode.value === 'online' && p.pos > 1
        ? players.value.find((x) => x !== p && x.pos === p.pos && connected(x))
        : null;
    if (rival) {
      playComment(['penalty'], 'ضربة جزاء! مواجهة مباشرة!');
      const w = await runRace([p.i, rival.i], `⚽ ضربة جزاء: ${p.name} ضد ${rival.name}`, 12000);
      if (ep !== epoch) return;
      if (w >= 0) {
        const wp = players.value[w]!;
        wp.score += 15;
        wp.buzz = 'good';
        setMsg(`⚽ ${wp.name} فاز بالمواجهة!`, 'ok');
        crowdFx('cheer', 0.7);
        broadcastState();
        await within(playComment(['penwin'], `${wp.name} يسجل!`), 3000);
        if (wp.pos + 2 <= lastSquare.value) {
          await stepTo(wp, 2, ep);
          if (ep !== epoch || finishIf(wp)) return;
          /* Fix Req #1: Also trigger ladders/snakes/effects after penalty bonus steps */
          await resolveSquareEffects(wp, ep, depth + 1);
        }
      }
    }
  }

  function finish(p: PlayerRuntime): void {
    won.value = true;
    clearInterval(tid);
    phase.value = 'end';
    winnerName.value = p.name;
    playSfx('win');
    playWhistle();
    crowdFx('roar', 0.95);
    setMsg(`🏆 ${p.name} يفوز!`, 'ok');
    playComment(['win'], `هدف! ${p.name} يفوز بالمباراة!`);

    players.value.forEach((x) => {
      const pr = ws.findProfile(x.pid);
      if (pr) {
        pr.games++;
        pr.best = Math.max(pr.best, x.score);
        if (x === p) pr.wins++;
      }
    });
    ws.save();
    broadcastState();

    const sorted = [...players.value].sort(
      (a, b) => Number(b === p) - Number(a === p) || b.pos - a.pos || b.score - a.score,
    );
    rankings.value = sorted.map((x, idx) => ({
      rank: idx + 1,
      name: x.name,
      emoji: x.emoji,
      color: x.color,
      score: x.score,
      correct: x.correct,
      wrong: x.wrong,
      pos: x.pos,
    }));

    void logRemoteMatch({
      roomId: ws.currentRoom.id,
      roomName: ws.currentRoom.name,
      adminEmail: ws.session?.email || ws.activeAdmin,
      winnerName: p.name,
      boardSize: board.value.n,
      mode: mode.value,
      rankings: rankings.value,
    });

    showEndModal.value = true;
  }

  /* Admin Controls */
  function togglePause(): void {
    paused.value = !paused.value;
    if (paused.value) stopComment();
    broadcastState();
  }

  function newQuestion(): void {
    if (phase.value === 'q' && q.value && !q.value.reveal && !paused.value) ask();
  }

  function skipTurn(): void {
    if (
      won.value ||
      (phase.value !== 'ready' && phase.value !== 'roll' && phase.value !== 'q' && phase.value !== 'choose')
    ) {
      return;
    }
    clearInterval(tid);
    epoch++;
    paused.value = false;
    stopComment();
    cur.value = (cur.value + 1) % players.value.length;
    setTurn();
  }

  function switchToLocal(): void {
    mode.value = 'local';
    seats.value.forEach((s) => {
      try {
        s.conn?.send({ t: 'bye' });
      } catch {
        // Ignore
      }
    });
    try {
      peer?.destroy();
    } catch {
      // Ignore
    }
    peer = null;
    if (raceState.value) endRace(-1);
    broadcastState();
  }

  return {
    mode,
    seats,
    roomCode,
    lobbyQrSvg,
    netMsg,
    canFallbackLocal,
    players,
    board,
    boardPlayers,
    cur,
    currentPlayer,
    won,
    paused,
    phase,
    dice,
    animDice,
    msg,
    msgKind,
    q,
    raceState,
    left,
    total,
    lastSquare,
    winnerName,
    showEndModal,
    rankings,
    floatingFx,
    anyDisconnected,
    localControllerView,
    live,
    connected,
    openRoom,
    kickSeat,
    startLocalGame,
    startGame,
    toMenu,
    act,
    togglePause,
    newQuestion,
    skipTurn,
    switchToLocal,
    changeLiveArena,
    toggleClientAudio,
  };
});
