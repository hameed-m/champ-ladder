<script setup lang="ts">
import { computed } from 'vue';
import { COLORS } from '@/constants/game';
import { useGameStore } from '@/stores/game';
import { useWorkspaceStore } from '@/stores/workspace';

const ws = useWorkspaceStore();
const game = useGameStore();

const formattedCode = computed(() => game.roomCode.replace(/(...)(...)/, '$1 $2'));

function fallbackToLocal() {
  ws.currentSettings.mode = 'device';
  ws.save();
  game.toMenu();
}
</script>

<template>
  <section class="mx-auto max-w-3xl rounded-2xl border-2 border-line bg-card p-5 shadow-sm">
    <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
      <h2 class="font-display text-3xl text-ink">غرفة الانتظار</h2>
      <span class="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-ink">
        🏠 {{ ws.currentRoom.name }}
      </span>
    </div>

    <p class="mb-4 text-sm text-ink/80">
      امسح الرمز بكاميرا كل جهاز، أو افتح رابط اللعبة واكتب رمز المباراة (من ١ إلى ٦ لاعبين).
    </p>

    <div class="mb-4 grid gap-4 sm:grid-cols-[260px_1fr]">
      <!-- QR Code Box -->
      <div
        aria-label="رمز QR للانضمام"
        class="mx-auto grid aspect-square w-full max-w-[260px] place-items-center overflow-hidden rounded-2xl bg-white p-2 shadow-xs"
      >
        <div v-if="game.lobbyQrSvg" class="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full" v-html="game.lobbyQrSvg" />
        <span v-else class="text-sm font-bold text-neutral-500">جارٍ توليد الرمز…</span>
      </div>

      <!-- Code & Connected Seats -->
      <div>
        <div dir="ltr" class="text-center font-display text-5xl tracking-widest text-ink">
          {{ formattedCode }}
        </div>
        <p v-if="game.netMsg" class="mt-1 text-center text-sm font-bold text-ink/75">
          {{ game.netMsg }}
        </p>

        <ul class="mt-3 list-none divide-y divide-line p-0">
          <li
            v-for="(s, i) in game.seats"
            :key="s.token || s.pid"
            class="flex items-center gap-2 py-2"
          >
            <i class="inline-block h-3.5 w-3.5 rounded-full" :style="{ backgroundColor: COLORS[i % COLORS.length] }" />
            <b class="flex-1 text-base font-extrabold">
              {{ ws.findProfile(s.pid)?.emoji || '🦁' }} {{ ws.findProfile(s.pid)?.name || 'لاعب' }}
            </b>
            <small v-if="!game.live(s)" class="text-xs text-bad">منقطع</small>
            <button
              type="button"
              class="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border-2 border-line bg-bg text-xs font-extrabold text-ink hover:border-bad hover:text-bad"
              @click="game.kickSeat(i)"
            >
              ✕
            </button>
          </li>
          <li v-if="!game.seats.length" class="py-3 text-center text-sm text-ink/70">
            بانتظار انضمام اللاعبين (من ١ إلى ٦ لاعبين)…
          </li>
        </ul>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        :disabled="!game.seats.length"
        class="min-h-12 flex-1 cursor-pointer rounded-2xl bg-accent px-5 text-lg font-extrabold text-accent-ink transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        @click="game.startGame()"
      >
        ابدأ المباراة 🚀
      </button>
      <button
        type="button"
        class="min-h-12 flex-1 cursor-pointer rounded-2xl border-2 border-line bg-bg px-5 text-base font-extrabold text-ink transition hover:border-accent"
        @click="game.toMenu()"
      >
        رجوع
      </button>
      <button
        v-if="game.canFallbackLocal"
        type="button"
        class="min-h-12 flex-1 cursor-pointer rounded-2xl border-2 border-line bg-bg px-5 text-base font-extrabold text-ink transition hover:border-accent"
        @click="fallbackToLocal"
      >
        العب على هذا الجهاز
      </button>
    </div>
  </section>
</template>
