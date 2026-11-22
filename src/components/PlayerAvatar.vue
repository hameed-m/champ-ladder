<script setup lang="ts">
import { computed } from 'vue';
import { getAvatarDef } from '@/constants/avatars';

const props = withDefaults(
  defineProps<{
    avatar?: string | null;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    ringColor?: string;
  }>(),
  {
    avatar: '🦁',
    size: 'sm',
    ringColor: '',
  },
);

const def = computed(() => getAvatarDef(props.avatar));

const sizeClass = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'h-5 w-5 text-xs';
    case 'sm':
      return 'h-7 w-7 text-base';
    case 'md':
      return 'h-9 w-9 text-xl';
    case 'lg':
      return 'h-12 w-12 text-2xl';
    case 'xl':
      return 'h-16 w-16 text-4xl';
    default:
      return 'h-7 w-7 text-base';
  }
});
</script>

<template>
  <span
    class="inline-grid shrink-0 place-items-center overflow-hidden rounded-full leading-none select-none"
    :class="sizeClass"
    :style="
      ringColor
        ? { backgroundColor: def?.kind === 'svg' ? def.bg : ringColor, boxShadow: `0 0 0 2px ${ringColor}` }
        : def?.kind === 'svg' && def.bg
          ? { backgroundColor: def.bg }
          : undefined
    "
    :aria-label="def?.label || avatar || 'أفاتار'"
  >
    <svg
      v-if="def?.kind === 'svg' && def.svgInner"
      viewBox="0 0 64 64"
      class="h-full w-full block"
      aria-hidden="true"
      v-html="def.svgInner"
    />
    <span v-else class="leading-none">{{ avatar || '🦁' }}</span>
  </span>
</template>
