<script setup lang="ts">
import { computed } from 'vue';
import { THEME_PRESETS } from '@/constants/game';
import { oklchPreviewColor, useThemeStore } from '@/stores/theme';
import { useWorkspaceStore } from '@/stores/workspace';
import { ar } from '@/utils/format';

const props = defineProps<{
  compact?: boolean;
  syncToRoom?: boolean;
}>();

const theme = useThemeStore();
const ws = useWorkspaceStore();

const rainbowTrack = computed(() => {
  const L = theme.dark ? 0.72 : 0.56;
  const C = 0.17;
  const stops = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360]
    .map((h) => `oklch(${L} ${C} ${h})`)
    .join(', ');
  return `linear-gradient(to right, ${stops})`;
});

const vividTrack = computed(() => {
  const from = oklchPreviewColor(theme.hue, 0, theme.dark);
  const to = oklchPreviewColor(theme.hue, 100, theme.dark);
  return `linear-gradient(to right, ${from}, ${to})`;
});

const activeSwatchColor = computed(() => oklchPreviewColor(theme.hue, theme.vivid, theme.dark));

const matchedPreset = computed(() =>
  THEME_PRESETS.find(
    (p) => Math.abs(p.hue - theme.hue) <= 3 && Math.abs(p.vivid - theme.vivid) <= 4,
  ),
);

function applyChange(hue: number, vivid: number) {
  theme.setConfig({ hue, vivid }, !props.syncToRoom);
  if (props.syncToRoom && ws.isAuthed) {
    ws.currentSettings.themeConfig = { hue: theme.hue, vivid: theme.vivid };
    theme.roomDefault = { hue: theme.hue, vivid: theme.vivid };
    ws.save();
  }
}

function onHueInput(e: Event) {
  const val = Number((e.target as HTMLInputElement).value);
  applyChange(val, theme.vivid);
}

function onVividInput(e: Event) {
  const val = Number((e.target as HTMLInputElement).value);
  applyChange(theme.hue, val);
}

function pickPreset(hue: number, vivid: number) {
  applyChange(hue, vivid);
}

function handleRandom() {
  const next = theme.randomize(!props.syncToRoom);
  if (props.syncToRoom && ws.isAuthed) {
    ws.currentSettings.themeConfig = { ...next };
    theme.roomDefault = { ...next };
    ws.save();
  }
}
</script>

<template>
  <div class="space-y-3">
    <!-- Live Preview Header -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span
          class="h-7 w-7 shrink-0 rounded-full border-2 border-card shadow-sm ring-2 ring-accent"
          :style="{ backgroundColor: activeSwatchColor }"
        />
        <div class="leading-tight">
          <b class="block text-sm font-extrabold text-ink">
            {{ matchedPreset ? matchedPreset.label : 'لون مخصّص' }}
          </b>
          <small class="text-[11px] font-bold text-ink/70">
            الدرجة {{ ar(theme.hue) }}° · التشبّع {{ ar(theme.vivid) }}٪
          </small>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          type="button"
          title="توليد لون عشوائي"
          class="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border-2 border-line bg-card px-2.5 text-xs font-extrabold text-ink transition hover:border-accent"
          @click="handleRandom"
        >
          🎲 عشوائي
        </button>
        <button
          v-if="compact"
          type="button"
          class="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border-2 border-line bg-card px-2.5 text-xs font-extrabold text-ink transition hover:border-accent"
          @click="theme.toggleDark()"
        >
          {{ theme.dark ? '☀️ نهاري' : '🌙 ليلي' }}
        </button>
      </div>
    </div>

    <!-- Smooth Analog Hue Slider (0–360°) -->
    <div class="space-y-1">
      <div class="flex items-center justify-between text-xs font-extrabold text-ink/80">
        <span>🌈 درجة اللون</span>
        <span dir="ltr">{{ ar(theme.hue) }}°</span>
      </div>
      <div class="relative flex h-8 items-center">
        <div
          class="pointer-events-none h-4 w-full rounded-full border border-black/15 shadow-inner"
          :style="{ background: rainbowTrack }"
        />
        <input
          type="range"
          dir="ltr"
          min="0"
          max="359"
          :value="theme.hue"
          aria-label="درجة اللون"
          class="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-md"
          @input="onHueInput"
        />
      </div>
    </div>

    <!-- Saturation / Vividness Slider (0–100%) -->
    <div class="space-y-1">
      <div class="flex items-center justify-between text-xs font-extrabold text-ink/80">
        <span>✨ حيوية وتشبع اللون</span>
        <span>{{ ar(theme.vivid) }}٪</span>
      </div>
      <div class="relative flex h-8 items-center">
        <div
          class="pointer-events-none h-3.5 w-full rounded-full border border-black/15 shadow-inner"
          :style="{ background: vividTrack }"
        />
        <input
          type="range"
          dir="ltr"
          min="0"
          max="100"
          :value="theme.vivid"
          aria-label="حيوية وتشبع اللون"
          class="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-5.5 [&::-moz-range-thumb]:w-5.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:h-5.5 [&::-webkit-slider-thumb]:w-5.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-md"
          @input="onVividInput"
        />
      </div>
    </div>

    <!-- 12 Curated Quick Preset Swatches -->
    <div class="space-y-1.5">
      <span class="block text-xs font-extrabold text-ink/80">🎨 ألوان جاهزة سريعة</span>
      <div
        class="grid gap-1.5"
        :class="compact ? 'grid-cols-6' : 'grid-cols-4 sm:grid-cols-6'"
      >
        <button
          v-for="p in THEME_PRESETS"
          :key="p.id"
          type="button"
          :title="p.label"
          :aria-label="p.label"
          :aria-pressed="matchedPreset?.id === p.id"
          class="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 p-1.5 transition"
          :class="
            matchedPreset?.id === p.id
              ? 'border-accent bg-accent-soft'
              : 'border-line bg-card hover:border-accent'
          "
          @click="pickPreset(p.hue, p.vivid)"
        >
          <span
            class="h-6 w-6 rounded-full border-2 border-white/70 shadow-xs"
            :style="{ backgroundColor: oklchPreviewColor(p.hue, p.vivid, theme.dark) }"
          />
          <span v-if="!compact" class="truncate text-[11px] font-bold text-ink">
            {{ p.label.split(' ')[0] }}
          </span>
        </button>
      </div>
    </div>

    <!-- Reset to Room Default Color (when player/user has overridden locally) -->
    <button
      v-if="!syncToRoom && theme.hasCustomOverride"
      type="button"
      class="min-h-9 w-full cursor-pointer rounded-xl border-2 border-line bg-bg px-3 text-xs font-extrabold text-ink transition hover:border-accent hover:bg-accent-soft"
      @click="theme.resetToRoomDefault()"
    >
      🔄 العودة للون الغرفة الافتراضي
    </button>
  </div>
</template>
