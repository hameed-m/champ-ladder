import { defineStore } from 'pinia';
import { ref } from 'vue';
import Peer, { type DataConnection } from 'peerjs';
import {
  comment,
  ensureAC,
  loadVoicesManifest,
  SFX,
  stopComment,
  whistle,
} from '@/services/audio';
import type { ClientActionMessage, ClientAudioPacket, ClientViewMessage, FloatingFx } from '@/types/game';
import { rnd, uid } from '@/utils/format';
import { getPeerOpts, keepAwake } from '@/stores/game';
import { useThemeStore } from '@/stores/theme';
import { useWorkspaceStore } from '@/stores/workspace';

export interface PickOption {
  id: string;
  name: string;
  emoji: string;
}

function getClientToken(): string {
  const k = 'sullam-token';
  let t: string | null = null;
  try {
    t = localStorage.getItem(k);
  } catch {
    // Ignore
  }
  if (!t) {
    t = uid() + uid();
    try {
      localStorage.setItem(k, t);
    } catch {
      // Ignore
    }
  }
  return t;
}

function buzz(k: 'turn' | 'good' | 'bad' | null): void {
  if (!k) return;
  try {
    const map: Record<'turn' | 'good' | 'bad', number | number[]> = {
      turn: [120, 60, 120],
      good: 60,
      bad: [200],
    };
    navigator.vibrate?.(map[k]);
  } catch {
    // Ignore
  }
}

export const useClientStore = defineStore('client', () => {
  const ws = useWorkspaceStore();
  const theme = useThemeStore();

  const statusText = ref('');
  const connectTitle = ref('جارٍ الاتصال…');
  const connectMsg = ref('');
  const connectCanBack = ref(false);

  const pickList = ref<PickOption[]>([]);
  const waitName = ref('');
  const viewData = ref<ClientViewMessage | null>(null);
  const floatingFx = ref<FloatingFx[]>([]);

  const arenaHidden = ref(false);
  const localMuted = ref(false);
  let arenaManualForQ: string | number | null = null;

  let peer: Peer | null = null;
  let conn: DataConnection | null = null;
  let retry = 0;
  let lastSeen = 0;
  let heartbeatTimer = 0;
  let activeCode = '';
  let seated = false;
  let fxSeq = 0;

  function unlockClientAudio(): void {
    try {
      ensureAC();
      void loadVoicesManifest();
    } catch {
      // Ignore
    }
  }

  function toggleLocalMuted(): void {
    localMuted.value = !localMuted.value;
    if (localMuted.value) {
      stopComment();
    } else {
      unlockClientAudio();
    }
  }

  function setConnectMsg(title: string, message: string, canBack = false): void {
    ws.setView('connect');
    connectTitle.value = title;
    connectMsg.value = message;
    connectCanBack.value = canBack;
  }

  function spawnFx(emoji: string, color: string): void {
    const id = ++fxSeq;
    floatingFx.value.push({ id, emoji, color, leftPct: rnd(8, 86) });
    window.setTimeout(() => {
      floatingFx.value = floatingFx.value.filter((x) => x.id !== id);
    }, 2400);
  }

  function toggleArena(): void {
    arenaHidden.value = !arenaHidden.value;
    if (viewData.value) {
      arenaManualForQ = viewData.value.qid || viewData.value.phase || 'manual';
    }
  }

  function scheduleRetry(): void {
    retry++;
    window.setTimeout(() => {
      if (activeCode && !(conn && conn.open)) {
        connectToHost();
      }
    }, Math.min(5000, 800 * retry));
  }

  function connectToHost(): void {
    if (!peer || peer.destroyed) {
      startClient(activeCode);
      return;
    }
    if (peer.disconnected) {
      try {
        peer.reconnect();
      } catch {
        // Ignore
      }
    }
    const c = peer.connect('sullam-' + activeCode, { reliable: true });
    conn = c;
    const to = window.setTimeout(() => {
      if (!c.open && c === conn) {
        try {
          c.close();
        } catch {
          // Ignore
        }
        scheduleRetry();
      }
    }, 8000);

    c.on('open', () => {
      clearTimeout(to);
      retry = 0;
      lastSeen = Date.now();
      statusText.value = '';
      c.send({ t: 'hello', token: getClientToken() });
    });

    c.on('data', (raw: unknown) => handleData(raw as Record<string, unknown>));

    c.on('close', () => {
      if (c === conn) {
        conn = null;
        statusText.value = 'انقطع الاتصال، جارٍ إعادة المحاولة…';
        scheduleRetry();
      }
    });

    c.on('error', () => {
      // Handled by close/timeout
    });
  }

  function startClient(code: string): void {
    activeCode = code;
    seated = false;
    viewData.value = null;
    waitName.value = '';
    keepAwake();
    void loadVoicesManifest();
    setConnectMsg('جارٍ الاتصال…', 'نبحث عن المباراة ' + code, false);

    try {
      peer?.destroy();
    } catch {
      // Ignore
    }

    peer = new Peer(getPeerOpts());
    peer.on('open', () => connectToHost());
    peer.on('error', (e: { type?: string }) => {
      if (e.type === 'peer-unavailable') {
        if (!seated && retry > 2) {
          setConnectMsg('لم أجد المباراة', 'تأكد من الرمز وأن الجهاز الأساسي ما زال في غرفة الانتظار.', true);
          return;
        }
        scheduleRetry();
        return;
      }
      if (!seated && retry > 3) {
        setConnectMsg('تعذر الاتصال', 'تحقق من الإنترنت ثم أعد المحاولة.', true);
        return;
      }
      scheduleRetry();
    });

    peer.on('disconnected', () => {
      try {
        if (peer && !peer.destroyed) peer.reconnect();
      } catch {
        // Ignore
      }
    });

    clearInterval(heartbeatTimer);
    heartbeatTimer = window.setInterval(() => {
      if (conn && conn.open && Date.now() - lastSeen > 12000) {
        statusText.value = 'انقطع الاتصال، جارٍ إعادة المحاولة…';
        try {
          conn.close();
        } catch {
          // Ignore
        }
        conn = null;
        connectToHost();
      }
      if (conn && conn.open) {
        try {
          conn.send({ t: 'pong' });
        } catch {
          // Ignore
        }
      }
    }, 4000);
  }

  function handleAudioPacket(pkt: ClientAudioPacket): void {
    if (localMuted.value || viewData.value?.clientAudio === false) return;
    if (pkt.kind === 'sfx' && pkt.sfx && SFX[pkt.sfx]) {
      SFX[pkt.sfx]();
    } else if (pkt.kind === 'whistle') {
      whistle();
    } else if (pkt.kind === 'comment' && Array.isArray(pkt.parts)) {
      void comment(pkt.parts, null);
    }
  }

  function handleData(m: Record<string, unknown>): void {
    lastSeen = Date.now();
    if (m.t === 'ping') return;
    if (m.t === 'audio') {
      handleAudioPacket(m as unknown as ClientAudioPacket);
      return;
    }
    if (m.t === 'fx') {
      spawnFx(String(m.e || '👏'), String(m.color || '#2f7fd6'));
      return;
    }
    if (m.t === 'pickme') {
      pickList.value = Array.isArray(m.list) ? (m.list as PickOption[]) : [];
      ws.setView('pick');
      return;
    }
    if (m.t === 'wait') {
      seated = true;
      statusText.value = '';
      waitName.value = String(m.name || 'لاعب');
      viewData.value = null;
      ws.setView('client');
      return;
    }
    if (m.t === 'full') {
      setConnectMsg('المباراة مكتملة', 'بدأت المباراة أو اكتمل عدد اللاعبين (٦ لاعبين كحد أقصى).', true);
      return;
    }
    if (m.t === 'kicked') {
      try {
        localStorage.removeItem('sullam-token');
      } catch {
        // Ignore
      }
      seated = false;
      conn = null;
      activeCode = '';
      stopComment();
      setConnectMsg('خرجت من الغرفة', 'أخرجك المشرف من هذه المباراة.', true);
      return;
    }
    if (m.t === 'bye') {
      conn = null;
      activeCode = '';
      clearInterval(heartbeatTimer);
      stopComment();
      setConnectMsg('انتهت الجلسة', 'أغلق الجهاز الأساسي الغرفة.', true);
      return;
    }
    if (m.t === 'view') {
      const v = m as unknown as ClientViewMessage;
      seated = true;
      statusText.value = '';
      waitName.value = '';
      viewData.value = v;
      ws.setView('client');
      if (v.clientAudio === false) stopComment();
      if (v.themeConfig || v.theme) theme.setRoomDefault(v.themeConfig, v.theme);
      if (v.buzz) buzz(v.buzz);

      const isMobile = window.innerWidth < 820;
      const activeQKey = v.qid || (v.turn && v.phase === 'choose' ? 'choose' : null);
      if (isMobile && activeQKey && !v.reveal) {
        if (arenaManualForQ !== activeQKey) {
          arenaHidden.value = true;
        }
      } else if (!activeQKey) {
        arenaManualForQ = null;
      }
    }
  }

  function pickExistingPlayer(pid: string): void {
    unlockClientAudio();
    try {
      conn?.send({ t: 'pick', pid, token: getClientToken() });
    } catch {
      // Ignore
    }
  }

  function pickCustomName(name: string): void {
    const clean = name.trim();
    if (!clean) return;
    unlockClientAudio();
    try {
      conn?.send({ t: 'pick', name: clean, token: getClientToken() });
    } catch {
      // Ignore
    }
  }

  function sendAction(action: ClientActionMessage): void {
    keepAwake();
    unlockClientAudio();
    try {
      conn?.send(action);
    } catch {
      // Ignore
    }
  }

  function disconnectAndReset(): void {
    clearInterval(heartbeatTimer);
    activeCode = '';
    stopComment();
    try {
      peer?.destroy();
    } catch {
      // Ignore
    }
    peer = null;
    conn = null;
    viewData.value = null;
    const url = new URL(location.href);
    url.searchParams.delete('j');
    history.replaceState({}, '', url.pathname + url.search);
    ws.setView('setup');
  }

  return {
    statusText,
    connectTitle,
    connectMsg,
    connectCanBack,
    pickList,
    waitName,
    viewData,
    floatingFx,
    arenaHidden,
    localMuted,
    startClient,
    toggleArena,
    toggleLocalMuted,
    pickExistingPlayer,
    pickCustomName,
    sendAction,
    disconnectAndReset,
  };
});
