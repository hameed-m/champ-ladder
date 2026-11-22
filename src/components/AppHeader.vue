<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import ThemeColorPicker from '@/components/ThemeColorPicker.vue';
import { APP_TITLE_AR, APP_TITLE_EN } from '@/constants/game';
import { oklchPreviewColor, useThemeStore } from '@/stores/theme';
import { useWorkspaceStore } from '@/stores/workspace';

const theme = useThemeStore();
const ws = useWorkspaceStore();

const pickerOpen = ref(false);
const popoverRef = ref<HTMLElement | null>(null);

const currentDotColor = computed(() => oklchPreviewColor(theme.hue, theme.vivid, theme.dark));
const isHostSetup = computed(() => ws.isAuthed && (ws.view === 'setup' || ws.view === 'lobby'));

function onDocClick(e: MouseEvent) {
  if (!pickerOpen.value) return;
  if (popoverRef.value && !popoverRef.value.contains(e.target as Node)) {
    pickerOpen.value = false;
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') pickerOpen.value = false;
}

onMounted(() => {
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <header
    class="relative mb-3 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border-2 border-line bg-card px-3.5 py-2 shadow-sm"
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

      <!-- Compact Analog Color Picker Trigger + Popover -->
      <div ref="popoverRef" class="relative">
        <button
          type="button"
          :aria-expanded="pickerOpen"
          aria-label="تغيير ألوان التطبيق"
          class="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 text-xs font-extrabold transition"
          :class="
            pickerOpen
              ? 'border-accent bg-accent-soft text-ink'
              : 'border-line bg-bg text-ink hover:border-accent'
          "
          @click.stop="pickerOpen = !pickerOpen"
        >
          <span
            class="h-4 w-4 rounded-full border border-white/70 shadow-xs"
            :style="{ backgroundColor: currentDotColor }"
          />
          <span>🎨 الألوان</span>
        </button>

        <!-- Floating Popover -->
        <div
          v-if="pickerOpen"
          class="absolute start-0 top-full z-40 mt-2 w-76 max-w-[calc(100vw-2rem)] rounded-2xl border-2 border-line bg-card p-3.5 shadow-2xl sm:start-auto sm:end-0"
        >
          <ThemeColorPicker :compact="true" :sync-to-room="isHostSetup" />
        </div>
      </div>

      <!-- Dark / Light Mode Toggle -->
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
