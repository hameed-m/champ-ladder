<script setup lang="ts">
import { computed } from 'vue';
import { TOPICS } from '@/constants/game';
import { useWorkspaceStore } from '@/stores/workspace';
import { ar } from '@/utils/format';

const ws = useWorkspaceStore();
const topicMap = Object.fromEntries(TOPICS);

const p = computed(() => ws.reportPlayer);

const topicRows = computed(() => {
  if (!p.value) return [];
  return Object.entries(p.value.st.t)
    .map(([k, v]) => {
      const total = v[0] + v[1];
      const pct = total ? Math.round((v[0] / total) * 100) : 0;
      return { key: k, label: topicMap[k] || k, pct, total };
    })
    .sort((a, b) => a.pct - b.pct);
});

const tableRows = computed(() => {
  if (!p.value) return [];
  return Object.entries(p.value.st.tb)
    .map(([k, v]) => {
      const total = v[0] + v[1];
      const pct = total ? Math.round((v[0] / total) * 100) : 0;
      return { key: k, label: 'جدول ' + ar(k), pct, total };
    })
    .sort((a, b) => a.pct - b.pct);
});

const missRows = computed(() => {
  if (!p.value) return [];
  return Object.entries(p.value.st.miss)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
});
</script>

<template>
  <div
    v-if="p"
    class="fixed inset-0 z-50 grid place-items-center overflow-auto bg-black/65 p-4 backdrop-blur-xs"
    @click.self="ws.reportPlayer = null"
  >
    <div class="max-h-[88vh] w-full max-w-md overflow-auto rounded-2xl border-2 border-line bg-card p-5 shadow-2xl">
      <h2 class="mb-2 text-center font-display text-3xl text-ink">
        {{ p.emoji }} تقرير {{ p.name }}
      </h2>

      <p class="mb-3 text-center text-sm font-bold text-ink/80">
        {{ ar(p.games) }} مباراة، {{ ar(p.wins) }} فوز، وأعلى نتيجة {{ ar(p.best) }} نقطة.
      </p>

      <div v-if="topicRows.length" class="mb-3">
        <span class="block text-sm font-extrabold text-ink">الموضوعات (الأضعف أولًا)</span>
        <ul class="mt-1 list-none divide-y divide-line p-0">
          <li v-for="r in topicRows" :key="r.key" class="flex flex-wrap items-center justify-between gap-1 py-2">
            <b class="text-sm">{{ r.label }}</b>
            <span class="text-xs font-bold text-ink/75">{{ ar(r.pct) }}٪ من {{ ar(r.total) }}</span>
            <div class="h-2 w-full overflow-hidden rounded-full bg-line">
              <div class="h-full bg-accent" :style="{ width: r.pct + '%' }" />
            </div>
          </li>
        </ul>
      </div>
      <p v-else class="mb-3 text-center text-sm text-ink/70">لا توجد إجابات مسجلة بعد.</p>

      <div v-if="tableRows.length" class="mb-3">
        <span class="block text-sm font-extrabold text-ink">الجداول (الأضعف أولًا)</span>
        <ul class="mt-1 list-none divide-y divide-line p-0">
          <li v-for="r in tableRows" :key="r.key" class="flex flex-wrap items-center justify-between gap-1 py-2">
            <b class="text-sm">{{ r.label }}</b>
            <span class="text-xs font-bold text-ink/75">{{ ar(r.pct) }}٪ من {{ ar(r.total) }}</span>
            <div class="h-2 w-full overflow-hidden rounded-full bg-line">
              <div class="h-full bg-accent" :style="{ width: r.pct + '%' }" />
            </div>
          </li>
        </ul>
      </div>

      <div v-if="missRows.length" class="mb-3">
        <span class="block text-sm font-extrabold text-ink">أكثر الأسئلة خطأً</span>
        <ul class="mt-1 list-none divide-y divide-line p-0">
          <li v-for="[qText, cnt] in missRows" :key="qText" class="flex items-center justify-between py-1.5 text-sm">
            <b dir="auto">{{ qText }}</b>
            <span class="text-xs font-bold text-bad">{{ ar(cnt) }} مرة</span>
          </li>
        </ul>
      </div>

      <button
        type="button"
        class="mt-3 min-h-11 w-full cursor-pointer rounded-2xl border-2 border-line bg-bg px-4 text-base font-extrabold text-ink transition hover:border-accent"
        @click="ws.reportPlayer = null"
      >
        إغلاق
      </button>
    </div>
  </div>
</template>
