<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { ARENAS, COLORS, OFF } from '@/constants/game';
import { cellFor } from '@/services/board';
import type { ArenaId, BoardData, BoardPlayerView, FloatingFx } from '@/types/game';
import { ar } from '@/utils/format';

const props = defineProps<{
  board: BoardData;
  players: BoardPlayerView[];
  fx?: FloatingFx[];
  showQuickArena?: boolean;
  label?: string;
  fsHudLeft?: string;
  fsHudCenter?: string;
  fsHudRight?: string;
}>();

const emit = defineEmits<{
  (e: 'change-arena', arena: ArenaId): void;
}>();

const wrapRef = ref<HTMLElement | null>(null);
const isFs = ref(false);

interface ArenaStyleDef {
  bg: string;
  tiles: string[];
  lastTile: string;
  tileStroke: string;
  rx: number;
  numFill: string;
  numStroke: string;
  goalIcon: string;
  allIcon: string;
  surpIcon: string;
  borderClass: string;
}

const ARENA_STYLES: Record<ArenaId, ArenaStyleDef> = {
  classic: {
    bg: '#1b1b3a',
    tiles: ['#e4572e', '#f0a202', '#2e86de', '#8e44ad', '#d6336c'],
    lastTile: '#c98a1b',
    tileStroke: 'none',
    rx: 12,
    numFill: '#ffffff',
    numStroke: '#1b1b3a',
    goalIcon: '🏆',
    allIcon: '⭐',
    surpIcon: '🎁',
    borderClass: 'border-[#1b1b3a] bg-[#1b1b3a] shadow-xl',
  },
  horror: {
    bg: '#090514',
    tiles: ['#1e1333', '#2d122b', '#17152b', '#341224', '#231942'],
    lastTile: '#6b21a8',
    tileStroke: '#4c1d95',
    rx: 8,
    numFill: '#f3e8ff',
    numStroke: '#090514',
    goalIcon: '🔮',
    allIcon: '🕯️',
    surpIcon: '🎃',
    borderClass: 'border-purple-900 bg-[#090514] shadow-[0_0_25px_rgba(147,51,234,0.35)]',
  },
  funny: {
    bg: '#2e1065',
    tiles: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#ff85a1'],
    lastTile: '#ff9f1c',
    tileStroke: '#ffffff',
    rx: 22,
    numFill: '#ffffff',
    numStroke: '#2e1065',
    goalIcon: '🎪',
    allIcon: '🌟',
    surpIcon: '🎈',
    borderClass: 'border-pink-500 bg-[#2e1065] shadow-[0_8px_25px_rgba(236,72,153,0.28)]',
  },
  space: {
    bg: '#030712',
    tiles: ['#0f172a', '#1e1b4b', '#0c2444', '#25113b', '#082f38'],
    lastTile: '#0284c7',
    tileStroke: '#06b6d4',
    rx: 14,
    numFill: '#67e8f9',
    numStroke: '#030712',
    goalIcon: '🛸',
    allIcon: '☄️',
    surpIcon: '🛰️',
    borderClass: 'border-cyan-500 bg-[#030712] shadow-[0_0_26px_rgba(6,182,212,0.32)]',
  },
  jungle: {
    bg: '#071f12',
    tiles: ['#2d6a4f', '#40916c', '#8c5a32', '#52796f', '#3b7a57'],
    lastTile: '#ca8a04',
    tileStroke: '#1b4332',
    rx: 12,
    numFill: '#fefae0',
    numStroke: '#071f12',
    goalIcon: '🗿',
    allIcon: '🧭',
    surpIcon: '🥥',
    borderClass: 'border-amber-900 bg-[#071f12] shadow-[0_8px_25px_rgba(20,83,45,0.35)]',
  },
};

const n = computed(() => props.board.n || 6);
const last = computed(() => n.value * n.value);
const box = computed(() => n.value * 100);
const arena = computed<ArenaId>(() => props.board.arena || 'classic');
const st = computed(() => ARENA_STYLES[arena.value] || ARENA_STYLES.classic);
const arenaTitle = computed(() => (ARENAS.find((a) => a[0] === arena.value) || ARENAS[0]!)[1]);
const tokenScale = computed(() => 1 + (n.value - 6) * 0.11);

const cells = computed(() => {
  const list = [];
  for (let k = 1; k <= last.value; k++) {
    const p = cellFor(k, n.value);
    const fill =
      k === last.value
        ? st.value.lastTile
        : st.value.tiles[(p.c + n.value - 1 - Math.floor(p.y / 100)) % st.value.tiles.length]!;
    list.push({ k, x: p.x, y: p.y, fill });
  }
  return list;
});

const ladders = computed(() => {
  const out = [];
  for (const [fromStr, to] of Object.entries(props.board.lad || {})) {
    const p = cellFor(Number(fromStr), n.value);
    const w = cellFor(to, n.value);
    const dx = w.x - p.x;
    const dy = w.y - p.y;
    const L = Math.hypot(dx, dy) || 1;
    const nx = (-dy / L) * 11;
    const ny = (dx / L) * 11;
    const m = Math.floor(L / 30);
    const rungs = [];
    for (let i = 1; i < m; i++) {
      const t = i / m;
      const x = p.x + dx * t;
      const y = p.y + dy * t;
      rungs.push({ x1: x + nx, y1: y + ny, x2: x - nx, y2: y - ny });
    }
    out.push({ key: fromStr, p, w, nx, ny, rungs });
  }
  return out;
});

const snakes = computed(() => {
  const out = [];
  for (const [fromStr, to] of Object.entries(props.board.snk || {})) {
    const p = cellFor(Number(fromStr), n.value);
    const w = cellFor(to, n.value);
    const dx = w.x - p.x;
    const dy = w.y - p.y;
    const L = Math.hypot(dx, dy) || 1;
    const nx = (-dy / L) * 45;
    const ny = (dx / L) * 45;
    const d = `M${p.x} ${p.y} C${p.x + nx + dx * 0.15} ${p.y + ny + dy * 0.15} ${w.x - nx - dx * 0.15} ${w.y - ny - dy * 0.15} ${w.x} ${w.y}`;
    const ang = (Math.atan2(ny + dy * 0.15, nx + dx * 0.15) * 180) / Math.PI + 180;
    out.push({ key: fromStr, p, d, ang });
  }
  return out;
});

const goalPos = computed(() => cellFor(last.value, n.value));
const allqCells = computed(() => (props.board.allq || []).map((k) => ({ k, ...cellFor(k, n.value) })));
const surpCells = computed(() => (props.board.surp || []).map((k) => ({ k, ...cellFor(k, n.value) })));

function tokenTransform(pos: number, idx: number): string {
  const c = cellFor(pos, n.value);
  const o = OFF[idx] || [0, 0];
  return `translate(${c.x + o[0] * tokenScale.value}px, ${c.y + o[1] * tokenScale.value}px)`;
}

function toggleFullscreen() {
  const el = wrapRef.value;
  if (!el) return;
  if (isFs.value || document.fullscreenElement === el) {
    isFs.value = false;
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  } else {
    isFs.value = true;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  }
}

function onFsChange() {
  if (!document.fullscreenElement) {
    isFs.value = false;
  }
}

onMounted(() => document.addEventListener('fullscreenchange', onFsChange));
onUnmounted(() => document.removeEventListener('fullscreenchange', onFsChange));
</script>

<template>
  <div
    ref="wrapRef"
    :class="
      isFs
        ? 'fixed inset-0 z-50 flex flex-col items-center justify-center overflow-auto bg-bg p-3'
        : 'relative'
    "
  >
    <!-- Board Top Controls -->
    <div
      class="mb-1.5 flex items-center justify-between gap-2"
      :class="isFs ? 'w-full max-w-[min(85vh,94vw)]' : ''"
    >
      <select
        v-if="showQuickArena"
        :value="arena"
        aria-label="تغيير تصميم الساحة"
        class="min-h-9 cursor-pointer rounded-xl border-2 border-line bg-card px-2.5 text-sm font-bold text-ink transition hover:border-accent"
        @change="emit('change-arena', ($event.target as HTMLSelectElement).value as ArenaId)"
      >
        <option v-for="[id, title] in ARENAS" :key="id" :value="id">{{ title }}</option>
      </select>
      <span v-else class="text-xs font-extrabold text-ink/80">
        {{ label || arenaTitle }}
      </span>

      <button
        type="button"
        class="inline-flex min-h-8.5 cursor-pointer items-center gap-1 rounded-xl border-2 border-line bg-card px-3 text-xs font-extrabold text-ink transition hover:border-accent"
        :aria-pressed="isFs"
        @click="toggleFullscreen"
      >
        {{ isFs ? '✕ خروج من ملء الشاشة' : '⛶ ملء الشاشة' }}
      </button>
    </div>

    <!-- Fullscreen HUD -->
    <div
      v-if="isFs && (fsHudLeft || fsHudCenter || fsHudRight)"
      class="mb-2 flex w-full max-w-[min(85vh,94vw)] flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-line bg-card px-3.5 py-2 text-sm font-bold"
    >
      <span v-if="fsHudLeft">{{ fsHudLeft }}</span>
      <span v-if="fsHudCenter" class="text-accent">{{ fsHudCenter }}</span>
      <span v-if="fsHudRight">{{ fsHudRight }}</span>
    </div>

    <!-- SVG Board -->
    <svg
      :viewBox="`0 0 ${box} ${box}`"
      role="img"
      :aria-label="`لوحة اللعبة ${ar(n)} في ${ar(n)}`"
      class="mx-auto block h-auto w-full rounded-2xl border-4 transition-all duration-200"
      :class="[
        st.borderClass,
        isFs ? 'max-h-[84vh] max-w-[min(85vh,94vw)]' : 'max-w-[min(82vh,780px)]',
      ]"
    >
      <rect :width="box" :height="box" :fill="st.bg" />

      <!-- Tiles -->
      <g v-for="c in cells" :key="c.k">
        <rect
          :x="c.x - 46"
          :y="c.y - 46"
          width="92"
          height="92"
          :rx="st.rx"
          :fill="c.fill"
          :stroke="st.tileStroke !== 'none' ? st.tileStroke : undefined"
          :stroke-width="st.tileStroke !== 'none' ? 2.5 : undefined"
        />
        <circle
          v-if="arena === 'space' && c.k % 3 === 0"
          :cx="c.x - 30"
          :cy="c.y - 30"
          r="2"
          fill="#e0f2fe"
          opacity="0.6"
        />
        <path
          v-else-if="arena === 'horror' && c.k % 4 === 0 && c.k < last"
          :d="`M${c.x - 44} ${c.y - 30} Q${c.x - 34} ${c.y - 34} ${c.x - 30} ${c.y - 44}`"
          stroke="#a855f7"
          stroke-width="1.5"
          fill="none"
          opacity="0.35"
        />
        <circle
          v-else-if="arena === 'funny' && c.k % 3 === 0 && c.k < last"
          :cx="c.x - 32"
          :cy="c.y + 32"
          r="4"
          fill="#ffffff"
          opacity="0.3"
        />
      </g>

      <!-- Ladders -->
      <g v-for="lad in ladders" :key="'l-' + lad.key" stroke-linecap="round">
        <template v-if="arena === 'horror'">
          <g stroke="#581c87" stroke-width="11">
            <line :x1="lad.p.x + lad.nx" :y1="lad.p.y + lad.ny" :x2="lad.w.x + lad.nx" :y2="lad.w.y + lad.ny" />
            <line :x1="lad.p.x - lad.nx" :y1="lad.p.y - lad.ny" :x2="lad.w.x - lad.nx" :y2="lad.w.y - lad.ny" />
          </g>
          <g stroke="#e9d5ff" stroke-width="5">
            <line :x1="lad.p.x + lad.nx" :y1="lad.p.y + lad.ny" :x2="lad.w.x + lad.nx" :y2="lad.w.y + lad.ny" />
            <line :x1="lad.p.x - lad.nx" :y1="lad.p.y - lad.ny" :x2="lad.w.x - lad.nx" :y2="lad.w.y - lad.ny" />
            <line v-for="(r, ri) in lad.rungs" :key="ri" :x1="r.x1" :y1="r.y1" :x2="r.x2" :y2="r.y2" />
          </g>
        </template>
        <template v-else-if="arena === 'funny'">
          <g stroke="#ffffff" stroke-width="10">
            <line :x1="lad.p.x + lad.nx" :y1="lad.p.y + lad.ny" :x2="lad.w.x + lad.nx" :y2="lad.w.y + lad.ny" />
            <line :x1="lad.p.x - lad.nx" :y1="lad.p.y - lad.ny" :x2="lad.w.x - lad.nx" :y2="lad.w.y - lad.ny" />
          </g>
          <g stroke="#ff007f" stroke-width="6" stroke-dasharray="10 10">
            <line :x1="lad.p.x + lad.nx" :y1="lad.p.y + lad.ny" :x2="lad.w.x + lad.nx" :y2="lad.w.y + lad.ny" />
            <line :x1="lad.p.x - lad.nx" :y1="lad.p.y - lad.ny" :x2="lad.w.x - lad.nx" :y2="lad.w.y - lad.ny" />
          </g>
          <g stroke="#ffee32" stroke-width="6">
            <line v-for="(r, ri) in lad.rungs" :key="ri" :x1="r.x1" :y1="r.y1" :x2="r.x2" :y2="r.y2" />
          </g>
        </template>
        <template v-else-if="arena === 'space'">
          <g stroke="#0891b2" stroke-width="11" opacity="0.6">
            <line :x1="lad.p.x + lad.nx" :y1="lad.p.y + lad.ny" :x2="lad.w.x + lad.nx" :y2="lad.w.y + lad.ny" />
            <line :x1="lad.p.x - lad.nx" :y1="lad.p.y - lad.ny" :x2="lad.w.x - lad.nx" :y2="lad.w.y - lad.ny" />
          </g>
          <g stroke="#22d3ee" stroke-width="5">
            <line :x1="lad.p.x + lad.nx" :y1="lad.p.y + lad.ny" :x2="lad.w.x + lad.nx" :y2="lad.w.y + lad.ny" />
            <line :x1="lad.p.x - lad.nx" :y1="lad.p.y - lad.ny" :x2="lad.w.x - lad.nx" :y2="lad.w.y - lad.ny" />
          </g>
          <g stroke="#a5f3fc" stroke-width="4" stroke-dasharray="6 4">
            <line v-for="(r, ri) in lad.rungs" :key="ri" :x1="r.x1" :y1="r.y1" :x2="r.x2" :y2="r.y2" />
          </g>
        </template>
        <template v-else-if="arena === 'jungle'">
          <g stroke="#5c3a21" stroke-width="10">
            <line :x1="lad.p.x + lad.nx" :y1="lad.p.y + lad.ny" :x2="lad.w.x + lad.nx" :y2="lad.w.y + lad.ny" />
            <line :x1="lad.p.x - lad.nx" :y1="lad.p.y - lad.ny" :x2="lad.w.x - lad.nx" :y2="lad.w.y - lad.ny" />
          </g>
          <g stroke="#d4a373" stroke-width="6">
            <line :x1="lad.p.x + lad.nx" :y1="lad.p.y + lad.ny" :x2="lad.w.x + lad.nx" :y2="lad.w.y + lad.ny" />
            <line :x1="lad.p.x - lad.nx" :y1="lad.p.y - lad.ny" :x2="lad.w.x - lad.nx" :y2="lad.w.y - lad.ny" />
          </g>
          <g stroke="#faedcd" stroke-width="5">
            <line v-for="(r, ri) in lad.rungs" :key="ri" :x1="r.x1" :y1="r.y1" :x2="r.x2" :y2="r.y2" />
          </g>
        </template>
        <template v-else>
          <g stroke="#ffffff" stroke-width="7">
            <line :x1="lad.p.x + lad.nx" :y1="lad.p.y + lad.ny" :x2="lad.w.x + lad.nx" :y2="lad.w.y + lad.ny" />
            <line :x1="lad.p.x - lad.nx" :y1="lad.p.y - lad.ny" :x2="lad.w.x - lad.nx" :y2="lad.w.y - lad.ny" />
          </g>
          <g stroke="#ffffff" stroke-width="5">
            <line v-for="(r, ri) in lad.rungs" :key="ri" :x1="r.x1" :y1="r.y1" :x2="r.x2" :y2="r.y2" />
          </g>
        </template>
      </g>

      <!-- Snakes / Hazards -->
      <g v-for="snk in snakes" :key="'s-' + snk.key">
        <template v-if="arena === 'horror'">
          <path :d="snk.d" fill="none" stroke="#3b0764" stroke-width="24" stroke-linecap="round" />
          <path :d="snk.d" fill="none" stroke="#991b1b" stroke-width="16" stroke-linecap="round" />
          <path :d="snk.d" fill="none" stroke="#f87171" stroke-width="6" stroke-dasharray="6 14" />
          <g :transform="`translate(${snk.p.x} ${snk.p.y}) rotate(${snk.ang})`">
            <path d="M18 0 L36 0 M36 0 L43 -7 M36 0 L43 7" stroke="#ef4444" stroke-width="3.5" fill="none" stroke-linecap="round" />
            <ellipse rx="22" ry="17" fill="#450a0a" stroke="#dc2626" stroke-width="3" />
            <circle cx="6" cy="-8" r="6" fill="#fef08a" />
            <circle cx="6" cy="8" r="6" fill="#fef08a" />
            <ellipse cx="8" cy="-8" rx="2" ry="4.5" fill="#dc2626" />
            <ellipse cx="8" cy="8" rx="2" ry="4.5" fill="#dc2626" />
          </g>
          <text :x="snk.p.x - 26" :y="snk.p.y - 22" text-anchor="middle" font-size="22">👻</text>
        </template>

        <template v-else-if="arena === 'funny'">
          <path :d="snk.d" fill="none" stroke="#7209b7" stroke-width="24" stroke-linecap="round" />
          <path :d="snk.d" fill="none" stroke="#f72585" stroke-width="17" stroke-linecap="round" />
          <path :d="snk.d" fill="none" stroke="#4cc9f0" stroke-width="9" stroke-dasharray="10 12" stroke-linecap="round" />
          <g :transform="`translate(${snk.p.x} ${snk.p.y}) rotate(${snk.ang})`">
            <path d="M16 0 Q28 10 36 0" stroke="#ffbe0b" stroke-width="5" fill="none" stroke-linecap="round" />
            <ellipse rx="22" ry="18" fill="#f72585" stroke="#ffffff" stroke-width="3" />
            <circle cx="6" cy="-9" r="7.5" fill="#fff" />
            <circle cx="6" cy="9" r="7.5" fill="#fff" />
            <circle cx="8" cy="-7" r="3.5" fill="#111" />
            <circle cx="4" cy="11" r="3.5" fill="#111" />
          </g>
          <text :x="snk.p.x - 26" :y="snk.p.y - 22" text-anchor="middle" font-size="22">🍌</text>
        </template>

        <template v-else-if="arena === 'space'">
          <path :d="snk.d" fill="none" stroke="#3b0764" stroke-width="24" stroke-linecap="round" />
          <path :d="snk.d" fill="none" stroke="#9333ea" stroke-width="15" stroke-linecap="round" />
          <path :d="snk.d" fill="none" stroke="#f0abfc" stroke-width="5" stroke-dasharray="4 12" />
          <g :transform="`translate(${snk.p.x} ${snk.p.y}) rotate(${snk.ang})`">
            <ellipse rx="21" ry="16" fill="#1e1b4b" stroke="#c084fc" stroke-width="3" />
            <ellipse cx="6" cy="-8" rx="6" ry="4" fill="#4ade80" />
            <ellipse cx="6" cy="8" rx="6" ry="4" fill="#4ade80" />
            <circle cx="7" cy="-8" r="2" fill="#052e16" />
            <circle cx="7" cy="8" r="2" fill="#052e16" />
          </g>
          <text :x="snk.p.x - 26" :y="snk.p.y - 22" text-anchor="middle" font-size="20">🌀</text>
        </template>

        <template v-else-if="arena === 'jungle'">
          <path :d="snk.d" fill="none" stroke="#081c15" stroke-width="23" stroke-linecap="round" />
          <path :d="snk.d" fill="none" stroke="#2d6a4f" stroke-width="17" stroke-linecap="round" />
          <path :d="snk.d" fill="none" stroke="#b7e4c7" stroke-width="7" stroke-dasharray="12 14" />
          <g :transform="`translate(${snk.p.x} ${snk.p.y}) rotate(${snk.ang})`">
            <path d="M18 0 L34 0 M34 0 L40 -6 M34 0 L40 6" stroke="#e11d48" stroke-width="3" fill="none" stroke-linecap="round" />
            <ellipse rx="21" ry="16" fill="#2d6a4f" stroke="#081c15" stroke-width="3" />
            <circle cx="5" cy="-8" r="5.5" fill="#fef08a" />
            <circle cx="5" cy="8" r="5.5" fill="#fef08a" />
            <circle cx="7" cy="-8" r="2.8" fill="#111" />
            <circle cx="7" cy="8" r="2.8" fill="#111" />
          </g>
        </template>

        <template v-else>
          <path :d="snk.d" fill="none" stroke="#14532d" stroke-width="22" stroke-linecap="round" />
          <path :d="snk.d" fill="none" stroke="#3fae5a" stroke-width="16" stroke-linecap="round" />
          <path :d="snk.d" fill="none" stroke="#f5c542" stroke-width="7" stroke-dasharray="9 15" />
          <g :transform="`translate(${snk.p.x} ${snk.p.y}) rotate(${snk.ang})`">
            <path d="M18 0 L33 0 M33 0 L39 -6 M33 0 L39 6" stroke="#e11d48" stroke-width="3" fill="none" stroke-linecap="round" />
            <ellipse rx="20" ry="16" fill="#3fae5a" stroke="#14532d" stroke-width="3" />
            <circle cx="5" cy="-8" r="5.5" fill="#fff" />
            <circle cx="5" cy="8" r="5.5" fill="#fff" />
            <circle cx="7" cy="-8" r="2.8" fill="#111" />
            <circle cx="7" cy="8" r="2.8" fill="#111" />
          </g>
        </template>
      </g>

      <!-- Cell Numbers -->
      <text
        v-for="c in cells.slice(0, -1)"
        :key="'n-' + c.k"
        :x="c.x"
        :y="c.y"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="34"
        class="pointer-events-none font-display"
        :fill="st.numFill"
        :stroke="st.numStroke"
        stroke-width="5"
        paint-order="stroke"
        stroke-linejoin="round"
      >
        {{ ar(c.k) }}
      </text>

      <!-- Finish Icon -->
      <text :x="goalPos.x" :y="goalPos.y + 18" text-anchor="middle" font-size="50">
        {{ st.goalIcon }}
      </text>

      <!-- Special Icons -->
      <text
        v-for="c in allqCells"
        :key="'aq-' + c.k"
        :x="c.x + 27"
        :y="c.y - 20"
        text-anchor="middle"
        font-size="26"
      >
        {{ st.allIcon }}
      </text>
      <text
        v-for="c in surpCells"
        :key="'sp-' + c.k"
        :x="c.x + 27"
        :y="c.y - 20"
        text-anchor="middle"
        font-size="26"
      >
        {{ st.surpIcon }}
      </text>

      <!-- Player Tokens -->
      <g
        v-for="(p, i) in players"
        :key="'tok-' + p.i"
        class="transition-transform duration-300 ease-out motion-reduce:transition-none"
        :style="{ transform: tokenTransform(p.pos, i) }"
      >
        <g :transform="`scale(${tokenScale})`">
          <circle r="14" :fill="p.color || COLORS[i % COLORS.length]" stroke="#ffffff" stroke-width="3" />
          <text y="6" text-anchor="middle" fill="#ffffff" font-size="16" font-weight="800">
            {{ ar(i + 1) }}
          </text>
        </g>
      </g>
    </svg>

    <!-- Floating Reactions Layer -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <span
        v-for="item in fx || []"
        :key="item.id"
        class="animate-float-up absolute bottom-[4%] grid h-13 w-13 place-items-center rounded-full text-3xl shadow-md"
        :style="{ insetInlineStart: item.leftPct + '%', backgroundColor: item.color }"
      >
        {{ item.emoji }}
      </span>
    </div>
  </div>
</template>
