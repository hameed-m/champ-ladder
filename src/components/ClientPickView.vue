<script setup lang="ts">
import { ref } from 'vue';
import AvatarPickerModal from '@/components/AvatarPickerModal.vue';
import PlayerAvatar from '@/components/PlayerAvatar.vue';
import { SVG_AVATARS } from '@/constants/avatars';
import { useClientStore } from '@/stores/client';

const client = useClientStore();
const customName = ref('');
const selectedAvatar = ref<string>(SVG_AVATARS[0]?.id || '🦁');
const customAvatarChosen = ref(false);
const pickerOpen = ref(false);

function onSelectAvatar(av: string) {
  selectedAvatar.value = av;
  customAvatarChosen.value = true;
}

function submitExisting(pid: string) {
  client.pickExistingPlayer(pid, customAvatarChosen.value ? selectedAvatar.value : undefined);
}

function submitCustom() {
  if (!customName.value.trim()) return;
  client.pickCustomName(customName.value, selectedAvatar.value);
}
</script>

<template>
  <section class="mx-auto max-w-xl rounded-2xl border-2 border-line bg-card p-5 shadow-sm">
    <h2 class="mb-1 font-display text-3xl text-ink">من أنت؟</h2>
    <p class="mb-3 text-sm text-ink/75">اختر اسمك وشخصيتك (الأفاتار) للدخول إلى المباراة.</p>

    <!-- Avatar Selection Banner (Req #1) -->
    <div class="mb-4 flex items-center justify-between gap-3 rounded-2xl border-2 border-line bg-bg p-3">
      <div class="flex items-center gap-3">
        <PlayerAvatar :avatar="selectedAvatar" size="lg" />
        <div>
          <b class="block text-sm font-extrabold text-ink">شخصيتك المختارة</b>
          <small class="text-xs text-ink/75">
            {{ customAvatarChosen ? 'ستُطبّق فور دخولك المباراة' : 'اختر بطلاً أو رمزًا يمثلك على الساحة' }}
          </small>
        </div>
      </div>
      <button
        type="button"
        class="min-h-10 shrink-0 cursor-pointer rounded-xl border-2 border-accent bg-accent-soft px-3.5 text-xs font-extrabold text-ink transition hover:bg-accent hover:text-accent-ink"
        @click="pickerOpen = true"
      >
        🎭 تغيير الأفاتار
      </button>
    </div>

    <div v-if="client.pickList.length" class="mb-3 space-y-2">
      <button
        v-for="p in client.pickList"
        :key="p.id"
        type="button"
        class="flex min-h-13 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl border-2 border-line bg-bg px-4 text-lg font-extrabold text-ink transition hover:border-accent hover:bg-accent-soft"
        @click="submitExisting(p.id)"
      >
        <PlayerAvatar :avatar="customAvatarChosen ? selectedAvatar : p.emoji" size="sm" />
        <span>{{ p.name }}</span>
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

    <AvatarPickerModal
      :open="pickerOpen"
      :current="selectedAvatar"
      title="اختر شخصيتك (الأفاتار)"
      @close="pickerOpen = false"
      @select="onSelectAvatar"
    />
  </section>
</template>
