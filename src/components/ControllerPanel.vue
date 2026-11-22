<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { CARD, REACT } from '@/constants/game';
import type { CardType, ClientActionMessage, ClientViewMessage } from '@/types/game';
import { ar } from '@/utils/format';

const props = defineProps<{
  view: ClientViewMessage;
}>();

const emit = defineEmits<{
  (e: 'action', payload: ClientActionMessage): void;
}>();

const sentQid = ref<number | null>(null);
const barPct = ref(100);
const remSec = ref(0);
let timerId = 0;
let baseLeft = 0;
let baseTotal = 1;
let baseAt = 0;

const hasActiveTimer = computed(
  () =>
    (!!props.view.q && !props.view.reveal) ||
    (props.view.phase === 'choose' && props.view.turn && props.view.total > 100),
);

watch(
  () => [
    props.view.qid,
    props.view.phase,
    props.view.left,
    props.view.total,
    props.view.paused,
    props.view.reveal,
  ],
  () => {
    if (props.view.qid !== sentQid.value) {
      sentQid.value = null;
    }
    baseLeft = props.view.left || 0;
    baseTotal = props.view.total || 1;
    baseAt = performance.now();
    barPct.value = Math.max(0, Math.min(100, (baseLeft / baseTotal) * 100));
    remSec.value = Math.ceil(Math.max(0, baseLeft) / 1000);

    clearInterval(timerId);
    if (hasActiveTimer.value && !props.view.paused) {
      timerId = window.setInterval(() => {
        const rem = Math.max(0, baseLeft - (performance.now() - baseAt));
        barPct.value = Math.max(0, Math.min(100, (rem / baseTotal) * 100));
        remSec.value = Math.ceil(rem / 1000);
      }, 100);
    }
  },
  { immediate: true },
);

onUnmounted(() => clearInterval(timerId));

const canAsk = computed(() => props.view.turn && props.view.phase === 'ready' && !props.view.paused);
const canRoll = computed(() => props.view.turn && props.view.phase === 'roll' && !props.view.paused);
const canChoose = computed(() => props.view.turn && props.view.phase === 'choose' && !props.view.paused);

function isCardUsable(c: CardType): boolean {
  if (!props.view.turn || props.view.paused) return false;
  if (c === 'freeze') return props.view.phase === 'ready' || props.view.phase === 'roll';
  if (c === 'double') {
    return props.view.moveMode === 'speed'
      ? props.view.phase === 'ready' || props.view.phase === 'q'
      : props.view.phase === 'roll';
  }
  if (c === 'swap') return props.view.phase === 'q';
  return false;
}

function cardLabel(c: CardType): string {
  if (c === 'double' && props.view.moveMode === 'speed') return '⚡ خطوات مضاعفة';
  return `${CARD[c][0]} ${CARD[c][1]}`;
}

function submitAnswer(idx: number) {
  if (!props.view.qid || sentQid.value === props.view.qid || props.view.out || props.view.reveal) return;
  sentQid.value = props.view.qid;
  emit('action', { t: 'answer', i: idx, id: props.view.qid });
}

function optClass(opt: string, idx: number): string {
  const rev = props.view.reveal;
  if (rev) {
    if (opt === rev.ans) return 'bg-ok text-white border-ok';
    if (idx === rev.pick) return 'bg-bad text-white border-bad';
  }
  return 'bg-bg text-ink border-line hover:border-accent';
}

const isArabicText = (s: string) => /[ء-ي]/.test(s);
</script>

<template>
  <div>
    <!-- Who / Steps Badge Header -->
    <div class="flex items-center justify-between gap-2.5">
      <b class="flex items-center gap-2 text-lg font-extrabold sm:text-xl">
        <template v-if="view.phase === 'end'">🏆 {{ view.won }} فاز</template>
        <template v-else-if="view.turn">
          <i class="inline-block h-3.5 w-3.5 shrink-0 rounded-full" :style="{ backgroundColor: view.color }" />
          دورك يا {{ view.name }}
        </template>
        <template v-else> دور {{ view.cur }} </template>
      </b>

      <div
        class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-[3px] border-accent bg-bg font-display text-3xl text-ink"
        aria-live="polite"
      >
        {{
          (view.turn || view.phase === 'choose') && view.dice
            ? ar(view.dice)
            : view.moveMode === 'speed'
              ? '⚡'
              : '🎲'
        }}
      </div>
    </div>

    <!-- Race / Paused Title -->
    <div v-if="view.paused || view.title" class="mt-1.5 text-center text-base font-extrabold text-accent">
      {{ view.paused ? '⏸ اللعب متوقف' : view.title }}
    </div>

    <!-- Ask Question Button -->
    <button
      v-if="canAsk"
      type="button"
      class="mt-3 min-h-13 w-full cursor-pointer rounded-2xl bg-accent px-5 text-lg font-extrabold text-accent-ink transition hover:bg-accent-hover active:scale-[0.98]"
      @click="emit('action', { t: 'ask' })"
    >
      ابدأ الدور — اعرض السؤال ❓
    </button>

    <!-- Roll Dice Button (Dice mode only) -->
    <button
      v-if="canRoll"
      type="button"
      class="mt-3 min-h-13 w-full cursor-pointer rounded-2xl bg-accent px-5 text-lg font-extrabold text-accent-ink transition hover:bg-accent-hover active:scale-[0.98]"
      @click="emit('action', { t: 'roll' })"
    >
      ارمِ النرد 🎲
    </button>

    <!-- Choose Forward vs Push Opponent + Decision Timer (Req #6) -->
    <div v-if="canChoose" class="mt-3 grid gap-2.5">
      <div v-if="view.total > 100" class="space-y-1">
        <div class="flex items-center justify-between text-xs font-extrabold">
          <span class="text-ink/80">⏱️ وقت اختيار الحركة</span>
          <span :class="remSec <= 3 ? 'text-bad' : 'text-accent'">{{ ar(remSec) }} ث</span>
        </div>
        <div class="h-2.5 overflow-hidden rounded-full bg-line">
          <div
            class="h-full transition-[width] duration-100 ease-linear"
            :class="remSec <= 3 ? 'bg-bad' : 'bg-accent'"
            :style="{ width: barPct + '%' }"
          />
        </div>
      </div>

      <button
        v-if="view.canFwd"
        type="button"
        class="min-h-13 w-full cursor-pointer rounded-2xl bg-accent px-4 text-lg font-extrabold text-accent-ink transition hover:bg-accent-hover active:scale-[0.98]"
        @click="emit('action', { t: 'move', dir: 'fwd' })"
      >
        ⬆️ تقدم للأمام (+{{ ar(view.dice) }} خانات)
      </button>

      <button
        v-else
        type="button"
        class="min-h-12 w-full cursor-pointer rounded-2xl border-2 border-line bg-bg px-4 text-base font-extrabold text-ink transition hover:border-accent"
        @click="emit('action', { t: 'move', dir: 'skip' })"
      >
        تخطي الدور (الرقم أكبر من المتبقي)
      </button>

      <div v-if="view.targets.length" class="grid gap-2">
        <span class="text-sm font-extrabold text-ink/85">أو اختر خصمًا لإرجاعه للخلف:</span>
        <button
          v-for="tg in view.targets"
          :key="tg.i"
          type="button"
          class="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-line bg-bg px-3 text-base font-extrabold text-ink transition hover:border-accent hover:bg-accent-soft"
          @click="emit('action', { t: 'move', dir: 'back', target: tg.i })"
        >
          <i class="inline-block h-3.5 w-3.5 rounded-full" :style="{ backgroundColor: tg.color }" />
          إرجاع {{ tg.emoji }} {{ tg.name }} (−{{ ar(view.dice) }} من خانة {{ ar(tg.pos) }})
        </button>
      </div>
    </div>

    <!-- Power-Up Cards -->
    <div v-if="view.cards.length" class="mt-2.5 flex flex-wrap gap-1.5">
      <button
        v-for="(c, ci) in view.cards"
        :key="c + '-' + ci"
        type="button"
        :disabled="!isCardUsable(c)"
        class="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-xl border-2 border-line bg-card px-3 text-sm font-extrabold text-ink transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-45"
        @click="emit('action', { t: 'card', c })"
      >
        {{ cardLabel(c) }}
      </button>
    </div>

    <!-- Active Question -->
    <div v-if="view.q" class="mt-2">
      <div
        v-if="view.q.fig"
        class="grid place-items-center text-ink"
        v-html="view.q.fig"
      />
      <div
        :dir="view.q.kind === 'geo' ? 'rtl' : 'ltr'"
        class="my-2 text-center"
        :class="
          view.q.kind === 'geo'
            ? 'text-xl font-extrabold leading-snug'
            : 'font-display text-5xl leading-tight'
        "
      >
        {{ view.q.text }}
      </div>

      <!-- Countdown Progress Bar + Remaining Seconds -->
      <div class="mb-1 flex items-center justify-between text-xs font-extrabold">
        <span class="text-ink/75">
          {{ view.moveMode === 'speed' ? '⚡ أجب أسرع لخطوات أكثر' : '⏱️ الوقت المتبقي' }}
        </span>
        <span :class="remSec <= 3 && !view.reveal ? 'text-bad' : 'text-accent'">
          {{ ar(remSec) }} ث
        </span>
      </div>
      <div class="h-2.5 overflow-hidden rounded-full bg-line">
        <div
          class="h-full transition-[width] duration-100 ease-linear"
          :class="remSec <= 3 && !view.reveal ? 'bg-bad' : 'bg-accent'"
          :style="{ width: barPct + '%' }"
        />
      </div>

      <!-- 4 Answer Options -->
      <div class="mt-2.5 grid grid-cols-2 gap-2.5">
        <button
          v-for="(opt, idx) in view.q.opts"
          :key="idx"
          type="button"
          :disabled="view.out || !!view.reveal || sentQid === view.qid"
          class="min-h-16 cursor-pointer rounded-2xl border-2 px-2 transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-65"
          :class="[
            optClass(opt, idx),
            isArabicText(opt) ? 'text-lg font-extrabold leading-tight' : 'font-display text-3xl',
          ]"
          @click="submitAnswer(idx)"
        >
          {{ opt }}
        </button>
      </div>
    </div>

    <!-- Status Message -->
    <p class="mt-2.5 min-h-[1.5em] text-center text-base font-extrabold text-ink" aria-live="polite">
      {{
        view.msg ||
        ((view.phase === 'ready' || view.phase === 'roll' || view.phase === 'choose') && !view.turn
          ? `بانتظار ${view.cur}`
          : '')
      }}
    </p>

    <!-- Live Reactions (Online Mode) -->
    <div v-if="view.online" class="mt-2.5 flex justify-between gap-1.5">
      <button
        v-for="e in REACT"
        :key="e"
        type="button"
        :aria-label="`تفاعل ${e}`"
        class="min-h-10.5 flex-1 cursor-pointer rounded-xl border-2 border-line bg-card text-xl transition hover:border-accent active:scale-95"
        @click="emit('action', { t: 'react', e })"
      >
        {{ e }}
      </button>
    </div>
  </div>
</template>
