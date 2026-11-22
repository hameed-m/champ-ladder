import { defineStore } from 'pinia';
import { ref } from 'vue';
import { THEMES } from '@/constants/game';
import type { ThemeColorId } from '@/types/game';

const THEME_KEY = 'sullam-theme-v1';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const useThemeStore = defineStore('theme', () => {
  const color = ref<ThemeColorId>('green');
  const dark = ref<boolean>(
    typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const userPicked = ref<boolean>(false);
  const canInstall = ref<boolean>(false);
  let deferredPrompt: BeforeInstallPromptEvent | null = null;

  function applyDOM(): void {
    const root = document.documentElement;
    root.setAttribute('data-color', color.value);
    root.setAttribute('data-theme', dark.value ? 'dark' : 'light');
    const found = THEMES.find((t) => t[0] === color.value);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && found) {
      meta.setAttribute('content', dark.value ? '#0c1914' : found[2]);
    }
  }

  function persist(): void {
    try {
      localStorage.setItem(
        THEME_KEY,
        JSON.stringify({
          color: color.value,
          dark: dark.value,
          userPicked: userPicked.value,
        }),
      );
    } catch {
      // Ignore
    }
  }

  function init(): void {
    try {
      const saved = JSON.parse(localStorage.getItem(THEME_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        if (THEMES.some((t) => t[0] === saved.color)) color.value = saved.color;
        if (typeof saved.dark === 'boolean') dark.value = saved.dark;
        if (typeof saved.userPicked === 'boolean') userPicked.value = saved.userPicked;
      }
    } catch {
      // Ignore
    }
    applyDOM();

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      canInstall.value = true;
    });
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      canInstall.value = false;
    });
  }

  function setColor(next: ThemeColorId, fromUser = true): void {
    if (!THEMES.some((t) => t[0] === next)) return;
    color.value = next;
    if (fromUser) userPicked.value = true;
    persist();
    applyDOM();
  }

  function applyHostDefault(next: ThemeColorId): void {
    if (!userPicked.value) {
      setColor(next, false);
    }
  }

  function toggleDark(): void {
    dark.value = !dark.value;
    persist();
    applyDOM();
  }

  async function installPwa(): Promise<void> {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    canInstall.value = false;
  }

  return {
    color,
    dark,
    userPicked,
    canInstall,
    init,
    setColor,
    applyHostDefault,
    toggleDark,
    installPwa,
  };
});
