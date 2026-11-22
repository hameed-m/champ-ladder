<script setup lang="ts">
import { computed, ref } from 'vue';
import MatchSettingsPanel from '@/components/MatchSettingsPanel.vue';
import {
  ALLT,
  ARENAS,
  AUDIO_SLOTS,
  LEVELS,
  RULES,
  THEMES,
  TOPICS,
} from '@/constants/game';
import {
  comment,
  crowdFx,
  customSlotKeys,
  deleteCustomSlot,
  deviceVoices,
  ensureAC,
  loadedVoiceCount,
  preloadAudio,
  previewSlot,
  refreshArabicVoices,
  selectedDeviceVoice,
  speakDevice,
  uploadCustomSlot,
  whistle,
} from '@/services/audio';
import { useGameStore } from '@/stores/game';
import { useThemeStore } from '@/stores/theme';
import { useWorkspaceStore } from '@/stores/workspace';
import type { ArenaId, ThemeColorId } from '@/types/game';
import { ar, canNet } from '@/utils/format';

const ws = useWorkspaceStore();
const game = useGameStore();
const theme = useThemeStore();

const setupTab = ref<'room' | 'rules' | 'style'>('room');

/* Admin Management */
const newAdmEmail = ref('');
const newAdmPass = ref('');
const admMsg = ref('');
const admOk = ref(false);
const addingAdm = ref(false);

/* Room Management */
const newRoomName = ref('');
const roomMsg = ref('');
const roomOk = ref(false);
const confirmDelRoom = ref(false);
let delRoomTimer = 0;

/* Players */
const newPlayerName = ref('');
const confirmDelPlayerId = ref<string | null>(null);
const errMsg = ref('');
const voiceMsg = ref('');

const s = computed(() => ws.currentSettings);
const rm = computed(() => ws.currentRoom);
const showPerPlayerOwn = computed(() => s.value.fair === 'each' || s.value.fair === 'both');
const showTables = computed(() => s.value.topics.includes('mul') || s.value.topics.includes('div'));
const activeRulesCount = computed(() => RULES.filter(([k]) => s.value[k] !== false).length);
const activeArenaTitle = computed(
  () => (ARENAS.find((a) => a[0] === (s.value.arena || 'classic')) || ARENAS[0]!)[1],
);

async function handleAddAdmin() {
  addingAdm.value = true;
  const res = await ws.addAdmin(newAdmEmail.value, newAdmPass.value);
  addingAdm.value = false;
  admMsg.value = res.msg;
  admOk.value = res.ok;
  if (res.ok) {
    newAdmEmail.value = '';
    newAdmPass.value = '';
  }
}

function handleCreateRoom() {
  const nm = newRoomName.value.trim();
  if (!nm) {
    roomMsg.value = 'اكتب اسم الغرفة أولًا.';
    roomOk.value = false;
    return;
  }
  const created = ws.createRoom(nm);
  if (created) {
    newRoomName.value = '';
    roomMsg.value = `تم إنشاء الغرفة «${created.name}» برمز ${created.code}`;
    roomOk.value = true;
  }
}

function handleRenewCode() {
  const next = ws.renewRoomCode();
  roomMsg.value = `تم تجديد رمز الغرفة إلى ${next}`;
  roomOk.value = true;
}

function handleDeleteRoom() {
  if (!confirmDelRoom.value) {
    confirmDelRoom.value = true;
    clearTimeout(delRoomTimer);
    delRoomTimer = window.setTimeout(() => {
      confirmDelRoom.value = false;
    }, 3500);
    return;
  }
  confirmDelRoom.value = false;
  const res = ws.deleteCurrentRoom();
  if (!res.ok) {
    roomMsg.value = res.msg || 'تعذر الحذف.';
    roomOk.value = false;
  } else {
    roomMsg.value = 'تم حذف الغرفة.';
    roomOk.value = true;
  }
}

function handleAddPlayer() {
  const nm = newPlayerName.value.trim();
  if (!nm) return;
  ws.addProfile(nm);
  newPlayerName.value = '';
}

function handleDeletePlayer(id: string) {
  if (confirmDelPlayerId.value === id) {
    ws.deleteProfile(id);
    confirmDelPlayerId.value = null;
  } else {
    confirmDelPlayerId.value = id;
  }
}

async function handleImport(e: Event) {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  if (!f) return;
  const res = await ws.importBackup(f);
  errMsg.value = res.msg;
  input.value = '';
}

function selectArena(id: ArenaId) {
  s.value.arena = id;
  ws.save();
}

function selectTheme(id: ThemeColorId) {
  s.value.theme = id;
  theme.setColor(id, true);
  ws.save();
}

function handleTestVoice() {
  ensureAC();
  preloadAudio();
  const hasAr = refreshArabicVoices().length > 0;
  const nm = rm.value.profiles[0]?.name || '';
  whistle();
  crowdFx('cheer', 0.5);
  comment([{ i: 0, name: nm, named: !!nm }, 'correct'], null);
  const vc = loadedVoiceCount.value;
  voiceMsg.value =
    (vc ? `تم تجهيز ${ar(vc)} مقطعًا صوتيًا للمعلّق. ` : '') +
    (hasAr
      ? 'وجدت صوتًا عربيًا في جهازك، وسينطق الأسماء التي ليس لها مقطع خاص.'
      : 'لا يوجد صوت عربي في جهازك، لذلك سيقول المعلّق «اللاعب رقم واحد» للأسماء التي ليس لها مقطع خاص.') +
    ' إذا لم تسمع شيئًا، ارفع الصوت وألغِ الوضع الصامت.';
}

function onDeviceVoiceChange() {
  const nm = rm.value.profiles[0]?.name;
  if (nm) void speakDevice(nm);
}

async function handleSlotUpload(key: string, e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  errMsg.value = '';
  const res = await uploadCustomSlot(key, file);
  if (res.msg) errMsg.value = res.msg;
  input.value = '';
}

function handleStart() {
  errMsg.value = '';
  if (!s.value.topics.length) {
    setupTab.value = 'rules';
    errMsg.value = 'اختر موضوعًا واحدًا على الأقل.';
    return;
  }
  if (showTables.value && !s.value.tables.length) {
    setupTab.value = 'rules';
    errMsg.value = 'اختر جدولًا واحدًا على الأقل.';
    return;
  }
  ensureAC();
  preloadAudio();
  if (s.value.mode === 'multi') {
    game.openRoom(false);
    return;
  }
  const res = game.startLocalGame();
  if (!res.ok) {
    setupTab.value = 'room';
    errMsg.value = res.msg || '';
  }
}
</script>

<template>
  <div>
    <!-- Admin Header Bar -->
    <div class="mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-line bg-bg px-3 py-2.5">
      <div>
        <span class="block text-sm font-extrabold text-ink">👤 المشرف: {{ ws.session?.email }}</span>
        <small
          class="mt-0.5 block text-xs font-bold"
          :class="ws.cloudState === 'ok' ? 'text-ok' : 'text-ink/75'"
        >
          {{ ws.cloudText }}
        </small>
      </div>
      <button
        type="button"
        class="inline-flex min-h-9 cursor-pointer items-center rounded-xl border-2 border-line bg-card px-3 text-sm font-extrabold text-ink transition hover:border-accent"
        @click="ws.logout()"
      >
        تسجيل الخروج
      </button>
    </div>

    <!-- Collapsible Admin Accounts Manager -->
    <details class="mb-3 rounded-xl border-2 border-line bg-bg px-3 py-2">
      <summary class="min-h-8 cursor-pointer font-extrabold text-ink">👥 إدارة المشرفين</summary>
      <p class="mt-1.5 text-sm text-ink/75">
        يمكنك إضافة مشرفين آخرين ليستطيعوا تسجيل الدخول وإنشاء غرفهم ومبارياتهم الخاصة من أي جهاز.
      </p>
      <ul class="my-2 list-none divide-y divide-line p-0">
        <li
          v-for="a in ws.allAdmins"
          :key="a.email"
          class="flex items-center justify-between gap-2 py-1.5 text-sm"
        >
          <span class="flex items-center gap-2">
            <b>{{ a.email }}</b>
            <small v-if="a.root" class="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-ink">
              مشرف أساسي
            </small>
          </span>
          <button
            v-if="!a.root"
            type="button"
            class="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-2 border-line bg-card text-xs font-extrabold text-ink hover:border-bad hover:text-bad"
            :aria-label="`حذف المشرف ${a.email}`"
            @click="ws.removeAdmin(a.email)"
          >
            ✕
          </button>
        </li>
      </ul>
      <div class="my-2 grid gap-2 sm:grid-cols-2">
        <input
          v-model="newAdmEmail"
          type="email"
          dir="ltr"
          placeholder="البريد الإلكتروني للمشرف الجديد"
          class="min-h-11 rounded-xl border-2 border-line bg-card px-3 text-sm text-ink focus:border-accent focus:outline-none"
        />
        <input
          v-model="newAdmPass"
          type="password"
          dir="ltr"
          placeholder="كلمة المرور للمشرف الجديد"
          class="min-h-11 rounded-xl border-2 border-line bg-card px-3 text-sm text-ink focus:border-accent focus:outline-none"
        />
      </div>
      <p v-if="admMsg" class="mb-2 text-xs font-extrabold" :class="admOk ? 'text-ok' : 'text-bad'">
        {{ admMsg }}
      </p>
      <button
        type="button"
        :disabled="addingAdm"
        class="min-h-11 w-full cursor-pointer rounded-xl border-2 border-line bg-card text-sm font-extrabold text-ink transition hover:border-accent hover:bg-accent-soft"
        @click="handleAddAdmin"
      >
        إضافة مشرف
      </button>
    </details>

    <!-- 3 Organized Sub-Tabs -->
    <div class="my-3 grid grid-cols-3 gap-1.5 rounded-2xl border-2 border-line bg-bg p-1.5" role="tablist">
      <button
        type="button"
        role="tab"
        :aria-selected="setupTab === 'room'"
        class="min-h-10 cursor-pointer rounded-xl px-2 py-1.5 text-sm font-extrabold transition"
        :class="setupTab === 'room' ? 'bg-accent text-accent-ink shadow-xs' : 'text-ink hover:bg-accent-soft'"
        @click="setupTab = 'room'"
      >
        🏠 الغرفة واللاعبون
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="setupTab === 'rules'"
        class="min-h-10 cursor-pointer rounded-xl px-2 py-1.5 text-sm font-extrabold transition"
        :class="setupTab === 'rules' ? 'bg-accent text-accent-ink shadow-xs' : 'text-ink hover:bg-accent-soft'"
        @click="setupTab = 'rules'"
      >
        ⚙️ القواعد والأسئلة
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="setupTab === 'style'"
        class="min-h-10 cursor-pointer rounded-xl px-2 py-1.5 text-sm font-extrabold transition"
        :class="setupTab === 'style' ? 'bg-accent text-accent-ink shadow-xs' : 'text-ink hover:bg-accent-soft'"
        @click="setupTab = 'style'"
      >
        🎨 المظهر والصوت
      </button>
    </div>

    <!-- TAB 1: Room & Players -->
    <div v-if="setupTab === 'room'" class="space-y-3">
      <!-- Room Card -->
      <div class="rounded-2xl border-2 border-line bg-bg p-3.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-base font-extrabold text-ink">🏠 الغرفة الحالية</span>
          <span class="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-ink">
            غرفة: {{ rm.name }} · الرمز: {{ rm.code }}
          </span>
        </div>

        <div class="mt-2.5 flex flex-wrap gap-2">
          <select
            :value="rm.id"
            aria-label="اختر الغرفة"
            class="min-h-11 min-w-44 flex-1 rounded-xl border-2 border-line bg-card px-3 text-sm font-bold text-ink focus:border-accent focus:outline-none"
            @change="ws.selectRoom(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="r in ws.currentWorkspace.rooms" :key="r.id" :value="r.id">
              🏠 {{ r.name }} ({{ ar(r.profiles.length) }} لاعب — رمز: {{ r.code }})
            </option>
          </select>
          <button
            type="button"
            class="min-h-11 cursor-pointer rounded-xl border-2 border-line bg-card px-3 text-xs font-extrabold text-ink transition hover:border-accent"
            @click="handleRenewCode"
          >
            🔄 رمز جديد
          </button>
          <button
            type="button"
            class="min-h-11 cursor-pointer rounded-xl border-2 border-line bg-card px-3 text-xs font-extrabold transition"
            :class="confirmDelRoom ? 'border-bad bg-bad text-white' : 'text-ink hover:border-bad'"
            @click="handleDeleteRoom"
          >
            {{ confirmDelRoom ? 'تأكيد حذف الغرفة؟' : '🗑 حذف الغرفة' }}
          </button>
        </div>

        <div class="mt-2 flex flex-wrap gap-2">
          <input
            v-model="newRoomName"
            maxlength="28"
            placeholder="اسم غرفة جديدة (مثال: الصف الرابع، أبطال الرياضيات)"
            class="min-h-11 min-w-44 flex-1 rounded-xl border-2 border-line bg-card px-3 text-sm text-ink focus:border-accent focus:outline-none"
            @keydown.enter="handleCreateRoom"
          />
          <button
            type="button"
            class="min-h-11 cursor-pointer rounded-xl border-2 border-line bg-card px-4 text-sm font-extrabold text-ink transition hover:border-accent hover:bg-accent-soft"
            @click="handleCreateRoom"
          >
            إنشاء غرفة
          </button>
        </div>
        <p v-if="roomMsg" class="mt-1.5 text-xs font-extrabold" :class="roomOk ? 'text-ok' : 'text-bad'">
          {{ roomMsg }}
        </p>
      </div>

      <!-- Play Mode -->
      <div class="rounded-2xl border-2 border-line bg-bg p-3.5">
        <span class="block text-base font-extrabold text-ink">📱 طريقة اللعب</span>
        <div class="my-2 flex flex-wrap gap-2">
          <button
            type="button"
            :disabled="!canNet()"
            :aria-pressed="s.mode === 'multi'"
            class="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border-2 px-4 text-base font-extrabold transition disabled:opacity-45"
            :class="
              s.mode === 'multi'
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line bg-card text-ink hover:border-accent'
            "
            @click="s.mode = 'multi'; ws.save()"
          >
            📱 أكثر من جهاز
          </button>
          <button
            type="button"
            :aria-pressed="s.mode === 'device'"
            class="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border-2 px-4 text-base font-extrabold transition"
            :class="
              s.mode === 'device'
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line bg-card text-ink hover:border-accent'
            "
            @click="s.mode = 'device'; ws.save()"
          >
            🖥️ جهاز واحد
          </button>
        </div>
        <p class="text-xs text-ink/75">
          {{
            !canNet()
              ? 'اللعب على أكثر من جهاز يعمل عند فتح اللعبة عبر الرابط.'
              : s.mode === 'multi'
                ? 'ينضم كل لاعب من جهازه برمز الغرفة أو مسح QR.'
                : 'اللعب من ١ إلى ٦ لاعبين على هذا الجهاز.'
          }}
        </p>
      </div>

      <!-- Players Roster -->
      <div class="rounded-2xl border-2 border-line bg-bg p-3.5">
        <span class="block text-base font-extrabold text-ink">
          🧑‍🤝‍🧑 اللاعبون في هذه الغرفة (من ١ إلى ٦ لاعبين)
        </span>
        <div class="my-2 flex flex-wrap gap-2">
          <input
            v-model="newPlayerName"
            maxlength="14"
            placeholder="اكتب اسم لاعب جديد في هذه الغرفة"
            class="min-h-11 min-w-44 flex-1 rounded-xl border-2 border-line bg-card px-3 text-sm text-ink focus:border-accent focus:outline-none"
            @keydown.enter="handleAddPlayer"
          />
          <button
            type="button"
            class="min-h-11 cursor-pointer rounded-xl border-2 border-line bg-card px-4 text-sm font-extrabold text-ink transition hover:border-accent hover:bg-accent-soft"
            @click="handleAddPlayer"
          >
            ➕ إضافة لاعب
          </button>
        </div>

        <div v-if="rm.profiles.length" class="space-y-2">
          <div
            v-for="p in rm.profiles"
            :key="p.id"
            class="rounded-xl border border-line bg-card p-2.5"
          >
            <div class="flex items-center gap-2">
              <button
                type="button"
                aria-label="تغيير الرمز"
                class="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg border-2 border-line bg-bg text-lg transition hover:border-accent"
                @click="ws.cyclePlayerEmoji(p)"
              >
                {{ p.emoji }}
              </button>
              <b class="min-w-0 flex-1 truncate text-base font-extrabold">{{ p.name }}</b>
              <button
                v-if="s.mode === 'device'"
                type="button"
                :aria-pressed="p.on"
                class="min-h-9 cursor-pointer rounded-lg border-2 px-3 text-xs font-extrabold transition"
                :class="
                  p.on
                    ? 'border-accent bg-accent text-accent-ink'
                    : 'border-line bg-bg text-ink'
                "
                @click="p.on = !p.on; ws.save()"
              >
                {{ p.on ? '✓ يلعب' : 'لا يلعب' }}
              </button>
              <button
                type="button"
                class="min-h-9 cursor-pointer rounded-lg border-2 border-line bg-bg px-2.5 text-xs font-extrabold text-ink hover:border-accent"
                @click="ws.reportPlayer = p"
              >
                📊 تقرير
              </button>
              <button
                type="button"
                class="min-h-9 min-w-9 cursor-pointer rounded-lg border-2 border-line bg-bg px-2 text-xs font-extrabold transition"
                :class="confirmDelPlayerId === p.id ? 'border-bad bg-bad text-white' : 'text-ink hover:border-bad'"
                @click="handleDeletePlayer(p.id)"
              >
                {{ confirmDelPlayerId === p.id ? 'تأكيد؟' : '✕' }}
              </button>
            </div>

            <!-- Per-Player Difficulty Settings -->
            <details v-if="showPerPlayerOwn" class="mt-2 border-t border-dashed border-line pt-2">
              <summary class="cursor-pointer text-xs font-extrabold text-ink/85">
                مستوى {{ p.name }}: {{ LEVELS[p.level]?.[0] }}
              </summary>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <button
                  v-for="(lv, idx) in LEVELS"
                  :key="idx"
                  type="button"
                  class="min-h-8 cursor-pointer rounded-lg border-2 px-3 text-xs font-extrabold"
                  :class="p.level === idx ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-bg text-ink'"
                  @click="p.level = idx; ws.save()"
                >
                  {{ lv[0] }}
                </button>
              </div>
              <div class="mt-1.5 flex flex-wrap gap-1.5">
                <button
                  v-for="[tid, tLabel] in TOPICS"
                  :key="tid"
                  type="button"
                  class="min-h-8 cursor-pointer rounded-lg border-2 px-2.5 text-xs font-extrabold"
                  :class="p.topics.includes(tid) ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-bg text-ink'"
                  @click="ws.togglePlayerTopic(p, tid)"
                >
                  {{ tLabel }}
                </button>
              </div>
              <div class="mt-1.5 flex flex-wrap gap-1">
                <button
                  v-for="tNum in ALLT"
                  :key="tNum"
                  type="button"
                  class="min-h-8 min-w-8 cursor-pointer rounded-lg border-2 text-xs font-extrabold"
                  :class="p.tables.includes(tNum) ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-bg text-ink'"
                  @click="ws.togglePlayerTable(p, tNum)"
                >
                  {{ ar(tNum) }}
                </button>
              </div>
            </details>
          </div>
        </div>
        <p v-else class="mt-2 text-xs text-ink/75">
          أضف اسم لاعب في هذه الغرفة ليُحفظ ملفه وتقريره (من ١ إلى ٦ لاعبين للمباراة).
        </p>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="min-h-9 cursor-pointer rounded-xl border-2 border-line bg-card px-3 text-xs font-extrabold text-ink hover:border-accent"
            @click="ws.exportBackup()"
          >
            💾 حفظ نسخة احتياطية
          </button>
          <label class="inline-flex min-h-9 cursor-pointer items-center rounded-xl border-2 border-line bg-card px-3 text-xs font-extrabold text-ink hover:border-accent">
            📂 استعادة نسخة
            <input type="file" accept="application/json" class="sr-only" @change="handleImport" />
          </label>
        </div>
      </div>
    </div>

    <!-- TAB 2: Rules & Questions (Shared MatchSettingsPanel) -->
    <MatchSettingsPanel v-else-if="setupTab === 'rules'" />

    <!-- TAB 3: Appearance & Sound -->
    <div v-else class="space-y-3">
      <!-- Arena Designs -->
      <div class="rounded-2xl border-2 border-line bg-bg p-3.5">
        <span class="block text-base font-extrabold text-ink">🗺️ تصميم الساحة</span>
        <p class="mt-0.5 text-xs text-ink/75">اختر شكل الساحة والرسومات التي تظهر لجميع اللاعبين في المباراة.</p>
        <div class="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            v-for="[id, title, desc, swatches] in ARENAS"
            :key="id"
            type="button"
            :aria-pressed="s.arena === id"
            class="flex cursor-pointer flex-col items-start gap-1 rounded-2xl border-2 p-3 text-right transition"
            :class="
              s.arena === id
                ? 'border-accent bg-accent-soft ring-2 ring-accent'
                : 'border-line bg-card hover:border-accent'
            "
            @click="selectArena(id)"
          >
            <div class="flex w-full items-center justify-between gap-2">
              <b class="text-base font-extrabold text-ink">{{ title }}</b>
              <span class="flex gap-1">
                <i
                  v-for="(hex, hi) in swatches"
                  :key="hi"
                  class="inline-block h-3.5 w-3.5 rounded-sm border border-white/40"
                  :style="{ backgroundColor: hex }"
                />
              </span>
            </div>
            <small class="text-xs leading-snug text-ink/75">{{ desc }}</small>
          </button>
        </div>
      </div>

      <!-- App Color Theme -->
      <div class="rounded-2xl border-2 border-line bg-bg p-3.5">
        <span class="block text-base font-extrabold text-ink">🎨 لون التطبيق</span>
        <p class="mt-0.5 text-xs text-ink/75">يغيّر ألوان الواجهة والأزرار (ويمكن لكل لاعب تغييره من جهازه أيضًا).</p>
        <div class="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            v-for="[id, label, hex] in THEMES"
            :key="id"
            type="button"
            :aria-pressed="theme.color === id"
            class="flex cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-sm font-extrabold transition"
            :class="
              theme.color === id
                ? 'border-accent bg-accent-soft ring-2 ring-accent'
                : 'border-line bg-card text-ink hover:border-accent'
            "
            @click="selectTheme(id)"
          >
            <i class="h-5 w-5 shrink-0 rounded-full border-2 border-white/60" :style="{ backgroundColor: hex }" />
            <span>{{ label }}</span>
          </button>
        </div>
      </div>

      <!-- Players' Devices Audio Toggle (Req #22) -->
      <div class="rounded-2xl border-2 border-line bg-bg p-3.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span class="block text-base font-extrabold text-ink">📱 أصوات أجهزة اللاعبين</span>
            <p class="mt-0.5 text-xs text-ink/75">
              عند التفعيل، تعمل المؤثرات الصوتية والمعلّق على هواتف اللاعبين (ويمكنك إيقافها في أي وقت أثناء اللعب).
            </p>
          </div>
          <button
            type="button"
            :aria-pressed="s.clientAudio !== false"
            class="min-h-11 cursor-pointer rounded-xl border-2 px-4 text-sm font-extrabold transition"
            :class="
              s.clientAudio !== false
                ? 'border-accent bg-accent text-accent-ink shadow-xs'
                : 'border-line bg-card text-ink'
            "
            @click="s.clientAudio = !(s.clientAudio !== false); ws.save()"
          >
            {{ s.clientAudio !== false ? '🔊 مفعّل على أجهزة اللاعبين ✓' : '🔇 متوقف على أجهزة اللاعبين ✕' }}
          </button>
        </div>
      </div>

      <!-- Voices & Custom Recordings -->
      <div class="rounded-2xl border-2 border-line bg-bg p-3.5">
        <span class="block text-base font-extrabold text-ink">🎙️ المعلّق والجمهور</span>
        <button
          type="button"
          class="my-2 min-h-11 w-full cursor-pointer rounded-xl border-2 border-line bg-card px-4 text-base font-extrabold text-ink transition hover:border-accent hover:bg-accent-soft"
          @click="handleTestVoice"
        >
          🎙️ اختبار صوت المعلّق والجمهور
        </button>
        <p v-if="voiceMsg" class="mb-2 text-xs text-ink/80">{{ voiceMsg }}</p>

        <select
          v-if="deviceVoices.length"
          v-model="selectedDeviceVoice"
          aria-label="صوت نطق الأسماء"
          class="mb-2.5 min-h-11 w-full rounded-xl border-2 border-line bg-card px-3 text-sm font-bold text-ink"
          @change="onDeviceVoiceChange"
        >
          <option value="">صوت نطق الأسماء: تلقائي</option>
          <option v-for="v in deviceVoices" :key="v.name" :value="v.name">{{ v.name }}</option>
        </select>

        <details class="rounded-xl border-2 border-line bg-card px-3 py-2">
          <summary class="min-h-8 cursor-pointer text-sm font-extrabold text-ink">
            🎵 أصواتك الخاصة (اختياري)
          </summary>
          <p class="my-1.5 text-xs text-ink/75">
            ارفع تسجيلًا صوتيًا ليحل محل الصوت الجاهز. يبقى التسجيل محفوظًا في هذا المتصفح.
          </p>
          <div class="divide-y divide-line">
            <div v-for="[k, label, hint] in AUDIO_SLOTS" :key="k" class="flex items-center gap-2 py-2">
              <span class="min-w-0 flex-1">
                <b class="block text-sm">{{ label }}</b>
                <small class="text-xs text-ink/70">
                  {{ customSlotKeys.includes(k) ? 'تسجيلك الخاص' : hint || 'الصوت الجاهز' }}
                </small>
              </span>
              <label class="inline-flex min-h-9 cursor-pointer items-center rounded-lg border-2 border-line bg-bg px-2.5 text-xs font-extrabold text-ink hover:border-accent">
                رفع
                <input type="file" accept="audio/*" class="sr-only" @change="handleSlotUpload(k, $event)" />
              </label>
              <button
                type="button"
                class="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border-2 border-line bg-bg text-xs font-extrabold text-ink hover:border-accent"
                @click="previewSlot(k)"
              >
                ▶
              </button>
              <button
                v-if="customSlotKeys.includes(k)"
                type="button"
                class="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border-2 border-line bg-bg text-xs font-extrabold text-bad hover:border-bad"
                @click="deleteCustomSlot(k)"
              >
                ✕
              </button>
            </div>
          </div>
        </details>
      </div>
    </div>

    <!-- Always-Visible Start Footer -->
    <div class="mt-4 border-t-2 border-line pt-3">
      <div class="mb-2 flex flex-wrap gap-1.5 text-xs font-bold">
        <span class="rounded-full border border-line bg-bg px-2.5 py-1">🏠 {{ rm.name }}</span>
        <span class="rounded-full border border-line bg-bg px-2.5 py-1">
          {{ s.mode === 'multi' ? '📱 أكثر من جهاز' : '🖥️ جهاز واحد' }}
        </span>
        <span class="rounded-full border border-line bg-bg px-2.5 py-1">
          {{ s.moveMode === 'speed' ? '⚡ سرعة الإجابة' : '🎲 النرد' }}
        </span>
        <span class="rounded-full border border-line bg-bg px-2.5 py-1">📐 {{ ar(s.size) }}×{{ ar(s.size) }}</span>
        <span class="rounded-full border border-line bg-bg px-2.5 py-1">{{ activeArenaTitle }}</span>
        <span class="rounded-full border border-line bg-bg px-2.5 py-1">🎮 {{ ar(activeRulesCount) }} قواعد مفعّلة</span>
      </div>

      <p v-if="errMsg" role="alert" class="mb-2 text-sm font-extrabold text-bad">{{ errMsg }}</p>

      <button
        type="button"
        class="min-h-14 w-full cursor-pointer rounded-2xl bg-accent px-5 text-xl font-extrabold text-accent-ink shadow-sm transition hover:bg-accent-hover active:scale-[0.98]"
        @click="handleStart"
      >
        {{ s.mode === 'multi' ? `فتح غرفة «${rm.name}» للأجهزة 🚀` : 'ابدأ اللعب الآن 🚀' }}
      </button>
    </div>
  </div>
</template>
