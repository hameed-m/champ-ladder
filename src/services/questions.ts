import { LEVELS } from '@/constants/game';
import type { Question, TopicId } from '@/types/game';
import { ar, pickOne, rnd, shuffle } from '@/utils/format';

let qSeq = 0;

interface QGenCfg {
  level: number;
  topics: TopicId[];
  tables: number[];
}

type RawQ = Omit<Question, 'id' | 'topic' | 'level' | 'show' | 'timeSec'> & { show?: string };

function numOpts(ans: number, deltas: number[], min: number, fmt?: (v: number) => string): string[] {
  const set = new Set<number>([ans]);
  for (const d of shuffle([...deltas])) {
    const c = ans + d;
    if (c >= min && set.size < 4) set.add(c);
  }
  let k = 1;
  while (set.size < 4) {
    if (ans + k >= min) set.add(ans + k);
    k++;
  }
  return shuffle([...set]).map(fmt || ar);
}

function calc(text: string, show: string, ans: number, deltas: number[], min: number, key: string, extra = 0): RawQ {
  return { key, kind: 'calc', text, ans: ar(ans), show, opts: numOpts(ans, deltas, min), extra };
}

const MULB: ReadonlyArray<[number, number]> = [
  [1, 5],
  [1, 9],
  [2, 12],
];

function qMul(level: number, tables: number[]): RawQ {
  const a = pickOne(tables);
  const bounds = MULB[level] || MULB[1]!;
  const b = rnd(bounds[0], bounds[1]);
  const ans = a * b;
  const sw = Math.random() < 0.5;
  const x = sw ? b : a;
  const y = sw ? a : b;
  const extra = x >= 7 && y >= 7 ? 3 : x >= 10 || y >= 10 ? 2 : 0;
  return {
    ...calc(`${ar(x)} × ${ar(y)} = ؟`, `${ar(x)} × ${ar(y)} = ${ar(ans)}`, ans, [a, -a, b, -b, 10, -10, 1, -1, 2], 1, `m${a}x${b}`, extra),
    tbl: a,
  };
}

function qDiv(level: number, tables: number[]): RawQ {
  const a = pickOne(tables);
  const bounds = MULB[level] || MULB[1]!;
  const b = rnd(bounds[0], bounds[1]);
  const t = a * b;
  const extra = t >= 60 ? 4 : t >= 30 ? 2 : 0;
  return {
    ...calc(`${ar(t)} ÷ ${ar(a)} = ؟`, `${ar(t)} ÷ ${ar(a)} = ${ar(b)}`, b, [1, -1, 2, -2, 3, -3], a === 1 ? 1 : 0, `d${t}/${a}`, extra),
    tbl: a,
  };
}

function addPair(level: number): [number, number] {
  if (level === 0) return [rnd(1, 20), rnd(1, 20)];
  if (level === 1) {
    const x = rnd(11, 85);
    return [x, rnd(5, 100 - x)];
  }
  const x = rnd(100, 850);
  return [x, rnd(50, 1000 - x)];
}

const NEAR = [1, -1, 2, -2, 10, -10, 9, -9, 11, -11];

function qAdd(level: number): RawQ {
  const [a, b] = addPair(level);
  const c = a + b;
  const extra = a >= 100 || b >= 100 ? 5 : a >= 25 || b >= 25 ? 2 : 0;
  return calc(`${ar(a)} + ${ar(b)} = ؟`, `${ar(a)} + ${ar(b)} = ${ar(c)}`, c, NEAR, 1, `a${a}+${b}`, extra);
}

function qSub(level: number): RawQ {
  const [a, b] = addPair(level);
  const c = a + b;
  const extra = c >= 150 ? 6 : c >= 30 ? 2 : 0;
  return calc(`${ar(c)} − ${ar(b)} = ؟`, `${ar(c)} − ${ar(b)} = ${ar(a)}`, a, NEAR, 0, `s${c}-${b}`, extra);
}

function qSqrt(level: number): RawQ {
  if (level === 0) {
    const r = rnd(1, 10);
    const sq = r * r;
    return calc(`√${ar(sq)} = ؟`, `√${ar(sq)} = ${ar(r)}`, r, [1, -1, 2, -2, 3, -3, 4], 1, `sq${sq}`, 1);
  }
  if (level === 1) {
    const r = rnd(2, 15);
    const sq = r * r;
    return calc(`√${ar(sq)} = ؟`, `√${ar(sq)} = ${ar(r)}`, r, [1, -1, 2, -2, 3, -3, 5, -5], 1, `sq${sq}`, sq >= 144 ? 3 : 1);
  }
  if (Math.random() < 0.45) {
    const a = rnd(2, 12);
    const b = rnd(1, a);
    const op = Math.random() < 0.65 ? '+' : '−';
    const sqA = a * a;
    const sqB = b * b;
    const ans = op === '+' ? a + b : a - b;
    return calc(`√${ar(sqA)} ${op} √${ar(sqB)} = ؟`, `√${ar(sqA)} ${op} √${ar(sqB)} = ${ar(ans)}`, ans, [1, -1, 2, -2, 3, -3, 4, -4], 0, `sqe${sqA}${op}${sqB}`, 6);
  }
  const r = rnd(4, 20);
  const sq = r * r;
  return calc(`√${ar(sq)} = ؟`, `√${ar(sq)} = ${ar(r)}`, r, [1, -1, 2, -2, 3, -3, 4, -4, 10, -10], 1, `sq${sq}`, sq >= 196 ? 4 : 2);
}

const svgW = (i: string) =>
  `<svg viewBox="0 0 150 120" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" class="w-36 h-28 block">${i}</svg>`;
const lbl = (x: number, y: number, t: string) =>
  `<text x="${x}" y="${y}" fill="currentColor" stroke="none" font-size="14" font-weight="800" text-anchor="middle">${t}</text>`;

function reg(k: number, rot?: number): string {
  const p: string[] = [];
  for (let i = 0; i < k; i++) {
    const t = ((rot == null ? -90 : rot) * Math.PI) / 180 + (i * 2 * Math.PI) / k;
    p.push((75 + 52 * Math.cos(t)).toFixed(1) + ',' + (60 + 52 * Math.sin(t)).toFixed(1));
  }
  return `<polygon points="${p.join(' ')}"/>`;
}

const SH: Record<string, [string, number, string]> = {
  square: ['مربع', 4, '<rect x="33" y="18" width="84" height="84"/>'],
  rect: ['مستطيل', 4, '<rect x="15" y="30" width="120" height="62"/>'],
  tri: ['مثلث', 3, reg(3)],
  circle: ['دائرة', 0, '<circle cx="75" cy="60" r="50"/>'],
  pent: ['مخمّس', 5, reg(5)],
  hex: ['مسدّس', 6, reg(6)],
  oct: ['مثمّن', 8, reg(8, 22.5)],
  rhom: ['معيّن', 4, '<polygon points="75,8 125,60 75,112 25,60"/>'],
  para: ['متوازي أضلاع', 4, '<polygon points="42,28 138,28 108,92 12,92"/>'],
};

const shapeName = (pool: string[]): RawQ => {
  const k = pickOne(pool);
  const sh = SH[k]!;
  const o = shuffle(pool.filter((x) => x !== k)).slice(0, 3).map((x) => SH[x]![0]);
  return { key: 'gn' + k, kind: 'geo', text: 'ما اسم هذا الشكل؟', fig: svgW(sh[2]), ans: sh[0], opts: shuffle([sh[0], ...o]), extra: 3 };
};

const cm = (v: number) => `${ar(v)} سم`;
const cm2 = (v: number) => `${ar(v)} سم²`;
const deg = (v: number) => `${ar(v)}°`;

const gNum = (key: string, text: string, ans: number, deltas: number[], min: number, fmt?: (v: number) => string, fig?: string, extra = 6): RawQ => ({
  key,
  kind: 'geo',
  text,
  fig,
  ans: (fmt || ar)(ans),
  opts: numOpts(ans, deltas, min, fmt),
  extra,
});

const gTxt = (key: string, text: string, ans: string, others: string[], fig?: string, extra = 5): RawQ => ({
  key,
  kind: 'geo',
  text,
  fig,
  ans,
  opts: shuffle([ans, ...others]),
  extra,
});

function angleFig(a: number): string {
  const r = (a * Math.PI) / 180;
  const x = 40 + 90 * Math.cos(r);
  const y = 98 - 90 * Math.sin(r);
  const m =
    a === 90
      ? '<path d="M40 82 H56 V98" stroke-width="3"/>'
      : `<path d="M64 98 A24 24 0 0 0 ${(40 + 24 * Math.cos(r)).toFixed(1)} ${(98 - 24 * Math.sin(r)).toFixed(1)}" stroke-width="3"/>`;
  return svgW(`<path d="M130 98 H40 L${x.toFixed(1)} ${Math.max(6, y).toFixed(1)}"/>${m}`);
}

const rectFig = (w: number, h: number) => svgW(`<rect x="28" y="28" width="94" height="58"/>` + lbl(75, 20, ar(w)) + lbl(135, 62, ar(h)));

const GEO: Array<Array<() => RawQ>> = [
  [
    () => shapeName(['square', 'rect', 'tri', 'circle', 'pent', 'hex']),
    () => {
      const k = pickOne(['tri', 'square', 'rect', 'pent', 'hex']);
      return gNum('gs' + k, 'كم ضلعًا لهذا الشكل؟', SH[k]![1], [1, -1, 2, -2, 3], 1, ar, svgW(SH[k]![2]), 4);
    },
    () => gTxt('gc', 'أي شكل ليس له أضلاع ولا رؤوس؟', 'الدائرة', ['المربع', 'المثلث', 'المستطيل'], undefined, 4),
    () => gTxt('ge', 'أي شكل أضلاعه الأربعة متساوية وزواياه قائمة؟', 'المربع', ['المثلث', 'الدائرة', 'المسدّس'], undefined, 5),
    () => gNum('gt', 'كم رأسًا للمثلث؟', 3, [1, 2, 3, -1], 1, ar, undefined, 3),
  ],
  [
    () => shapeName(['pent', 'hex', 'oct', 'rhom', 'tri']),
    () => {
      const k = pickOne(['pent', 'hex', 'oct']);
      return gNum('gv' + k, 'كم رأسًا لهذا الشكل؟', SH[k]![1], [1, -1, 2, -2], 1, ar, svgW(SH[k]![2]), 5);
    },
    () => {
      const ty = pickOne(['acute', 'right', 'obtuse'] as const);
      const a = { acute: rnd(30, 70), right: 90, obtuse: rnd(110, 150) }[ty];
      const L = { acute: 'حادة', right: 'قائمة', obtuse: 'منفرجة' };
      return gTxt('ga' + ty, 'ما نوع هذه الزاوية؟', L[ty], Object.values(L).filter((x) => x !== L[ty]).concat('مستقيمة'), angleFig(a), 5);
    },
    () => gNum('gr', 'كم زاوية قائمة في المستطيل؟', 4, [-1, -2, -3, 1], 0, ar, undefined, 4),
    () => gNum('g90', 'كم درجة قياس الزاوية القائمة؟', 90, [-45, 90, -30, 30], 1, deg, undefined, 4),
    () => {
      const s = rnd(2, 12);
      return gNum('gps' + s, `مربع طول ضلعه ${cm(s)}. كم محيطه؟`, 4 * s, [s, -s, 2, -2, 4, s * s - 4 * s || 5], 1, cm, undefined, 7);
    },
    () => {
      const w = rnd(4, 12);
      const h = rnd(2, w - 1);
      return gNum('gpr' + w + h, 'كم محيط هذا المستطيل بالسنتيمتر؟', 2 * (w + h), [-(w + h), 2, -2, 4, -4, w, -h], 1, cm, rectFig(w, h), 8);
    },
    () => {
      const t = pickOne([
        ['متساوي الأضلاع', 5, 5, 5],
        ['متساوي الساقين', 6, 6, 4],
        ['مختلف الأضلاع', 3, 4, 5],
      ] as const);
      return gTxt(
        'gtt' + t[0],
        `مثلث أطوال أضلاعه ${ar(t[1])} و${ar(t[2])} و${ar(t[3])} سم. ما نوعه؟`,
        t[0],
        ['متساوي الأضلاع', 'متساوي الساقين', 'مختلف الأضلاع'].filter((x) => x !== t[0]).concat('شبه منحرف'),
        undefined,
        7,
      );
    },
  ],
  [
    () => {
      const w = rnd(4, 15);
      const h = rnd(2, 9);
      return gNum('gar' + w + h, 'كم مساحة هذا المستطيل؟', w * h, [w, -w, h, -h, 2 * (w + h) - w * h || 3, 10], 1, cm2, rectFig(w, h), 8);
    },
    () => {
      const s = rnd(3, 12);
      return gNum('gas' + s, `مربع طول ضلعه ${cm(s)}. كم مساحته؟`, s * s, [s, -s, 4 * s - s * s || 2, 1, -1], 1, cm2, undefined, 7);
    },
    () => {
      const a = rnd(30, 80);
      const b = rnd(30, 80);
      return gNum('g3' + a + b, `في مثلث، زاويتان قياسهما ${deg(a)} و${deg(b)}. كم قياس الزاوية الثالثة؟`, 180 - a - b, [10, -10, 20, -5, 5], 1, deg, undefined, 10);
    },
    () => {
      const l = rnd(6, 15);
      const w = rnd(2, l - 1);
      return gNum('gw' + l + w, `مستطيل محيطه ${cm(2 * (l + w))} وطوله ${cm(l)}. كم عرضه؟`, w, [1, -1, 2, -2, l - w], 1, cm, undefined, 10);
    },
    () => {
      const a = rnd(3, 9);
      const b = rnd(3, 9);
      const c = rnd(3, 9);
      return gNum('gpt' + a + b + c, `مثلث أطوال أضلاعه ${ar(a)} و${ar(b)} و${ar(c)} سم. كم محيطه؟`, a + b + c, [1, -1, 2, -2, 3, -3], 1, cm, undefined, 8);
    },
    () => gNum('g360', 'كم مجموع قياسات زوايا الشكل الرباعي؟', 360, [-180, -270, 180, -90], 1, deg, undefined, 5),
    () => gNum('g180', 'كم مجموع قياسات زوايا المثلث؟', 180, [-90, 180, 90, -45], 1, deg, undefined, 5),
    () =>
      pickOne([
        () => gNum('gcfaces', 'كم وجهًا للمكعب؟', 6, [-2, 2, -1, 6], 1, ar, undefined, 5),
        () => gNum('gcedges', 'كم حرفًا للمكعب؟', 12, [-4, -6, 2, 6], 1, ar, undefined, 6),
        () => gNum('gcverts', 'كم رأسًا للمكعب؟', 8, [-2, -4, 2, 4], 1, ar, undefined, 5),
      ])(),
  ],
];

function qGeo(level: number): RawQ {
  const q = pickOne(GEO[level] || GEO[1]!)();
  return { ...q, kind: 'geo', extra: q.extra ?? 6 };
}

export function generateQuestion(cfg: QGenCfg, recentKeys: string[]): Question {
  const level = Math.max(0, Math.min(2, cfg.level));
  const tables = cfg.tables.length ? cfg.tables : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const validTopics = cfg.topics.length ? cfg.topics : (['mul'] as TopicId[]);

  let x: RawQ;
  let k: TopicId;
  let tries = 0;
  do {
    k = pickOne(validTopics);
    if (k === 'mul') x = qMul(level, tables);
    else if (k === 'div') x = qDiv(level, tables);
    else if (k === 'add') x = qAdd(level);
    else if (k === 'sub') x = qSub(level);
    else if (k === 'sqrt') x = qSqrt(level);
    else x = qGeo(level);
  } while (recentKeys.includes(x.key) && ++tries < 25);

  recentKeys.push(x.key);
  if (recentKeys.length > 10) recentKeys.shift();

  const baseSec = LEVELS[level]?.[1] ?? 18;
  const timeSec = baseSec + (x.extra || 0);

  return {
    ...x,
    id: ++qSeq,
    topic: k,
    level,
    timeSec,
    show: x.show || x.ans,
  };
}
