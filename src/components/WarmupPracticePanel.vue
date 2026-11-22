<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { SFX } from '@/services/audio';
import { generateQuestion } from '@/services/questions';
import type { Question, WarmupConfig } from '@/types/game';
import { ar } from '@/utils/format';

const props = defineProps<{
  config: WarmupConfig;
  muted?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const currentQ = ref<Question | null>(null);
const pickedIdx = ref<number | null>(null);
const correctCount = ref(0);
const totalCount = ref(0);
const streak = ref(0);
const recentKeys: string[] = [];
let nextTimer = 0;

function loadNextQuestion() {
  clearTimeout(nextTimer);
  pickedIdx.value = null;
  currentQ.value = generateQuestion(
    {
      level: props.config.level,
      topics: props.config.topics.length ? props.config.topics : ['mul'],
      tables: props.config.tables.length ? props.config.tables : [1, 2, 3, 4, 5, 6, 7, 8, 9],
    },
    recentKeys,
  );
}

function submitPracticeAnswer(idx: number) {
  if (!currentQ.value || pickedIdx.value !== null) return;
  pickedIdx.value = idx;
  totalCount.value++;
  const ok = currentQ.value.opts[idx] === currentQ.value.ans;
  if (ok) {
    correctCount.value++;
    streak.value++;
    if (!props.muted) SFX.ok();
  } else {
    streak.value = 0;
    if (!props.muted) SFX.bad();
  }
  nextTimer = window.setTimeout(loadNextQuestion, ok ? 800 : 1400);
}

function optClass(opt: string, idx: number): string {
  if (pickedIdx.value !== null && currentQ.value) {
    if (opt === currentQ.value.ans) return 'bg-ok text-white border-ok';
    if (idx === pickedIdx.value) return 'bg-bad text-white border-bad';
  }
  return 'bg-bg text-ink border-line hover:border-accent';
}

const isArabicText = (s: string) => /[ء-ي]/.test(s);

watch(
  () => [props.config.level, props.config.topics.join(','), props.config.tables.join(',')],
  () => {
    if (pickedIdx.value === null) loadNextQuestion();
  },
);

onMounted(loadNextQuestion);
onUnmounted(() => clearTimeout(nextTimer));
</script>

<template>
  <div class="mt-4 rounded-2xl border-2 border-accent/50 bg-bg p-4 text-center shadow-xs">
    <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-1.5 text-xs font-extrabold">
        <span class="rounded-full bg-accent px-2.5 py-0.5 text-accent-ink">🔥 وضع الإحماء</span>
        <span class="rounded-full border border-line bg-card px-2 py-0.5 text-ink">
          ✅ {{ ar(correctCount) }}/{{ ar(totalCount) }}
        </span>
        <span v-if="streak > 1" class="rounded-full border border-warn/50 bg-card px-2 py-0.5 text-warn">
          🔥 {{ ar(streak) }}
        </span>
      </div>

      <button
        type="button"
        class="min-h-8 cursor-pointer rounded-xl border-2 border-line bg-card px-2.5 text-xs font-extrabold text-ink transition hover:border-accent"
        @click="emit('close')"
      >
        إيقاف الإحماء
      </button>
    </div>

    <p class="mb-2 text-xs font-bold text-ink/70">
      تدريب حر قبل صافرة البداية — لا يؤثر على نقاط أو إحصائيات المباراة.
    </p>

    <div v-if="currentQ">
      <div v-if="currentQ.fig" class="grid place-items-center text-ink" v-html="currentQ.fig" />
      <div
        :dir="currentQ.kind === 'geo' ? 'rtl' : 'ltr'"
        class="my-2 text-center"
        :class="
          currentQ.kind === 'geo'
            ? 'text-xl font-extrabold leading-snug'
            : 'font-display text-5xl leading-tight'
        "
      >
        {{ currentQ.text }}
      </div>

      <div class="mt-3 grid grid-cols-2 gap-2.5">
        <button
          v-for="(opt, idx) in currentQ.opts"
          :key="idx"
          type="button"
          :disabled="pickedIdx !== null"
          class="min-h-15 cursor-pointer rounded-2xl border-2 px-2 transition active:scale-[0.97] disabled:cursor-not-allowed"
          :class="[
            optClass(opt, idx),
            isArabicText(opt) ? 'text-lg font-extrabold leading-tight' : 'font-display text-3xl',
          ]"
          @click="submitPracticeAnswer(idx)"
        >
          {{ opt }}
        </button>
      </div>

      <p
        v-if="pickedIdx !== null"
        class="mt-2.5 text-sm font-extrabold"
        :class="currentQ.opts[pickedIdx] === currentQ.ans ? 'text-ok' : 'text-bad'"
      >
        {{
          currentQ.opts[pickedIdx] === currentQ.ans
            ? 'أحسنت! 🎉'
            : `الإجابة الصحيحة: ${currentQ.show}`
        }}
      </p>
    </div>
  </div>
</template>
