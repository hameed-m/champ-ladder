import type { ArenaId, BoardData, RoomSettings } from '@/types/game';
import { rnd, shuffle } from '@/utils/format';

export interface CellCoord {
  x: number;
  y: number;
  r: number;
  c: number;
}

export function cellFor(k: number, n: number): CellCoord {
  const i = k - 1;
  const r = Math.floor(i / n);
  const c = r % 2 ? n - 1 - (i % n) : i % n;
  return { x: c * 100 + 50, y: (n - 1 - r) * 100 + 50, r, c };
}

function segDist(p: CellCoord, a: CellCoord, b: CellCoord): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
}

const crossSeg = (a: CellCoord, b: CellCoord, c: CellCoord, d: CellCoord): boolean => {
  const o = (p: CellCoord, q: CellCoord, r: CellCoord) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
};

export function generateBoardData(settings: RoomSettings, isOnline: boolean): BoardData {
  const n = settings.size;
  const last = n * n;
  const wantLad = settings.ladders !== false ? Math.round(n * 0.7) : 0;
  const wantSnk = settings.snakes !== false ? Math.round(n * 0.7) : 0;
  const maxRows = n >= 8 ? 3 : 2;
  let best: { c: number; lad: Record<number, number>; snk: Record<number, number> } | null = null;

  if (wantLad > 0 || wantSnk > 0) {
    for (let tries = 0; tries < 300; tries++) {
      const lad: Record<number, number> = {};
      const snk: Record<number, number> = {};
      const used = new Set<number>([1, last]);
      const segs: Array<[CellCoord, CellCoord]> = [];

      const clear = (a: number, b: number) => {
        const A = cellFor(a, n);
        const B = cellFor(b, n);
        return segs.every(
          (sg) =>
            !crossSeg(A, B, sg[0], sg[1]) &&
            segDist(A, sg[0], sg[1]) > 40 &&
            segDist(B, sg[0], sg[1]) > 40 &&
            segDist(sg[0], A, B) > 40 &&
            segDist(sg[1], A, B) > 40,
        );
      };

      const add = (low: number, high: number, map: Record<number, number>, from: number, to: number) => {
        if (used.has(low) || used.has(high)) return false;
        const L = cellFor(low, n);
        const H = cellFor(high, n);
        const dr = H.r - L.r;
        if (dr < 1 || dr > maxRows || Math.abs(H.c - L.c) > dr + 1 || !clear(low, high)) return false;
        map[from] = to;
        used.add(low);
        used.add(high);
        segs.push([L, H]);
        return true;
      };

      let nl = 0;
      let ns = 0;
      for (let i = 0; i < 2500 && (nl < wantLad || ns < wantSnk); i++) {
        const low = rnd(2, last - n);
        const high = low + rnd(n - 2, n * maxRows + 2);
        if (i % 2) {
          if (nl < wantLad && high < last && add(low, high, lad, low, high)) nl++;
        } else if (ns < wantSnk && high < last - 1 && add(low, high, snk, high, low)) {
          ns++;
        }
      }

      const heads = Object.keys(snk)
        .map(Number)
        .sort((a, b) => a - b);
      const run = heads.some((h, i) => i > 1 && heads[i - 2] === h - 2 && heads[i - 1] === h - 1);
      if (run || heads.filter((h) => h > last - 7).length > 2) continue;
      if (!best || nl + ns > best.c) best = { c: nl + ns, lad, snk };
      if (nl === wantLad && ns === wantSnk) break;
    }
  }

  const lad = best ? best.lad : {};
  const snk = best ? best.snk : {};
  const taken = new Set<number>([
    1,
    last,
    ...Object.entries(lad).flat().map(Number),
    ...Object.entries(snk).flat().map(Number),
  ]);
  const free = shuffle(Array.from({ length: last }, (_, i) => i + 1).filter((k) => !taken.has(k) && k > 3 && k < last - 1));
  const c = Math.max(2, Math.round(n * 0.5));
  const allq = isOnline && settings.allq ? free.splice(0, c) : [];
  const surp = settings.cards ? free.splice(0, c) : [];

  return {
    n,
    arena: (settings.arena || 'classic') as ArenaId,
    lad,
    snk,
    allq,
    surp,
  };
}
