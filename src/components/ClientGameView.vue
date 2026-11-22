<script setup lang="ts">
import { computed, ref } from 'vue';
import ArenaBoard from '@/components/ArenaBoard.vue';
import AvatarPickerModal from '@/components/AvatarPickerModal.vue';
import ControllerPanel from '@/components/ControllerPanel.vue';
import PlayerAvatar from '@/components/PlayerAvatar.vue';
import { avatarDisplayText } from '@/constants/avatars';
import { CARD } from '@/constants/game';
import { useClientStore } from '@/stores/client';
import { ar } from '@/utils/format';

const client = useClientStore();
const v = computed(() => client.viewData);
const avatarModalOpen = ref(false);

const currentAvatar = computed(() => v.value?.emoji || client.waitAvatar || '🦁');

const fsHudLeft = computed(() =>
  v.value ? `${avatarDisplayText(v.value.emoji)} ${v.value.name} (خانة ${ar(v.value.pos)}/${ar(v.value.last)})` : '',
);
const fsHudCenter = computed(() =>
  v.value ? (v.value.turn ? '🎯 دورك الآن!' : `دور ${v.value.cur}`) : '',
);
const fsHudRight = computed(() => {
  if (!v.value) return '';
  const icon = v.value.moveMode === 'speed' ? '⚡' : '🎲';
  return `${icon} ${v.value.dice ? ar(v.value.dice) : '-'}`;
});
</script>

<template>
  <section class="mx-auto max-w-6xl">
    <!-- Connection Status Warning -->
    <div v-if="client.statusText" role="status" class="mb-2 text-center text-sm font-extrabold text-bad">
      {{ client.statusText }}
    </div>

    <!-- Waiting Room Screen with Self-Service Avatar Customization (Req #1) -->
    <div
      v-if="client.waitName && !v"
      class="mx-auto max-w-xl rounded-2xl border-2 border-line bg-card p-6 text-center shadow-sm"
    >
      <div class="mb-3 flex flex-col items-center gap-2">
        <button
          type="button"
          class="group relative cursor-pointer rounded-full p-1 ring-2 ring-accent/50 transition hover:scale-105 hover:ring-accent"
          aria-label="تغيير شخصيتك"
          @click="avatarModalOpen = true"
        >
          <PlayerAvatar :avatar="client.waitAvatar" size="xl" />
          <span
            class="absolute -bottom-1 -end-1 grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-accent text-xs text-accent-ink shadow-xs"
          >
            ✏️
          </span>
        </button>
        <p class="text-xl font-bold text-ink">
          مرحبًا <b>{{ client.waitName }}</b>! بانتظار بدء المباراة…
        </p>
        <button
          type="button"
          class="mt-1 min-h-10 cursor-pointer rounded-xl border-2 border-accent bg-accent-soft px-4 text-sm font-extrabold text-ink transition hover:bg-accent hover:text-accent-ink"
          @click="avatarModalOpen = true"
        >
          🎭 تغيير الأفاتار
        </button>
      </div>
    </div>

    <!-- Active Player Screen (Compact Stats + Question on Top + Hideable Arena) -->
    <div v-else-if="v">
      <!-- Compact Self Strip + Local Audio + Toggle Arena Button -->
      <div class="mb-1.5 flex items-center justify-between gap-1.5">
        <div class="flex min-w-0 flex-1 items-center gap-2 rounded-xl border-2 border-line bg-card px-2.5 py-1.5">
          <button
            type="button"
            title="اضغط لتغيير شخصيتك"
            aria-label="تغيير شخصيتك"
            class="relative shrink-0 cursor-pointer rounded-full transition hover:scale-105"
            @click="avatarModalOpen = true"
          >
            <PlayerAvatar :avatar="v.emoji" size="sm" :ring-color="v.color" />
            <span
              class="absolute -bottom-0.5 -end-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-card text-[8px] shadow-xs"
            >
              ✏️
            </span>
          </button>
          <div class="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <b class="truncate text-sm font-extrabold">{{ v.name }}</b>
            <small class="text-xs text-ink/75">
              المركز {{ ar(v.rank) }}/{{ ar(v.n) }} · خانة {{ ar(v.pos) }}/{{ ar(v.last)
              }}{{ v.streak > 1 ? ` · 🔥${ar(v.streak)}` : '' }}
            </small>
          </div>
          <strong class="ps-1 font-display text-2xl leading-none text-accent">
            {{ ar(v.score) }}
          </strong>
        </div>

        <!-- Local Sound Toggle when Admin Allows Player Audio (Req #22) -->
        <button
          v-if="v.clientAudio !== false"
          type="button"
          aria-label="كتم أو تشغيل الصوت على جهازي"
          :aria-pressed="!client.localMuted"
          class="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border-2 border-line bg-card text-base transition hover:border-accent"
          :class="client.localMuted ? 'opacity-55' : ''"
          @click="client.toggleLocalMuted()"
        >
          {{ client.localMuted ? '🔇' : '🔊' }}
        </button>
        <span
          v-else
          title="الصوت متوقف من المشرف"
          class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-line bg-bg text-sm opacity-50"
        >
          🔇
        </span>

        <button
          type="button"
          :aria-expanded="!client.arenaHidden"
          class="min-h-10 shrink-0 cursor-pointer whitespace-nowrap rounded-xl border-2 border-accent px-2.5 text-xs font-extrabold transition"
          :class="client.arenaHidden ? 'bg-accent text-accent-ink' : 'bg-card text-ink'"
          @click="client.toggleArena()"
        >
          {{
            client.arenaHidden
              ? `🗺️ إظهار (${ar(v.pos)}/${ar(v.last)})`
              : '🗺️ إخفاء الساحة'
          }}
        </button>
      </div>

      <!-- Compact Scoreboard Pills for All Players -->
      <div class="mb-2 flex flex-wrap gap-1.5">
        <div
          v-for="p in v.players"
          :key="p.i"
          class="flex items-center gap-1.5 rounded-lg border bg-card px-2 py-1 text-xs"
          :class="p.turn ? 'border-accent ring-2 ring-accent/35' : 'border-line'"
        >
          <PlayerAvatar :avatar="p.emoji" size="xs" :ring-color="p.color" />
          <b class="font-extrabold">{{ p.name }}</b>
          <small class="text-ink/75">
            خانة {{ ar(p.pos) }} · {{ ar(p.score) }}ن
            <span v-if="p.cards?.length">{{ p.cards.map((c) => CARD[c][0]).join('') }}</span>
          </small>
        </div>
      </div>

      <!-- Play Grid: Question/Controls FIRST so mobile players NEVER scroll -->
      <div
        class="grid items-start gap-2.5"
        :class="
          client.arenaHidden
            ? 'mx-auto max-w-2xl grid-cols-1'
            : 'grid-cols-1 md:grid-cols-[0.95fr_1.05fr]'
        "
      >
        <div class="rounded-2xl border-2 border-line bg-card p-3.5 shadow-sm">
          <ControllerPanel :view="v" @action="client.sendAction($event)" />
        </div>

        <ArenaBoard
          v-if="!client.arenaHidden"
          :board="v.board"
          :players="v.players"
          :fx="client.floatingFx"
          :effect="v.boardEffect"
          :fs-hud-left="fsHudLeft"
          :fs-hud-center="fsHudCenter"
          :fs-hud-right="fsHudRight"
        />
      </div>
    </div>

    <AvatarPickerModal
      :open="avatarModalOpen"
      :current="currentAvatar"
      title="اختر شخصيتك (الأفاتار)"
      @close="avatarModalOpen = false"
      @select="client.changeAvatar($event)"
    />
  </section>
</template>
