<script setup lang="ts">
import { computed, ref } from 'vue';
import ArenaBoard from '@/components/ArenaBoard.vue';
import AvatarPickerModal from '@/components/AvatarPickerModal.vue';
import ControllerPanel from '@/components/ControllerPanel.vue';
import PlayerAvatar from '@/components/PlayerAvatar.vue';
import { avatarDisplayText } from '@/constants/avatars';
import { APP_TITLE_AR, ARENAS, CARD } from '@/constants/game';
import { captionText, crowdOn, muted, setCrowdOn, setMuted } from '@/services/audio';
import { useGameStore } from '@/stores/game';
import { useWorkspaceStore } from '@/stores/workspace';
import { ar } from '@/utils/format';

const game = useGameStore();
const ws = useWorkspaceStore();
const avatarEditIdx = ref<number | null>(null);

const editingPlayer = computed(() =>
  avatarEditIdx.value !== null ? game.players[avatarEditIdx.value] || null : null,
);

function onSelectAvatar(avatarId: string) {
  if (avatarEditIdx.value !== null) {
    game.changePlayerAvatar(avatarEditIdx.value, avatarId);
  }
}

const arenaTitle = computed(
  () => (ARENAS.find((a) => a[0] === game.board.arena) || ARENAS[0]!)[1],
);

const timerPct = computed(() =>
  Math.max(0, Math.min(100, (game.left / (game.total || 1)) * 100)),
);

const remSec = computed(() => Math.ceil(Math.max(0, game.left) / 1000));

const showHostTimer = computed(
  () =>
    game.phase === 'q' ||
    !!game.raceState ||
    (game.phase === 'choose' && game.total > 100),
);

const curDisconnected = computed(() => {
  const p = game.currentPlayer;
  return game.mode === 'online' && !!p && !game.connected(p);
});

const hostTitle = computed(() => {
  if (game.paused) return '⏸ اللعب متوقف';
  if (game.raceState) return game.raceState.title;
  if (curDisconnected.value && game.currentPlayer) {
    return `${game.currentPlayer.name} منقطع، بانتظار عودته`;
  }
  return '';
});

const hostMessage = computed(() => {
  if (game.msg) return game.msg;
  const name = game.currentPlayer?.name || '';
  if (game.phase === 'ready') return `${name} يستعد لعرض السؤال من جهازه`;
  if (game.phase === 'roll') return `${name} يرمي النرد من جهازه`;
  if (game.phase === 'choose') return `${name} يختار التقدم أو إرجاع خصم`;
  return '';
});

const fsHudLeft = computed(() => {
  const p = game.currentPlayer;
  return p ? `دور ${avatarDisplayText(p.emoji)} ${p.name} (خانة ${ar(p.pos)}/${ar(game.lastSquare)})` : '';
});

const fsHudCenter = computed(() => {
  const icon = ws.currentSettings.moveMode === 'speed' ? '⚡' : '🎲';
  return `${icon} ${game.animDice || game.dice ? ar(game.animDice || game.dice) : '-'}`;
});
</script>

<template>
  <section>
    <!-- Top Controls Bar -->
    <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="font-display text-2xl text-ink">{{ APP_TITLE_AR }}</h2>
        <span class="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-ink">
          {{ arenaTitle }}
        </span>
      </div>

      <div class="ms-auto flex flex-wrap items-center gap-2">
        <!-- Admin Toggle for Players' Device Audio (Req #22) -->
        <button
          v-if="game.mode === 'online'"
          type="button"
          title="تشغيل أو إيقاف الصوت على أجهزة اللاعبين"
          :aria-pressed="ws.currentSettings.clientAudio !== false"
          class="min-h-10 cursor-pointer rounded-xl border-2 px-3 text-xs font-extrabold transition"
          :class="
            ws.currentSettings.clientAudio !== false
              ? 'border-accent bg-accent-soft text-ink'
              : 'border-line bg-card text-ink/65'
          "
          @click="game.toggleClientAudio()"
        >
          {{ ws.currentSettings.clientAudio !== false ? '📱🔊 أصوات اللاعبين' : '📱🔇 أصوات اللاعبين' }}
        </button>

        <button
          type="button"
          aria-label="صوت الجمهور"
          :aria-pressed="crowdOn"
          class="min-h-10 cursor-pointer rounded-xl border-2 border-line bg-card px-3 text-base font-extrabold transition hover:border-accent"
          :class="crowdOn ? '' : 'opacity-50'"
          @click="setCrowdOn(!crowdOn)"
        >
          📣
        </button>
        <button
          type="button"
          aria-label="كل الأصوات"
          :aria-pressed="!muted"
          class="min-h-10 cursor-pointer rounded-xl border-2 border-line bg-card px-3 text-base font-extrabold transition hover:border-accent"
          :class="muted ? 'opacity-50' : ''"
          @click="setMuted(!muted)"
        >
          {{ muted ? '🔇' : '🔊' }}
        </button>
        <button
          type="button"
          class="min-h-10 cursor-pointer rounded-xl border-2 border-line bg-card px-3 text-sm font-extrabold text-ink transition hover:border-accent"
          @click="game.toMenu()"
        >
          قائمة البداية
        </button>
      </div>
    </div>

    <!-- Players Scoreboard -->
    <div class="mb-2.5 flex flex-wrap gap-2">
      <div
        v-for="p in game.boardPlayers"
        :key="p.i"
        class="flex min-w-32 flex-1 items-center gap-2 rounded-xl border-2 bg-card px-2.5 py-2 transition"
        :class="[
          p.turn ? 'border-accent ring-2 ring-accent/35' : 'border-line',
          p.off ? 'border-dashed opacity-55' : '',
        ]"
      >
        <button
          type="button"
          :title="`تغيير أفاتار ${p.name}`"
          class="shrink-0 cursor-pointer rounded-full transition hover:scale-105"
          @click="avatarEditIdx = p.i"
        >
          <PlayerAvatar :avatar="p.emoji" size="sm" :ring-color="p.color" />
        </button>
        <div class="min-w-0">
          <b class="block truncate text-sm font-extrabold">{{ p.name }}</b>
          <small class="block text-xs text-ink/75">
            {{ p.off ? 'منقطع، ' : '' }}{{ ar(p.score) }} نقطة، خانة {{ ar(p.pos) }}
            <span v-if="p.cards?.length">
              {{ p.cards.map((c) => CARD[c][0]).join('') }}
            </span>
          </small>
        </div>
      </div>
    </div>

    <!-- Main Play Area -->
    <div class="grid items-start gap-3 md:grid-cols-[1.1fr_0.9fr]">
      <!-- SVG Arena Board -->
      <ArenaBoard
        :board="game.board"
        :players="game.boardPlayers"
        :fx="game.floatingFx"
        :effect="game.boardEffect"
        :show-quick-arena="true"
        :fs-hud-left="fsHudLeft"
        :fs-hud-center="fsHudCenter"
        :fs-hud-right="game.msg"
        @change-arena="game.changeLiveArena($event)"
      />

      <!-- Right Card: Online Host Display OR Local Controller -->
      <div class="rounded-2xl border-2 border-line bg-card p-4 shadow-sm">
        <!-- Online Host Display -->
        <div v-if="game.mode === 'online'">
          <div class="flex items-center justify-between gap-2.5">
            <b v-if="game.currentPlayer" class="flex items-center gap-2 text-xl font-extrabold">
              <PlayerAvatar :avatar="game.currentPlayer.emoji" size="sm" :ring-color="game.currentPlayer.color" />
              دور {{ game.currentPlayer.name }}
            </b>
            <div
              class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-[3px] border-accent bg-bg font-display text-3xl text-ink"
              aria-live="polite"
            >
              {{
                game.animDice || game.dice
                  ? ar(game.animDice || game.dice)
                  : ws.currentSettings.moveMode === 'speed'
                    ? '⚡'
                    : '🎲'
              }}
            </div>
          </div>

          <div v-if="hostTitle" class="mt-2 text-center text-base font-extrabold text-accent">
            {{ hostTitle }}
          </div>

          <!-- Active Question Preview on Host Screen -->
          <div v-if="!game.raceState && game.phase === 'q' && game.q" class="my-2">
            <div v-if="game.q.fig" class="grid place-items-center text-ink" v-html="game.q.fig" />
            <div
              :dir="game.q.kind === 'geo' ? 'rtl' : 'ltr'"
              class="my-2 text-center"
              :class="
                game.q.kind === 'geo'
                  ? 'text-xl font-extrabold leading-snug'
                  : 'font-display text-5xl leading-tight'
              "
            >
              {{ game.q.text }}
            </div>
          </div>

          <p v-else-if="game.raceState" class="my-2 text-center text-sm font-bold text-ink/80">
            {{
              game.raceState.ids
                .map(
                  (id) =>
                    `${avatarDisplayText(game.players[id]?.emoji)} ${game.players[id]?.name || ''}${
                      game.raceState?.out.includes(id) ? ' ✕' : ''
                    }`,
                )
                .join(' · ')
            }}
          </p>

          <!-- Timer Bar (Question, Race, AND Movement Decision) -->
          <div v-if="showHostTimer" class="mt-2 space-y-1">
            <div class="flex items-center justify-between text-xs font-extrabold">
              <span class="text-ink/75">
                {{ game.phase === 'choose' ? '⏱️ وقت قرار الحركة' : '⏱️ الوقت المتبقي' }}
              </span>
              <span :class="remSec <= 3 ? 'text-bad' : 'text-accent'">{{ ar(remSec) }} ث</span>
            </div>
            <div class="h-2.5 overflow-hidden rounded-full bg-line">
              <div
                class="h-full transition-[width] duration-100 ease-linear"
                :class="remSec <= 3 ? 'bg-bad' : 'bg-accent'"
                :style="{ width: timerPct + '%' }"
              />
            </div>
          </div>

          <!-- Status Message -->
          <p
            class="mt-3 min-h-[1.5em] text-center text-base font-extrabold"
            :class="
              game.msgKind === 'ok' ? 'text-ok' : game.msgKind === 'bad' ? 'text-bad' : 'text-ink'
            "
            aria-live="polite"
          >
            {{ hostMessage }}
          </p>
        </div>

        <!-- Local One-Device Controller -->
        <ControllerPanel
          v-else-if="game.localControllerView"
          :view="game.localControllerView"
          @action="game.act(game.cur, $event)"
        />

        <!-- Commentator Caption -->
        <p v-if="captionText" class="mt-2 text-center text-sm font-medium text-ink/80">
          {{ captionText }}
        </p>

        <!-- Admin Controls -->
        <div class="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-2.5">
          <span class="mb-1 block w-full text-xs font-extrabold text-ink/75">تحكم المشرف</span>
          <button
            type="button"
            class="min-h-9 cursor-pointer rounded-xl border-2 border-line bg-bg px-3 text-xs font-extrabold text-ink transition hover:border-accent"
            @click="game.togglePause()"
          >
            {{ game.paused ? '▶ متابعة' : '⏸ إيقاف' }}
          </button>
          <button
            type="button"
            :disabled="game.phase !== 'q'"
            class="min-h-9 cursor-pointer rounded-xl border-2 border-line bg-bg px-3 text-xs font-extrabold text-ink transition hover:border-accent disabled:opacity-45"
            @click="game.newQuestion()"
          >
            🔄 سؤال جديد
          </button>
          <button
            type="button"
            class="min-h-9 cursor-pointer rounded-xl border-2 border-line bg-bg px-3 text-xs font-extrabold text-ink transition hover:border-accent"
            @click="game.skipTurn()"
          >
            ⏭ تخطي الدور
          </button>
          <button
            v-if="game.anyDisconnected"
            type="button"
            class="min-h-9 cursor-pointer rounded-xl border-2 border-line bg-bg px-3 text-xs font-extrabold text-ink transition hover:border-accent"
            @click="game.switchToLocal()"
          >
            أكمل على هذا الجهاز
          </button>
        </div>
      </div>
    </div>

    <AvatarPickerModal
      :open="avatarEditIdx !== null"
      :current="editingPlayer?.emoji || '🦁'"
      :title="editingPlayer ? `اختر أفاتار ${editingPlayer.name}` : 'اختر الأفاتار'"
      @close="avatarEditIdx = null"
      @select="onSelectAvatar"
    />
  </section>
</template>
