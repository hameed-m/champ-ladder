<script setup lang="ts">
import { computed, ref } from 'vue';
import PlayerAvatar from '@/components/PlayerAvatar.vue';
import { APP_TITLE_AR } from '@/constants/game';
import { useGameStore } from '@/stores/game';
import { ar } from '@/utils/format';

const game = useGameStore();
const copyLabel = ref('نسخ النتيجة');

const resultText = computed(() => {
  return (
    `نتيجة لعبة ${APP_TITLE_AR} 🏆\n` +
    `🥇 الفائز: ${game.winnerName}\n` +
    game.rankings
      .map(
        (x, i) =>
          `${ar(i + 1)}. ${x.name}: ${ar(x.score)} نقطة، ${ar(x.correct)} من ${ar(x.correct + x.wrong)} صحيحة`,
      )
      .join('\n')
  );
});

async function copyResult() {
  try {
    await navigator.clipboard.writeText(resultText.value);
    copyLabel.value = 'تم النسخ ✓';
    setTimeout(() => {
      copyLabel.value = 'نسخ النتيجة';
    }, 2000);
  } catch {
    copyLabel.value = 'حدّد النص وانسخه يدويًا';
  }
}
</script>

<template>
  <div
    v-if="game.showEndModal"
    class="fixed inset-0 z-50 grid place-items-center overflow-auto bg-black/65 p-4 backdrop-blur-xs"
  >
    <div class="w-full max-w-md rounded-2xl border-2 border-line bg-card p-5 shadow-2xl">
      <h2 class="mb-2 text-center font-display text-4xl text-ink">
        🏆 {{ game.winnerName }} يفوز!
      </h2>

      <ol class="mb-3.5 list-none divide-y divide-line p-0">
        <li
          v-for="x in game.rankings"
          :key="x.rank + x.name"
          class="flex items-center gap-2 py-2"
        >
          <PlayerAvatar :avatar="x.emoji" size="sm" :ring-color="x.color" />
          <b class="font-extrabold">{{ x.name }}</b>
          <span class="ms-auto text-sm text-ink/80">
            {{ ar(x.score) }} نقطة، {{ ar(x.correct) }} من {{ ar(x.correct + x.wrong) }} صحيحة
          </span>
        </li>
      </ol>

      <textarea
        readonly
        rows="5"
        aria-label="نص النتيجة"
        :value="resultText"
        class="w-full resize-none rounded-xl border-2 border-line bg-bg p-2.5 text-sm text-ink"
      />

      <button
        type="button"
        class="my-2.5 min-h-12 w-full cursor-pointer rounded-2xl bg-accent px-5 text-base font-extrabold text-accent-ink transition hover:bg-accent-hover"
        @click="copyResult"
      >
        {{ copyLabel }}
      </button>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="min-h-12 flex-1 cursor-pointer rounded-2xl bg-accent px-4 text-base font-extrabold text-accent-ink transition hover:bg-accent-hover"
          @click="game.startGame()"
        >
          العب مرة أخرى
        </button>
        <button
          type="button"
          class="min-h-12 flex-1 cursor-pointer rounded-2xl border-2 border-line bg-bg px-4 text-base font-extrabold text-ink transition hover:border-accent"
          @click="game.toMenu()"
        >
          إعدادات جديدة
        </button>
      </div>
    </div>
  </div>
</template>
