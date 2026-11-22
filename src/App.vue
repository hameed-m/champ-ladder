<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import AppHeader from '@/components/AppHeader.vue';
import ClientGameView from '@/components/ClientGameView.vue';
import ClientPickView from '@/components/ClientPickView.vue';
import ConnectView from '@/components/ConnectView.vue';
import EndMatchModal from '@/components/EndMatchModal.vue';
import HostGameView from '@/components/HostGameView.vue';
import LobbyView from '@/components/LobbyView.vue';
import PlayerReportModal from '@/components/PlayerReportModal.vue';
import SetupView from '@/components/SetupView.vue';
import {
  loadCustomRecordings,
  loadVoicesManifest,
  refreshArabicVoices,
  suspendOrResumeOnVisibility,
} from '@/services/audio';
import { useClientStore } from '@/stores/client';
import { keepAwake } from '@/stores/game';
import { useThemeStore } from '@/stores/theme';
import { useWorkspaceStore } from '@/stores/workspace';

const theme = useThemeStore();
const ws = useWorkspaceStore();
const client = useClientStore();

function onVisibilityChange() {
  if (!document.hidden) void keepAwake();
  suspendOrResumeOnVisibility(document.hidden);
}

onMounted(async () => {
  theme.init();
  document.addEventListener('visibilitychange', onVisibilityChange);

  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = refreshArabicVoices;
    refreshArabicVoices();
  }

  await ws.init();

  const j = new URLSearchParams(location.search).get('j');
  if (j && /^\d{6}$/.test(j)) {
    client.startClient(j);
  } else {
    ws.setView('setup');
    void loadCustomRecordings();
    void loadVoicesManifest();
  }
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange);
});
</script>

<template>
  <div class="mx-auto max-w-[1180px] px-3.5 pt-2.5 pb-6">
    <AppHeader />

    <SetupView v-if="ws.view === 'setup'" />
    <LobbyView v-else-if="ws.view === 'lobby'" />
    <HostGameView v-else-if="ws.view === 'game'" />
    <ClientPickView v-else-if="ws.view === 'pick'" />
    <ClientGameView v-else-if="ws.view === 'client'" />
    <ConnectView v-else-if="ws.view === 'connect'" />

    <EndMatchModal />
    <PlayerReportModal />
  </div>
</template>
