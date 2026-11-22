import { ALLT, DEF_SETTINGS, ROOT_ADMIN } from '@/constants/game';
import type { AdminAccount, MatchRankingItem, Room, TopicId } from '@/types/game';
import { normalizeAdminEmail } from '@/utils/crypto';
import { canNet } from '@/utils/format';

const CLOUD_URL = import.meta.env.VITE_CLOUD_URL || 'https://dajienajgfeurozefawq.supabase.co';
const CLOUD_KEY = import.meta.env.VITE_CLOUD_KEY || 'sb_publishable_VlDVBW8KRA88d1YaHGehwQ_JE4wFBQU';

async function cloudFetch<T = unknown>(path: string, opts: RequestInit = {}): Promise<T | null> {
  if (!canNet()) throw new Error('offline-protocol');
  const headers: Record<string, string> = {
    apikey: CLOUD_KEY,
    Authorization: `Bearer ${CLOUD_KEY}`,
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${CLOUD_URL}/rest/v1/${path}`, { ...opts, headers });
  if (!res.ok) {
    const errTxt = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status}: ${errTxt}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const txt = await res.text();
    return txt ? (JSON.parse(txt) as T) : null;
  }
  return null;
}

export async function fetchRemoteAdmins(): Promise<AdminAccount[] | null> {
  const rows = await cloudFetch<Array<{ email: string; password_hash: string; is_root: boolean }>>(
    'sullam_admins?select=email,password_hash,is_root,created_at&order=created_at.asc',
  );
  if (!Array.isArray(rows)) return null;
  const list: AdminAccount[] = [];
  rows.forEach((r) => {
    const em = normalizeAdminEmail(r.email);
    if (em && r.password_hash && em !== ROOT_ADMIN.email) {
      list.push({ email: em, hash: r.password_hash, root: !!r.is_root });
    }
  });
  return list;
}

export async function ensureRemoteRootAdmin(): Promise<void> {
  try {
    await cloudFetch('sullam_admins?on_conflict=email', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([
        {
          email: ROOT_ADMIN.email,
          password_hash: ROOT_ADMIN.hash,
          is_root: true,
          created_by: 'system',
        },
      ]),
    });
  } catch {
    // Ignore silently
  }
}

export async function upsertRemoteAdmin(email: string, hash: string, createdBy: string): Promise<void> {
  const em = normalizeAdminEmail(email);
  await cloudFetch('sullam_admins?on_conflict=email', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify([
      {
        email: em,
        password_hash: hash,
        is_root: em === ROOT_ADMIN.email,
        created_by: createdBy || ROOT_ADMIN.email,
      },
    ]),
  });
}

export async function deleteRemoteAdmin(email: string): Promise<void> {
  const em = normalizeAdminEmail(email);
  await cloudFetch(`sullam_admins?email=eq.${encodeURIComponent(em)}`, { method: 'DELETE' });
}

interface RemoteRoomRow {
  id: string;
  name: string;
  join_code: string | null;
  settings: Record<string, unknown> | null;
}

interface RemotePlayerRow {
  id: string;
  room_id: string;
  name: string;
  emoji: string | null;
  is_active: boolean | null;
  level: number | null;
  topics: TopicId[] | null;
  tables: number[] | null;
  games: number | null;
  wins: number | null;
  best: number | null;
  stats: { t?: Record<string, [number, number]>; tb?: Record<string, [number, number]>; miss?: Record<string, number> } | null;
}

export async function loadRemoteWorkspace(adminEmail: string): Promise<Room[] | null> {
  const em = normalizeAdminEmail(adminEmail);
  if (!em) return null;
  await ensureRemoteRootAdmin();
  const [rooms, players] = await Promise.all([
    cloudFetch<RemoteRoomRow[]>(`sullam_rooms?admin_email=eq.${encodeURIComponent(em)}&order=created_at.asc`),
    cloudFetch<RemotePlayerRow[]>(`sullam_players?admin_email=eq.${encodeURIComponent(em)}&order=created_at.asc`),
  ]);
  if (!Array.isArray(rooms)) return null;
  return rooms.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.join_code || '',
    set: { ...DEF_SETTINGS, ...(r.settings || {}) },
    profiles: (players || [])
      .filter((p) => p.room_id === r.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        emoji: p.emoji || '🦁',
        on: p.is_active !== false,
        level: typeof p.level === 'number' ? p.level : 1,
        topics: Array.isArray(p.topics) && p.topics.length ? p.topics : ['mul'],
        tables: Array.isArray(p.tables) && p.tables.length ? p.tables : [...ALLT],
        games: p.games || 0,
        wins: p.wins || 0,
        best: p.best || 0,
        st: p.stats && p.stats.t ? { t: p.stats.t, tb: p.stats.tb || {}, miss: p.stats.miss || {} } : { t: {}, tb: {}, miss: {} },
      })),
  }));
}

export async function syncRemoteWorkspace(adminEmail: string, rooms: Room[]): Promise<void> {
  const em = normalizeAdminEmail(adminEmail);
  if (!em || !canNet() || !rooms.length) return;

  const roomRows = rooms.map((r) => ({
    id: r.id,
    admin_email: em,
    name: r.name,
    join_code: r.code || null,
    settings: r.set || { ...DEF_SETTINGS },
    updated_at: new Date().toISOString(),
  }));

  await cloudFetch('sullam_rooms?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(roomRows),
  });

  const playerRows: Record<string, unknown>[] = [];
  rooms.forEach((r) => {
    (r.profiles || []).forEach((p) => {
      playerRows.push({
        id: p.id,
        room_id: r.id,
        admin_email: em,
        name: p.name,
        emoji: p.emoji || '🦁',
        is_active: p.on !== false,
        level: typeof p.level === 'number' ? p.level : 1,
        topics: Array.isArray(p.topics) ? p.topics : ['mul'],
        tables: Array.isArray(p.tables) ? p.tables : [...ALLT],
        games: p.games || 0,
        wins: p.wins || 0,
        best: p.best || 0,
        stats: p.st || { t: {}, tb: {}, miss: {} },
        updated_at: new Date().toISOString(),
      });
    });
  });

  if (playerRows.length) {
    await cloudFetch('sullam_players?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(playerRows),
    });
  }
}

export async function deleteRemoteRoom(roomId: string): Promise<void> {
  if (!roomId || !canNet()) return;
  try {
    await cloudFetch(`sullam_rooms?id=eq.${encodeURIComponent(roomId)}`, { method: 'DELETE' });
  } catch {
    // Ignore
  }
}

export async function deleteRemotePlayer(playerId: string): Promise<void> {
  if (!playerId || !canNet()) return;
  try {
    await cloudFetch(`sullam_players?id=eq.${encodeURIComponent(playerId)}`, { method: 'DELETE' });
  } catch {
    // Ignore
  }
}

export async function logRemoteMatch(params: {
  roomId: string | null;
  roomName: string;
  adminEmail: string;
  winnerName: string;
  boardSize: number;
  mode: string;
  rankings: MatchRankingItem[];
}): Promise<void> {
  if (!canNet()) return;
  try {
    await cloudFetch('sullam_matches', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([
        {
          room_id: params.roomId,
          room_name: params.roomName,
          admin_email: normalizeAdminEmail(params.adminEmail),
          winner_name: params.winnerName,
          board_size: params.boardSize,
          mode: params.mode,
          rankings: params.rankings,
          played_at: new Date().toISOString(),
        },
      ]),
    });
  } catch {
    // Ignore
  }
}
