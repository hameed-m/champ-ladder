<script setup lang="ts">
import { APP_TITLE_AR, APP_TITLE_EN, THEMES } from '@/constants/game';
import { useThemeStore } from '@/stores/theme';
import { useWorkspaceStore } from '@/stores/workspace';
import type { ThemeColorId } from '@/types/game';

const theme = useThemeStore();
const ws = useWorkspaceStore();

function pickColor(col: ThemeColorId) {
  theme.setColor(col, true);
  if (ws.isAuthed) {
    ws.currentSettings.theme = col;
    ws.save();
  }
}
</script>

<template>
  <header
    class="mb-3 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border-2 border-line bg-card px-3.5 py-2 shadow-sm"
  >
    <div class="flex items-center gap-2.5">
      <span
        class="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-2xl leading-none"
        aria-hidden="true"
      >
        🏆
      </span>
      <div>
        <strong class="block font-display text-2xl font-normal leading-tight text-ink">
          {{ APP_TITLE_AR }}
        </strong>
        <small class="block text-xs leading-tight text-ink/70">
          {{ APP_TITLE_EN }}
        </small>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2" aria-label="تغيير ألوان التطبيق">
      <button
        v-if="theme.canInstall"
        type="button"
        class="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-xl bg-accent px-3 text-xs font-extrabold text-accent-ink transition hover:bg-accent-hover"
        @click="theme.installPwa()"
      >
        📲 تثبيت التطبيق
      </button>

      <div class="flex items-center gap-1.5">
        <button
          v-for="[id, label, hex] in THEMES"
          :key="id"
          type="button"
          class="h-6 w-6 cursor-pointer rounded-full border-2 border-card p-0 outline-2 transition-transform duration-150 hover:scale-110 focus-visible:outline-yellow-400"
          :class="theme.color === id ? 'scale-115 outline-ink' : 'outline-transparent'"
          :style="{ backgroundColor: hex }"
          :title="label"
          :aria-label="label"
          :aria-pressed="theme.color === id"
          @click="pickColor(id)"
        />
      </div>

      <button
        type="button"
        class="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-xl border-2 border-line bg-bg px-2 text-base transition hover:border-accent"
        title="تبديل الوضع الليلي/النهاري"
        aria-label="تبديل الوضع الليلي"
        :aria-pressed="theme.dark"
        @click="theme.toggleDark()"
      >
        {{ theme.dark ? '☀️' : '🌙' }}
      </button>
    </div>
  </header>
</template>
