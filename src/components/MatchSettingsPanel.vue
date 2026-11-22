<script setup lang="ts">
import { computed } from 'vue';
import ThemeColorPicker from '@/components/ThemeColorPicker.vue';
import {
  ALLT,
  ARENAS,
  DECISION_TIMES,
  FAIR,
  LEVELS,
  MOVE_MODES,
  RULES,
  SIZES,
  TOPICS,
} from '@/constants/game';
import { useWorkspaceStore } from '@/stores/workspace';
import type { ArenaId } from '@/types/game';
import { ar } from '@/utils/format';

defineProps<{
  includeAppearanceAndAudio?: boolean;
}>();

const ws = useWorkspaceStore();
const s = computed(() => ws.currentSettings);
const showPerPlayerOwn = computed(() => s.value.fair === 'each' || s.value.fair === 'both');
const showTables = computed(() => s.value.topics.includes('mul') || s.value.topics.includes('div'));

function selectArena(id: ArenaId) {
  s.value.arena = id;
  ws.save();
}
</script>

<template>
  <div class="space-y-3">
    <!-- Board Size -->
    <div class="rounded-2xl border-2 border-line bg-bg p-3.5">
      <span class="block text-base font-extrabold text-ink">📐 حجم الساحة</span>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="sz in SIZES"
          :key="sz"
          type="button"
          :aria-pressed="s.size === sz"
          class="min-h-11 cursor-pointer rounded-xl border-2 px-4 text-base font-extrabold transition"
          :class="
            s.size === sz
              ? 'border-accent bg-accent text-accent-ink shadow-xs'
              : 'border-line bg-card text-ink hover:border-accent'
          "
          @click="s.size = sz; ws.save()"
        >
          {{ ar(sz) }}×{{ ar(sz) }}
        </button>
      </div>
    </div>

    <!-- Steps Movement Mode (Req #7) -->
    <div class="rounded-2xl border-2 border-line bg-bg p-3.5">
      <span class="block text-base font-extrabold text-ink">🏃 نظام خطوات الحركة</span>
      <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          v-for="[mKey, mTitle, mDesc] in MOVE_MODES"
          :key="mKey"
          type="button"
          :aria-pressed="s.moveMode === mKey"
          class="flex cursor-pointer flex-col items-start gap-1 rounded-xl border-2 p-3 text-right transition"
          :class="
            s.moveMode === mKey
              ? 'border-accent bg-accent text-accent-ink shadow-xs'
              : 'border-line bg-card text-ink hover:border-accent'
          "
          @click="s.moveMode = mKey; ws.save()"
        >
          <b class="text-base font-extrabold">{{ mTitle }}</b>
          <small class="text-xs leading-snug opacity-85">{{ mDesc }}</small>
        </button>
      </div>
    </div>

    <!-- Movement Decision Timer (Req #6) -->
    <div v-if="s.pushback !== false" class="rounded-2xl border-2 border-line bg-bg p-3.5">
      <span class="block text-base font-extrabold text-ink">⏱️ مؤقت قرار الحركة (التقدم أو إرجاع خصم)</span>
      <p class="mt-0.5 text-xs text-ink/75">
        عند انتهاء الوقت يتقدم اللاعب تلقائيًا للأمام (أو يُتخطى الدور إذا تجاوز النهاية).
      </p>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="[sec, label] in DECISION_TIMES"
          :key="sec"
          type="button"
          :aria-pressed="s.decisionTime === sec"
          class="min-h-10 cursor-pointer rounded-xl border-2 px-3.5 text-sm font-extrabold transition"
          :class="
            s.decisionTime === sec
              ? 'border-accent bg-accent text-accent-ink shadow-xs'
              : 'border-line bg-card text-ink hover:border-accent'
          "
          @click="s.decisionTime = sec; ws.save()"
        >
          {{ label }}
        </button>
      </div>
    </div>

    <!-- Toggleable Game Rules -->
    <div class="rounded-2xl border-2 border-line bg-bg p-3.5">
      <span class="block text-base font-extrabold text-ink">
        🎮 قواعد اللعب (اضغط لتفعيل أو إيقاف أي قاعدة)
      </span>
      <p class="mt-0.5 text-xs text-ink/75">القواعد المفعّلة تظهر باللون المميز وعلامة ✓</p>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="[rKey, rLabel] in RULES"
          :key="rKey"
          type="button"
          :aria-pressed="s[rKey] !== false"
          class="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border-2 px-3.5 text-base font-extrabold transition"
          :class="
            s[rKey] !== false
              ? 'border-accent bg-accent text-accent-ink shadow-xs'
              : 'border-line bg-card text-ink opacity-80 hover:border-accent'
          "
          @click="ws.toggleRule(rKey)"
        >
          <span>{{ rLabel }}</span>
          <span class="text-xs opacity-90">{{ s[rKey] !== false ? '✓' : '✕' }}</span>
        </button>

        <button
          type="button"
          :aria-pressed="s.warmup !== false"
          title="يسمح للاعبين بحل أسئلة تدريبية في غرفة الانتظار قبل بدء المباراة"
          class="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border-2 px-3.5 text-base font-extrabold transition"
          :class="
            s.warmup !== false
              ? 'border-accent bg-accent text-accent-ink shadow-xs'
              : 'border-line bg-card text-ink opacity-80 hover:border-accent'
          "
          @click="s.warmup = !(s.warmup !== false); ws.save()"
        >
          <span>🔥 إحماء غرفة الانتظار</span>
          <span class="text-xs opacity-90">{{ s.warmup !== false ? '✓' : '✕' }}</span>
        </button>
      </div>
    </div>

    <!-- Fairness & Difficulty (Req #8) -->
    <div class="rounded-2xl border-2 border-line bg-bg p-3.5">
      <span class="block text-base font-extrabold text-ink">⚖️ عدالة المنافسة</span>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="[fKey, fLabel] in FAIR"
          :key="fKey"
          type="button"
          :aria-pressed="s.fair === fKey"
          class="min-h-11 cursor-pointer rounded-xl border-2 px-3.5 text-sm font-extrabold transition"
          :class="
            s.fair === fKey
              ? 'border-accent bg-accent text-accent-ink'
              : 'border-line bg-card text-ink hover:border-accent'
          "
          @click="s.fair = fKey; ws.save()"
        >
          {{ fLabel }}
        </button>
      </div>

      <span class="mt-3 block text-base font-extrabold text-ink">
        {{ showPerPlayerOwn ? 'المستوى للجميع (ويمكن تخصيصه لكل لاعب)' : 'المستوى' }}
      </span>
      <p class="mt-0.5 text-xs text-ink/75">
        يزداد وقت السؤال تلقائيًا حسب صعوبته (ومدة إضافية للمسائل المركبة والأشكال الهندسية).
      </p>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="(lv, idx) in LEVELS"
          :key="idx"
          type="button"
          :aria-pressed="s.level === idx"
          class="min-h-11 cursor-pointer rounded-xl border-2 px-4 text-base font-extrabold transition"
          :class="
            s.level === idx
              ? 'border-accent bg-accent text-accent-ink'
              : 'border-line bg-card text-ink hover:border-accent'
          "
          @click="ws.setLevel(idx)"
        >
          {{ lv[0] }} ({{ ar(lv[1]) }}ث+)
        </button>
      </div>
    </div>

    <!-- Topics & Tables -->
    <div class="rounded-2xl border-2 border-line bg-bg p-3.5">
      <span class="block text-base font-extrabold text-ink">📚 موضوعات الأسئلة (اختر موضوعًا أو أكثر)</span>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="[tKey, tLabel] in TOPICS"
          :key="tKey"
          type="button"
          :aria-pressed="s.topics.includes(tKey)"
          class="min-h-11 cursor-pointer rounded-xl border-2 px-3.5 text-base font-extrabold transition"
          :class="
            s.topics.includes(tKey)
              ? 'border-accent bg-accent text-accent-ink'
              : 'border-line bg-card text-ink hover:border-accent'
          "
          @click="ws.toggleTopic(tKey)"
        >
          {{ tLabel }}
        </button>
      </div>

      <div v-if="showTables" class="mt-3">
        <span class="block text-base font-extrabold text-ink">✖️ الجداول (للضرب والقسمة)</span>
        <div class="mt-2 flex flex-wrap gap-2">
          <button
            v-for="tNum in ALLT"
            :key="tNum"
            type="button"
            :aria-pressed="s.tables.includes(tNum)"
            class="min-h-11 min-w-11 cursor-pointer rounded-xl border-2 text-lg font-extrabold transition"
            :class="
              s.tables.includes(tNum)
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line bg-card text-ink hover:border-accent'
            "
            @click="ws.toggleTable(tNum)"
          >
            {{ ar(tNum) }}
          </button>
        </div>
      </div>
    </div>

    <!-- Optional Appearance & Players' Audio (shown in Waiting Room Drawer) -->
    <template v-if="includeAppearanceAndAudio">
      <div class="rounded-2xl border-2 border-line bg-bg p-3.5">
        <span class="block text-base font-extrabold text-ink">🗺️ تصميم الساحة</span>
        <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            v-for="[id, title, desc, swatches] in ARENAS"
            :key="id"
            type="button"
            :aria-pressed="s.arena === id"
            class="flex cursor-pointer flex-col items-start gap-1 rounded-xl border-2 p-2.5 text-right transition"
            :class="
              s.arena === id
                ? 'border-accent bg-accent-soft ring-2 ring-accent'
                : 'border-line bg-card hover:border-accent'
            "
            @click="selectArena(id)"
          >
            <div class="flex w-full items-center justify-between gap-2">
              <b class="text-sm font-extrabold text-ink">{{ title }}</b>
              <span class="flex gap-1">
                <i
                  v-for="(hex, hi) in swatches"
                  :key="hi"
                  class="inline-block h-3 w-3 rounded-sm border border-white/40"
                  :style="{ backgroundColor: hex }"
                />
              </span>
            </div>
            <small class="text-xs leading-snug text-ink/75">{{ desc }}</small>
          </button>
        </div>
      </div>

      <div class="rounded-2xl border-2 border-line bg-bg p-3.5">
        <span class="mb-2 block text-base font-extrabold text-ink">🎨 لون التطبيق</span>
        <ThemeColorPicker :compact="true" :sync-to-room="true" />
      </div>

      <div class="rounded-2xl border-2 border-line bg-bg p-3.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span class="block text-base font-extrabold text-ink">📱 أصوات أجهزة اللاعبين</span>
            <small class="text-xs text-ink/75">تشغيل المؤثرات وصوت المعلّق على هواتف اللاعبين.</small>
          </div>
          <button
            type="button"
            :aria-pressed="s.clientAudio !== false"
            class="min-h-10 cursor-pointer rounded-xl border-2 px-4 text-sm font-extrabold transition"
            :class="
              s.clientAudio !== false
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line bg-card text-ink'
            "
            @click="s.clientAudio = !(s.clientAudio !== false); ws.save()"
          >
            {{ s.clientAudio !== false ? '🔊 مفعّل ✓' : '🔇 متوقف ✕' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
