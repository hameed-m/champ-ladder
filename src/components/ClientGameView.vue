<script setup lang="ts">
import { computed } from 'vue';
import ArenaBoard from '@/components/ArenaBoard.vue';
import ControllerPanel from '@/components/ControllerPanel.vue';
import { useClientStore } from '@/stores/client';
import { ar } from '@/utils/format';

const client = useClientStore();
const v = computed(() => client.viewData);

const fsHudLeft = computed(() =>
  v.value ? `${v.value.emoji} ${v.value.name} (خانة ${ar(v.value.pos)}/${ar(v.value.last)})` : '',
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

    <!-- Waiting Room Screen -->
    <div
      v-if="client.waitName && !v"
      class="mx-auto max-w-xl rounded-2xl border-2 border-line bg-card p-6 text-center shadow-sm"
    >
      <p class="text-xl font-bold text-ink">
        مرحبًا <b>{{ client.waitName }}</b>! بانتظار بدء المباراة…
      </p>
    </div>

    <!-- Active Player Screen (Compact Stats + Question on Top + Hideable Arena) -->
    <div v-else-if="v">
      <!-- Compact Self Strip + Local Audio + Toggle Arena Button -->
      <div class="mb-1.5 flex items-center justify-between gap-1.5">
        <div class="flex min-w-0 flex-1 items-center gap-2 rounded-xl border-2 border-line bg-card px-2.5 py-1.5">
          <span
            class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-base text-white"
            :style="{ backgroundColor: v.color }"
          >
            {{ v.emoji }}
          </span>
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
          <i class="inline-block h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: p.color }" />
          <b class="font-extrabold">{{ p.emoji }} {{ p.name }}</b>
          <small class="text-ink/75">خانة {{ ar(p.pos) }} · {{ ar(p.score) }}ن</small>
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
          :fs-hud-left="fsHudLeft"
          :fs-hud-center="fsHudCenter"
          :fs-hud-right="fsHudRight"
        />
      </div>
    </div>
  </section>
</template>
