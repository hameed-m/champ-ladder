<script setup lang="ts">
import { useClientStore } from '@/stores/client';

const client = useClientStore();
</script>

<template>
  <section class="mx-auto max-w-xl rounded-2xl border-2 border-line bg-card p-6 text-center shadow-sm">
    <h2 class="mb-2 font-display text-3xl text-ink">{{ client.connectTitle }}</h2>
    <p class="mb-4 text-base text-ink/80">{{ client.connectMsg }}</p>
    <button
      v-if="client.connectCanBack"
      type="button"
      class="min-h-12 cursor-pointer rounded-2xl border-2 border-line bg-bg px-6 text-base font-extrabold text-ink transition hover:border-accent"
      @click="client.disconnectAndReset()"
    >
      رجوع
    </button>
  </section>
</template>
