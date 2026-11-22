import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { ALLT, ARENAS, DEF_SETTINGS, EMO, ROOT_ADMIN, THEMES } from '@/constants/game';
import {
  deleteRemoteAdmin,
  deleteRemotePlayer,
  deleteRemoteRoom,
  fetchRemoteAdmins,
  loadRemoteWorkspace,
  syncRemoteWorkspace,
  upsertRemoteAdmin,
} from '@/services/cloud';
import type {
  AdminAccount,
  AdminWorkspace,
  AppView,
  PlayerProfile,
  Question,
  Room,
  RoomSettings,
  RuleKey,
  TopicId,
} from '@/types/game';
import { hashCreds, normalizeAdminEmail } from '@/utils/crypto';
import { canNet, genCode, pickOne, uid } from '@/utils/format';
import { useThemeStore } from '@/stores/theme';

const STORE_KEY = 'sullam-v3';
const LEGACY_KEY = 'sullam-v2';
const AUTH_KEY = 'sullam-auth-v1';

function ensureSetDefaults(setObj: Partial<RoomSettings> | undefined): RoomSettings {
  const base: RoomSettings = {
    ...DEF_SETTINGS,
    topics: [...DEF_SETTINGS.topics],
    tables: [...DEF_SETTINGS.tables],
    ...(setObj || {}),
  };
  if (!Array.isArray(base.topics)) base.topics = [...DEF_SETTINGS.topics];
  if (!Array.isArray(base.tables)) base.tables = [...DEF_SETTINGS.tables];
  if (!THEMES.some((t) => t[0] === base.theme)) base.theme = 'green';
  if (!ARENAS.some((a) => a[0] === base.arena)) base.arena = 'classic';
  if (!canNet()) base.mode = 'device';
  return base;
}

function makeDefaultRoom(name = 'الغرفة الرئيسية'): Room {
  return {
    id: 'rm_' + uid(),
    name,
    code: genCode(),
    set: ensureSetDefaults({}),
    profiles: [],
  };
}

export const useWorkspaceStore = defineStore('workspace', () => {
  const view = ref<AppView>('setup');
  const admins = ref<AdminAccount[]>([]);
  const workspaces = ref<Record<string, AdminWorkspace>>({});
  const activeAdmin = ref<string>(ROOT_ADMIN.email);
  const session = ref<AdminAccount | null>(null);

  const cloudState = ref<'loading' | 'ok' | 'off'>('loading');
  const cloudText = ref<string>('☁️ جارٍ الاتصال بالسحابة…');
  const reportPlayer = ref<PlayerProfile | null>(null);

  let syncTimer = 0;

  const allAdmins = computed<AdminAccount[]>(() => {
    const list: AdminAccount[] = [
      { email: ROOT_ADMIN.email, hash: ROOT_ADMIN.hash, root: true },
    ];
    admins.value.forEach((a) => {
      const em = normalizeAdminEmail(a.email);
      if (em && a.hash && em !== ROOT_ADMIN.email && !list.some((x) => x.email === em)) {
        list.push({ email: em, hash: a.hash, root: false });
      }
    });
    return list;
  });

  const isAuthed = computed(() => !!session.value);

  function getAdminWorkspace(email?: string): AdminWorkspace {
    const em = normalizeAdminEmail(email || activeAdmin.value || ROOT_ADMIN.email);
    if (!workspaces.value[em] || !Array.isArray(workspaces.value[em]!.rooms) || !workspaces.value[em]!.rooms.length) {
      const defRm = makeDefaultRoom('الغرفة الرئيسية');
      workspaces.value[em] = { rooms: [defRm], activeRoomId: defRm.id };
    }
    const ws = workspaces.value[em]!;
    if (!ws.rooms.some((r) => r.id === ws.activeRoomId)) {
      ws.activeRoomId = ws.rooms[0]!.id;
    }
    return ws;
  }

  const currentWorkspace = computed<AdminWorkspace>(() => getAdminWorkspace(activeAdmin.value));

  const currentRoom = computed<Room>(() => {
    const ws = currentWorkspace.value;
    let rm = ws.rooms.find((r) => r.id === ws.activeRoomId) || ws.rooms[0];
    if (!rm) {
      rm = makeDefaultRoom('الغرفة الرئيسية');
      ws.rooms = [rm];
      ws.activeRoomId = rm.id;
    }
    if (!rm.code || !/^\d{6}$/.test(rm.code)) rm.code = genCode();
    return rm;
  });

  const currentSettings = computed<RoomSettings>(() => currentRoom.value.set);

  function saveLocal(): void {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({
          admins: admins.value,
          workspaces: workspaces.value,
          activeAdmin: activeAdmin.value,
        }),
      );
    } catch {
      // Ignore
    }
  }

  function scheduleCloudSync(): void {
    clearTimeout(syncTimer);
    syncTimer = window.setTimeout(async () => {
      if (!session.value || !canNet()) return;
      try {
        const ws = getAdminWorkspace(session.value.email);
        await syncRemoteWorkspace(session.value.email, ws.rooms);
        cloudState.value = 'ok';
        cloudText.value = '☁️ تم الحفظ تلقائيًا';
      } catch {
        // Ignore silently
      }
    }, 900);
  }

  function save(): void {
    saveLocal();
    scheduleCloudSync();
  }

  function resolveSession(): AdminAccount | null {
    try {
      const raw = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
      if (!raw || !raw.email || !raw.hash) return null;
      const em = normalizeAdminEmail(raw.email);
      return allAdmins.value.find((a) => a.email === em && a.hash === raw.hash) || null;
    } catch {
      return null;
    }
  }

  function setAdminRooms(email: string, rooms: Room[]): void {
    const em = normalizeAdminEmail(email);
    const ws = getAdminWorkspace(em);
    if (rooms.length) {
      rooms.forEach((r) => {
        r.set = ensureSetDefaults(r.set);
        if (!r.code || !/^\d{6}$/.test(r.code)) r.code = genCode();
      });
      ws.rooms = rooms;
      if (!ws.rooms.some((r) => r.id === ws.activeRoomId)) {
        ws.activeRoomId = ws.rooms[0]!.id;
      }
    }
    saveLocal();
  }

  async function init(): Promise<void> {
    const themeStore = useThemeStore();
    try {
      const r = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (r && r.workspaces) {
        admins.value = Array.isArray(r.admins) ? r.admins : [];
        Object.keys(r.workspaces).forEach((em) => {
          const w = r.workspaces[em];
          if (w && Array.isArray(w.rooms)) {
            w.rooms.forEach((rm: Room) => {
              rm.set = ensureSetDefaults(rm.set);
              rm.profiles = Array.isArray(rm.profiles) ? rm.profiles : [];
            });
          }
        });
        workspaces.value = r.workspaces;
        activeAdmin.value = r.activeAdmin || ROOT_ADMIN.email;
      } else {
        const old = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
        if (old) {
          admins.value = Array.isArray(old.admins) ? old.admins : [];
          const rm = makeDefaultRoom('الغرفة الرئيسية');
          rm.set = ensureSetDefaults(old.set);
          rm.profiles = Array.isArray(old.profiles) ? old.profiles : [];
          workspaces.value = { [ROOT_ADMIN.email]: { rooms: [rm], activeRoomId: rm.id } };
          saveLocal();
        }
      }
    } catch {
      // Ignore
    }

    getAdminWorkspace(activeAdmin.value);
    session.value = resolveSession();
    if (session.value) {
      activeAdmin.value = session.value.email;
    }
    themeStore.applyHostDefault(currentRoom.value.set.theme);

    if (canNet()) {
      try {
        const remoteAdmins = await fetchRemoteAdmins();
        if (remoteAdmins) {
          admins.value = remoteAdmins;
          cloudState.value = 'ok';
          cloudText.value = '☁️ الحفظ السحابي التلقائي مفعّل';
          saveLocal();
        }
        session.value = resolveSession();
        if (session.value) {
          activeAdmin.value = session.value.email;
          const remoteRooms = await loadRemoteWorkspace(session.value.email);
          if (remoteRooms && remoteRooms.length) {
            setAdminRooms(session.value.email, remoteRooms);
            themeStore.applyHostDefault(currentRoom.value.set.theme);
          } else if (remoteRooms && remoteRooms.length === 0) {
            await syncRemoteWorkspace(session.value.email, currentWorkspace.value.rooms);
          }
        }
      } catch {
        cloudState.value = 'off';
        cloudText.value = '💾 محفوظ تلقائيًا على هذا الجهاز';
      }
    } else {
      cloudState.value = 'off';
      cloudText.value = '💾 محفوظ تلقائيًا على هذا الجهاز';
    }
  }

  async function login(email: string, password: string): Promise<{ ok: boolean; msg?: string }> {
    const em = normalizeAdminEmail(email);
    if (!em || !password) return { ok: false, msg: 'أدخل البريد الإلكتروني وكلمة المرور.' };
    if (canNet()) {
      try {
        const remoteAdmins = await fetchRemoteAdmins();
        if (remoteAdmins) {
          admins.value = remoteAdmins;
          cloudState.value = 'ok';
          cloudText.value = '☁️ الحفظ السحابي التلقائي مفعّل';
        }
      } catch {
        // Offline fallback
      }
    }
    const h = await hashCreds(em, password);
    let found = allAdmins.value.find((a) => a.email === em && a.hash === h);
    if (!found && password.trim() !== password) {
      const hTrim = await hashCreds(em, password.trim());
      found = allAdmins.value.find((a) => a.email === em && a.hash === hTrim);
    }
    if (!found) return { ok: false, msg: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };

    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify({ email: found.email, hash: found.hash }));
    } catch {
      // Ignore
    }
    session.value = found;
    activeAdmin.value = found.email;
    getAdminWorkspace(found.email);

    if (canNet()) {
      try {
        const remoteRooms = await loadRemoteWorkspace(found.email);
        if (remoteRooms && remoteRooms.length) {
          setAdminRooms(found.email, remoteRooms);
        } else if (remoteRooms && remoteRooms.length === 0) {
          await syncRemoteWorkspace(found.email, currentWorkspace.value.rooms);
        }
        cloudState.value = 'ok';
        cloudText.value = '☁️ الحفظ السحابي التلقائي مفعّل';
      } catch {
        cloudState.value = 'off';
        cloudText.value = '💾 محفوظ تلقائيًا على هذا الجهاز';
      }
    }
    useThemeStore().applyHostDefault(currentRoom.value.set.theme);
    saveLocal();
    return { ok: true };
  }

  function logout(): void {
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {
      // Ignore
    }
    session.value = null;
  }

  async function addAdmin(email: string, password: string): Promise<{ ok: boolean; msg: string }> {
    if (!session.value) return { ok: false, msg: 'يجب تسجيل الدخول أولًا.' };
    const em = normalizeAdminEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return { ok: false, msg: 'أدخل بريدًا إلكترونيًا صحيحًا.' };
    if (!password || password.length < 4) return { ok: false, msg: 'أدخل كلمة مرور (٤ أحرف على الأقل).' };

    if (canNet()) {
      try {
        const remote = await fetchRemoteAdmins();
        if (remote) admins.value = remote;
      } catch {
        // Ignore
      }
    }
    if (allAdmins.value.some((a) => a.email === em)) {
      return { ok: false, msg: 'هذا البريد مسجّل بالفعل ضمن المشرفين.' };
    }
    const h = await hashCreds(em, password);
    admins.value.push({ email: em, hash: h, root: false });
    saveLocal();

    let note = ' (تم الحفظ تلقائيًا)';
    try {
      await upsertRemoteAdmin(em, h, session.value.email);
      const refreshed = await fetchRemoteAdmins();
      if (refreshed) admins.value = refreshed;
    } catch {
      note = ' (تم الحفظ على هذا الجهاز)';
    }
    return { ok: true, msg: `تمت إضافة المشرف ${em} بنجاح${note}.` };
  }

  async function removeAdmin(email: string): Promise<void> {
    if (!isAuthed.value) return;
    const em = normalizeAdminEmail(email);
    if (em === ROOT_ADMIN.email) return;
    admins.value = admins.value.filter((a) => normalizeAdminEmail(a.email) !== em);
    saveLocal();
    try {
      await deleteRemoteAdmin(em);
    } catch {
      // Ignore
    }
    session.value = resolveSession();
  }

  /* Room Management */
  function createRoom(name: string): Room | null {
    const nm = name.trim().slice(0, 28);
    if (!nm) return null;
    const ws = currentWorkspace.value;
    const rm = makeDefaultRoom(nm);
    ws.rooms.push(rm);
    ws.activeRoomId = rm.id;
    save();
    return rm;
  }

  function selectRoom(roomId: string): void {
    const ws = currentWorkspace.value;
    const rm = ws.rooms.find((r) => r.id === roomId);
    if (!rm) return;
    ws.activeRoomId = rm.id;
    useThemeStore().applyHostDefault(rm.set.theme);
    saveLocal();
  }

  function renewRoomCode(): string {
    const rm = currentRoom.value;
    rm.code = genCode();
    save();
    return rm.code;
  }

  function deleteCurrentRoom(): { ok: boolean; msg?: string } {
    const ws = currentWorkspace.value;
    if (ws.rooms.length <= 1) return { ok: false, msg: 'يجب الإبقاء على غرفة واحدة على الأقل.' };
    const delId = currentRoom.value.id;
    ws.rooms = ws.rooms.filter((r) => r.id !== delId);
    ws.activeRoomId = ws.rooms[0]!.id;
    saveLocal();
    deleteRemoteRoom(delId);
    scheduleCloudSync();
    return { ok: true };
  }

  /* Settings Helpers */
  function syncSettingsToAllPlayers(): void {
    const s = currentRoom.value.set;
    currentRoom.value.profiles.forEach((p) => {
      p.level = s.level;
      p.topics = [...s.topics];
      p.tables = [...s.tables];
    });
  }

  function toggleRule(rule: RuleKey): void {
    const s = currentRoom.value.set;
    s[rule] = !(s[rule] !== false);
    save();
  }

  function toggleTopic(topic: TopicId): void {
    const arr = currentRoom.value.set.topics;
    const i = arr.indexOf(topic);
    if (i < 0) arr.push(topic);
    else arr.splice(i, 1);
    syncSettingsToAllPlayers();
    save();
  }

  function toggleTable(tbl: number): void {
    const arr = currentRoom.value.set.tables;
    const i = arr.indexOf(tbl);
    if (i < 0) arr.push(tbl);
    else arr.splice(i, 1);
    syncSettingsToAllPlayers();
    save();
  }

  function setLevel(lvl: number): void {
    currentRoom.value.set.level = lvl;
    syncSettingsToAllPlayers();
    save();
  }

  /* Player Profiles */
  function addProfile(name: string, emoji?: string): PlayerProfile {
    const rm = currentRoom.value;
    const s = rm.set;
    const availEmojis = EMO.filter((e) => !rm.profiles.some((x) => x.emoji === e));
    const p: PlayerProfile = {
      id: 'pl_' + uid(),
      name: name.trim().slice(0, 14),
      emoji: emoji || (availEmojis.length ? pickOne(availEmojis) : pickOne(EMO)),
      on: true,
      level: s.level,
      topics: [...s.topics],
      tables: [...s.tables],
      games: 0,
      wins: 0,
      best: 0,
      st: { t: {}, tb: {}, miss: {} },
    };
    rm.profiles.push(p);
    save();
    return p;
  }

  function findProfile(id: string): PlayerProfile | undefined {
    return currentRoom.value.profiles.find((p) => p.id === id);
  }

  function deleteProfile(id: string): void {
    currentRoom.value.profiles = currentRoom.value.profiles.filter((x) => x.id !== id);
    deleteRemotePlayer(id);
    save();
  }

  function cyclePlayerEmoji(p: PlayerProfile): void {
    const idx = EMO.indexOf(p.emoji as (typeof EMO)[number]);
    p.emoji = EMO[(idx + 1) % EMO.length]!;
    save();
  }

  function togglePlayerTopic(p: PlayerProfile, topic: TopicId): void {
    const i = p.topics.indexOf(topic);
    if (i < 0) p.topics.push(topic);
    else p.topics.splice(i, 1);
    save();
  }

  function togglePlayerTable(p: PlayerProfile, tbl: number): void {
    const i = p.tables.indexOf(tbl);
    if (i < 0) p.tables.push(tbl);
    else p.tables.splice(i, 1);
    save();
  }

  function cfgOf(pid: string, adj: number): { level: number; topics: TopicId[]; tables: number[] } {
    const s = currentRoom.value.set;
    const pr = findProfile(pid);
    const own = (s.fair === 'each' || s.fair === 'both') && !!pr;
    const base = own && pr ? pr.level : s.level;
    const delta = s.fair === 'adaptive' || s.fair === 'both' ? adj : 0;
    const tp = own && pr && pr.topics.length ? pr.topics : s.topics.length ? s.topics : (['mul'] as TopicId[]);
    const tb = own && pr && pr.tables.length ? pr.tables : s.tables.length ? s.tables : [...ALLT];
    return { level: Math.max(0, Math.min(2, base + delta)), topics: tp, tables: tb };
  }

  function recordAnswer(pid: string, q: Question, ok: boolean): void {
    const pr = findProfile(pid);
    if (!pr) return;
    const st = pr.st;
    const inc = (o: Record<string, [number, number]>, k: string | number) => {
      const key = String(k);
      o[key] = o[key] || [0, 0];
      o[key]![ok ? 0 : 1]++;
    };
    inc(st.t, q.topic);
    if (q.tbl) inc(st.tb, q.tbl);
    if (!ok) {
      st.miss[q.show] = (st.miss[q.show] || 0) + 1;
      const ks = Object.keys(st.miss);
      if (ks.length > 60) delete st.miss[ks[0]!];
    }
    save();
  }

  function exportBackup(): void {
    const payload = {
      admins: admins.value,
      workspaces: workspaces.value,
      activeAdmin: activeAdmin.value,
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    a.download = 'champions-backup.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function importBackup(file: File): Promise<{ ok: boolean; msg: string }> {
    try {
      const r = JSON.parse(await file.text());
      if (r.workspaces) {
        workspaces.value = r.workspaces;
        admins.value = Array.isArray(r.admins) ? r.admins : admins.value;
      } else if (Array.isArray(r.profiles)) {
        const rm = currentRoom.value;
        rm.profiles = r.profiles;
        rm.set = ensureSetDefaults(r.set);
        if (Array.isArray(r.admins)) admins.value = r.admins;
      } else {
        throw new Error('invalid');
      }
      save();
      return { ok: true, msg: 'تمت الاستعادة بنجاح.' };
    } catch {
      return { ok: false, msg: 'ملف النسخة الاحتياطية غير صالح.' };
    }
  }

  function setView(next: AppView): void {
    view.value = next;
    window.scrollTo(0, 0);
  }

  return {
    view,
    admins,
    allAdmins,
    workspaces,
    activeAdmin,
    session,
    isAuthed,
    cloudState,
    cloudText,
    currentWorkspace,
    currentRoom,
    currentSettings,
    reportPlayer,
    init,
    save,
    login,
    logout,
    addAdmin,
    removeAdmin,
    createRoom,
    selectRoom,
    renewRoomCode,
    deleteCurrentRoom,
    toggleRule,
    toggleTopic,
    toggleTable,
    setLevel,
    syncSettingsToAllPlayers,
    addProfile,
    findProfile,
    deleteProfile,
    cyclePlayerEmoji,
    togglePlayerTopic,
    togglePlayerTable,
    cfgOf,
    recordAnswer,
    exportBackup,
    importBackup,
    setView,
  };
});
