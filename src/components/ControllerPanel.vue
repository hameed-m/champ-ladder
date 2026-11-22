<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import PlayerAvatar from '@/components/PlayerAvatar.vue';
import { CARD, CARD_DESC, REACT } from '@/constants/game';
import type { BoardPlayerView, CardType, ClientActionMessage, ClientViewMessage } from '@/types/game';
import { ar } from '@/utils/format';

const props = defineProps<{
  view: ClientViewMessage;
}>();

const emit = defineEmits<{
  (e: 'action', payload: ClientActionMessage): void;
}>();

const sentQid = ref<number | null>(null);
const pendingTargetCard = ref<'freeze' | 'swap_pos' | null>(null);
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

const opponents = computed<BoardPlayerView[]>(() =>
  (props.view.players || []).filter((p) => p.i !== props.view.selfIndex),
);

watch(
  () => [props.view.phase, props.view.turn, props.view.cards.join(',')],
  () => {
    if (
      pendingTargetCard.value &&
      (!props.view.turn ||
        (props.view.phase !== 'ready' && props.view.phase !== 'roll') ||
        !props.view.cards.includes(pendingTargetCard.value))
    ) {
      pendingTargetCard.value = null;
    }
  },
);

function isCardUsable(c: CardType): boolean {
  if (!props.view.turn || props.view.paused) return false;
  if (c === 'freeze') {
    return (props.view.phase === 'ready' || props.view.phase === 'roll') && opponents.value.length > 0;
  }
  if (c === 'swap_pos') {
    return (props.view.phase === 'ready' || props.view.phase === 'roll') && opponents.value.length > 0;
  }
  if (c === 'boost') {
    return (
      (props.view.phase === 'ready' || props.view.phase === 'roll') &&
      props.view.pos + 3 <= props.view.last
    );
  }
  if (c === 'double') {
    return props.view.moveMode === 'speed'
      ? props.view.phase === 'ready' || props.view.phase === 'q'
      : props.view.phase === 'roll';
  }
  if (c === 'swap') return props.view.phase === 'q' && !props.view.reveal;
  if (c === 'extratime') return props.view.phase === 'q' && !props.view.reveal;
  if (c === 'fifty') {
    return (
      props.view.phase === 'q' &&
      !props.view.reveal &&
      !(props.view.q?.eliminatedOpts && props.view.q.eliminatedOpts.length > 0)
    );
  }
  return false;
}

function handleCardClick(c: CardType) {
  if (!isCardUsable(c)) return;
  if (c === 'freeze' || c === 'swap_pos') {
    pendingTargetCard.value = pendingTargetCard.value === c ? null : c;
    return;
  }
  pendingTargetCard.value = null;
  emit('action', { t: 'card', c });
}

function confirmCardTarget(targetIdx: number) {
  const c = pendingTargetCard.value;
  if (!c) return;
  pendingTargetCard.value = null;
  emit('action', { t: 'card', c, target: targetIdx });
}

function cardLabel(c: CardType): string {
  if (c === 'double' && props.view.moveMode === 'speed') return '⚡ خطوات مضاعفة';
  return `${CARD[c][0]} ${CARD[c][1]}`;
}

function isOptionEliminated(idx: number): boolean {
  return !!props.view.q?.eliminatedOpts?.includes(idx);
}

function submitAnswer(idx: number) {
  if (
    !props.view.qid ||
    sentQid.value === props.view.qid ||
    props.view.out ||
    props.view.reveal ||
    isOptionEliminated(idx)
  ) {
    return;
  }
  sentQid.value = props.view.qid;
  emit('action', { t: 'answer', i: idx, id: props.view.qid });
}

function optClass(opt: string, idx: number): string {
  const rev = props.view.reveal;
  if (rev) {
    if (opt === rev.ans) return 'bg-ok text-white border-ok';
    if (idx === rev.pick) return 'bg-bad text-white border-bad';
  }
  if (isOptionEliminated(idx)) {
    return 'bg-bg/40 text-ink/30 border-dashed border-line line-through opacity-35';
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
          <PlayerAvatar :avatar="view.emoji" size="sm" :ring-color="view.color" />
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
          <PlayerAvatar :avatar="tg.emoji" size="xs" :ring-color="tg.color" />
          <span>
            إرجاع {{ tg.name }} (−{{ ar(view.dice) }} من خانة {{ ar(tg.pos) }}){{ tg.mirrored ? ' 🪞' : '' }}{{ tg.shielded ? ' 🛡️' : '' }}
          </span>
        </button>
      </div>
    </div>

    <!-- Power-Up Cards (9 Cards, Max 4) -->
    <div v-if="view.cards.length" class="mt-2.5 space-y-2">
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="(c, ci) in view.cards"
          :key="c + '-' + ci"
          type="button"
          :title="CARD_DESC[c]"
          :disabled="!isCardUsable(c)"
          class="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-xl border-2 px-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-45"
          :class="
            pendingTargetCard === c
              ? 'border-accent bg-accent text-accent-ink ring-2 ring-accent/40'
              : 'border-line bg-card text-ink hover:border-accent'
          "
          @click="handleCardClick(c)"
        >
          {{ cardLabel(c) }}
        </button>
      </div>

      <!-- Inline Opponent Picker for Targeted Power-Ups (Freeze & Position Swap) -->
      <div
        v-if="pendingTargetCard && opponents.length"
        class="rounded-2xl border-2 border-accent bg-accent-soft/60 p-2.5"
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <span class="text-xs font-extrabold text-ink">
            {{
              pendingTargetCard === 'freeze'
                ? '❄️ اختر الخصم الذي تريد تجميد وقته:'
                : '🔀 اختر الخصم الذي تريد تبادل مركزك معه:'
            }}
          </span>
          <button
            type="button"
            class="min-h-7 cursor-pointer rounded-lg border border-line bg-card px-2 text-xs font-extrabold text-ink hover:border-accent"
            @click="pendingTargetCard = null"
          >
            إلغاء
          </button>
        </div>

        <div class="grid gap-1.5">
          <button
            v-for="opp in opponents"
            :key="opp.i"
            type="button"
            class="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border-2 border-line bg-card px-3 text-sm font-extrabold text-ink transition hover:border-accent hover:bg-accent-soft"
            @click="confirmCardTarget(opp.i)"
          >
            <span class="flex items-center gap-2">
              <PlayerAvatar :avatar="opp.emoji" size="xs" :ring-color="opp.color" />
              <span>{{ opp.name }}</span>
              <span v-if="opp.frozen" class="text-xs">❄️</span>
            </span>
            <span class="text-xs font-bold text-ink/75">
              خانة {{ ar(opp.pos) }}
              {{ pendingTargetCard === 'swap_pos' && opp.pos > view.pos ? '⬆️' : '' }}
            </span>
          </button>
        </div>
      </div>
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
          :disabled="view.out || !!view.reveal || sentQid === view.qid || isOptionEliminated(idx)"
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
