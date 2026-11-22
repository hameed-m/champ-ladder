<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import PlayerAvatar from '@/components/PlayerAvatar.vue';
import { EMOJI_AVATARS, getAvatarDef, SVG_AVATARS } from '@/constants/avatars';

const props = defineProps<{
  open: boolean;
  current: string;
  title?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', avatarId: string): void;
}>();

const tab = ref<'heroes' | 'emojis'>('heroes');
const selected = ref(props.current || '🦁');

watch(
  () => [props.open, props.current] as const,
  ([isOpen, cur]) => {
    if (isOpen) {
      selected.value = cur || '🦁';
      const def = getAvatarDef(cur);
      tab.value = def?.kind === 'emoji' ? 'emojis' : 'heroes';
    }
  },
  { immediate: true },
);

const currentDef = computed(() => getAvatarDef(selected.value));

function choose(id: string) {
  selected.value = id;
  emit('select', id);
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="title || 'اختر شخصيتك'"
      @click.self="emit('close')"
    >
      <div class="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl border-2 border-line bg-card shadow-2xl sm:rounded-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between gap-2 border-b-2 border-line px-4 py-3">
          <div class="flex items-center gap-2.5">
            <PlayerAvatar :avatar="selected" size="md" />
            <div>
              <h3 class="font-display text-2xl leading-tight text-ink">
                {{ title || 'اختر شخصيتك (الأفاتار)' }}
              </h3>
              <small class="text-xs font-bold text-ink/75">
                {{ currentDef?.label || 'شخصية مميزة' }}
              </small>
            </div>
          </div>
          <button
            type="button"
            aria-label="إغلاق"
            class="grid h-9 w-9 cursor-pointer place-items-center rounded-xl border-2 border-line bg-bg text-sm font-extrabold text-ink transition hover:border-accent"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>

        <!-- Tabs -->
        <div class="grid grid-cols-2 gap-1.5 border-b border-line bg-bg/60 p-2">
          <button
            type="button"
            :aria-pressed="tab === 'heroes'"
            class="min-h-10 cursor-pointer rounded-xl text-sm font-extrabold transition"
            :class="tab === 'heroes' ? 'bg-accent text-accent-ink shadow-xs' : 'bg-card text-ink hover:bg-accent-soft'"
            @click="tab = 'heroes'"
          >
            🦸 أبطال مرسومون ({{ SVG_AVATARS.length }})
          </button>
          <button
            type="button"
            :aria-pressed="tab === 'emojis'"
            class="min-h-10 cursor-pointer rounded-xl text-sm font-extrabold transition"
            :class="tab === 'emojis' ? 'bg-accent text-accent-ink shadow-xs' : 'bg-card text-ink hover:bg-accent-soft'"
            @click="tab = 'emojis'"
          >
            🎭 رموز وحيوانات ({{ EMOJI_AVATARS.length }})
          </button>
        </div>

        <!-- Grid -->
        <div class="overflow-y-auto p-3.5">
          <div v-if="tab === 'heroes'" class="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            <button
              v-for="av in SVG_AVATARS"
              :key="av.id"
              type="button"
              :aria-pressed="selected === av.id"
              class="flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 p-2.5 transition active:scale-95"
              :class="
                selected === av.id
                  ? 'border-accent bg-accent-soft ring-2 ring-accent'
                  : 'border-line bg-bg hover:border-accent'
              "
              @click="choose(av.id)"
            >
              <PlayerAvatar :avatar="av.id" size="lg" />
              <span class="truncate text-xs font-extrabold text-ink">{{ av.label }}</span>
            </button>
          </div>

          <div v-else class="grid grid-cols-4 gap-2 sm:grid-cols-6">
            <button
              v-for="av in EMOJI_AVATARS"
              :key="av.id"
              type="button"
              :aria-pressed="selected === av.id"
              :title="av.label"
              class="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 p-2 transition active:scale-95"
              :class="
                selected === av.id
                  ? 'border-accent bg-accent-soft ring-2 ring-accent'
                  : 'border-line bg-bg hover:border-accent'
              "
              @click="choose(av.id)"
            >
              <span class="text-3xl leading-none">{{ av.id }}</span>
              <span class="truncate text-[11px] font-bold text-ink/80">{{ av.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
