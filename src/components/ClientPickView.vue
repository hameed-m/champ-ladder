<script setup lang="ts">
import { ref } from 'vue';
import { useClientStore } from '@/stores/client';

const client = useClientStore();
const customName = ref('');

function submitCustom() {
  if (!customName.value.trim()) return;
  client.pickCustomName(customName.value);
}
</script>

<template>
  <section class="mx-auto max-w-xl rounded-2xl border-2 border-line bg-card p-5 shadow-sm">
    <h2 class="mb-1 font-display text-3xl text-ink">من أنت؟</h2>
    <p class="mb-3 text-sm text-ink/75">اختر اسمك من القائمة أو اكتب اسمك للدخول إلى المباراة.</p>

    <div class="mb-3 space-y-2">
      <button
        v-for="p in client.pickList"
        :key="p.id"
        type="button"
        class="min-h-12 w-full cursor-pointer rounded-2xl border-2 border-line bg-bg px-4 text-lg font-extrabold text-ink transition hover:border-accent hover:bg-accent-soft"
        @click="client.pickExistingPlayer(p.id)"
      >
        {{ p.emoji }} {{ p.name }}
      </button>
    </div>

    <div class="flex flex-wrap gap-2">
      <input
        v-model="customName"
        maxlength="14"
        placeholder="أو اكتب اسمك هنا"
        aria-label="اسمك"
        class="min-h-12 min-w-44 flex-1 rounded-xl border-2 border-line bg-bg px-3 text-base text-ink focus:border-accent focus:outline-none"
        @keydown.enter="submitCustom"
      />
      <button
        type="button"
        class="min-h-12 cursor-pointer rounded-xl bg-accent px-6 text-lg font-extrabold text-accent-ink transition hover:bg-accent-hover"
        @click="submitCustom"
      >
        دخول
      </button>
    </div>
  </section>
</template>
