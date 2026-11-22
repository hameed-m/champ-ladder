<script setup lang="ts">
import { computed, ref } from 'vue';
import MatchSettingsPanel from '@/components/MatchSettingsPanel.vue';
import PlayerAvatar from '@/components/PlayerAvatar.vue';
import { ARENAS, COLORS, RULES } from '@/constants/game';
import { useGameStore } from '@/stores/game';
import { useWorkspaceStore } from '@/stores/workspace';
import { ar } from '@/utils/format';

const ws = useWorkspaceStore();
const game = useGameStore();

const showSettingsDrawer = ref(false);
const startErr = ref('');

const s = computed(() => ws.currentSettings);
const formattedCode = computed(() => game.roomCode.replace(/(...)(...)/, '$1 $2'));
const activeArenaTitle = computed(
  () => (ARENAS.find((a) => a[0] === (s.value.arena || 'classic')) || ARENAS[0]!)[1],
);
const activeRulesCount = computed(() => RULES.filter(([k]) => s.value[k] !== false).length);

function fallbackToLocal() {
  ws.currentSettings.mode = 'device';
  ws.save();
  game.toMenu();
}

function handleStartFromLobby() {
  startErr.value = '';
  if (!s.value.topics.length) {
    startErr.value = 'اختر موضوعًا واحدًا على الأقل من إعدادات المباراة.';
    showSettingsDrawer.value = true;
    return;
  }
  if ((s.value.topics.includes('mul') || s.value.topics.includes('div')) && !s.value.tables.length) {
    startErr.value = 'اختر جدولًا واحدًا على الأقل من إعدادات المباراة.';
    showSettingsDrawer.value = true;
    return;
  }
  game.startGame();
}
</script>

<template>
  <section class="mx-auto max-w-3xl rounded-2xl border-2 border-line bg-card p-5 shadow-sm">
    <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="font-display text-3xl text-ink">غرفة الانتظار</h2>
        <span class="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-ink">
          🏠 {{ ws.currentRoom.name }}
        </span>
      </div>

      <!-- Waiting Room Settings Button (Req #14) -->
      <button
        type="button"
        class="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border-2 border-accent bg-accent-soft px-3.5 text-sm font-extrabold text-ink transition hover:bg-accent hover:text-accent-ink"
        @click="showSettingsDrawer = true"
      >
        ⚙️ إعدادات المباراة
      </button>
    </div>

    <p class="mb-3 text-sm text-ink/80">
      امسح الرمز بكاميرا كل جهاز، أو افتح رابط اللعبة واكتب رمز المباراة (من ١ إلى ٦ لاعبين).
    </p>

    <!-- Live Match Settings Summary Bar -->
    <div class="mb-4 flex flex-wrap gap-1.5 text-xs font-bold">
      <span class="rounded-full border border-line bg-bg px-2.5 py-1">📐 {{ ar(s.size) }}×{{ ar(s.size) }}</span>
      <span class="rounded-full border border-line bg-bg px-2.5 py-1">
        {{ s.moveMode === 'speed' ? '⚡ سرعة الإجابة' : '🎲 النرد' }}
      </span>
      <span class="rounded-full border border-line bg-bg px-2.5 py-1">{{ activeArenaTitle }}</span>
      <span class="rounded-full border border-line bg-bg px-2.5 py-1">🎮 {{ ar(activeRulesCount) }} قواعد</span>
      <span class="rounded-full border border-line bg-bg px-2.5 py-1">
        {{ s.clientAudio !== false ? '📱🔊 أصوات اللاعبين مفعّلة' : '📱🔇 أصوات اللاعبين صامتة' }}
      </span>
    </div>

    <div class="mb-4 grid gap-4 sm:grid-cols-[260px_1fr]">
      <!-- QR Code Box -->
      <div
        aria-label="رمز QR للانضمام"
        class="mx-auto grid aspect-square w-full max-w-[260px] place-items-center overflow-hidden rounded-2xl bg-white p-2 shadow-xs"
      >
        <div
          v-if="game.lobbyQrSvg"
          class="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
          v-html="game.lobbyQrSvg"
        />
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
            v-for="(seat, i) in game.seats"
            :key="seat.token || seat.pid"
            class="flex items-center gap-2 py-2"
          >
            <PlayerAvatar
              :avatar="ws.findProfile(seat.pid)?.emoji || '🦁'"
              size="sm"
              :ring-color="COLORS[i % COLORS.length]"
            />
            <b class="flex-1 text-base font-extrabold">
              {{ ws.findProfile(seat.pid)?.name || 'لاعب' }}
            </b>
            <small v-if="!game.live(seat)" class="text-xs text-bad">منقطع</small>
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

    <p v-if="startErr" role="alert" class="mb-2 text-center text-sm font-extrabold text-bad">
      {{ startErr }}
    </p>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        :disabled="!game.seats.length"
        class="min-h-12 flex-1 cursor-pointer rounded-2xl bg-accent px-5 text-lg font-extrabold text-accent-ink transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleStartFromLobby"
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

    <!-- Waiting Room Full Settings Modal/Drawer (Req #14) -->
    <div
      v-if="showSettingsDrawer"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      @click.self="showSettingsDrawer = false"
    >
      <div class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-3xl border-2 border-line bg-card shadow-2xl sm:rounded-2xl">
        <div class="flex items-center justify-between border-b-2 border-line px-4 py-3">
          <div>
            <h3 class="font-display text-2xl text-ink">⚙️ تعديل إعدادات المباراة</h3>
            <small class="text-xs text-ink/75">تُحفظ التعديلات فورًا دون إخراج اللاعبين المنضمين.</small>
          </div>
          <button
            type="button"
            class="grid h-9 w-9 cursor-pointer place-items-center rounded-xl border-2 border-line bg-bg text-sm font-extrabold text-ink hover:border-accent"
            @click="showSettingsDrawer = false"
          >
            ✕
          </button>
        </div>

        <div class="overflow-y-auto p-4">
          <MatchSettingsPanel :include-appearance-and-audio="true" />
        </div>

        <div class="border-t-2 border-line p-3">
          <button
            type="button"
            class="min-h-12 w-full cursor-pointer rounded-2xl bg-accent px-5 text-base font-extrabold text-accent-ink transition hover:bg-accent-hover"
            @click="showSettingsDrawer = false"
          >
            ✓ تم — العودة لغرفة الانتظار
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
