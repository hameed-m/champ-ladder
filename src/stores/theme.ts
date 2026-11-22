import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { DEFAULT_THEME_CONFIG, normalizeThemeConfig } from '@/constants/game';
import type { ThemeConfig } from '@/types/game';

const THEME_KEY = 'sullam-theme-v2';
const LEGACY_THEME_KEY = 'sullam-theme-v1';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function vividToFactor(vivid: number): number {
  const clamped = Math.max(0, Math.min(100, vivid));
  return Number((0.15 + (clamped / 100) * 1.0).toFixed(3));
}

export function oklchPreviewColor(hue: number, vivid: number, isDark = false, mono = false): string {
  if (mono) return '#111113';
  const f = vividToFactor(vivid);
  return isDark
    ? `oklch(0.76 ${(0.155 * f).toFixed(4)} ${hue})`
    : `oklch(0.50 ${(0.165 * f).toFixed(4)} ${hue})`;
}

export const useThemeStore = defineStore('theme', () => {
  const hue = ref<number>(DEFAULT_THEME_CONFIG.hue);
  const vivid = ref<number>(DEFAULT_THEME_CONFIG.vivid);
  const mono = ref<boolean>(false);
  const dark = ref<boolean>(
    typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const userPicked = ref<boolean>(false);
  const roomDefault = ref<ThemeConfig | null>(null);

  const canInstall = ref<boolean>(false);
  let deferredPrompt: BeforeInstallPromptEvent | null = null;

  const config = computed<ThemeConfig>(() => ({ hue: hue.value, vivid: vivid.value, mono: mono.value }));

  const hasCustomOverride = computed<boolean>(() => {
    if (!userPicked.value || !roomDefault.value) return false;
    return (
      roomDefault.value.hue !== hue.value ||
      roomDefault.value.vivid !== vivid.value ||
      !!roomDefault.value.mono !== mono.value
    );
  });

  function applyDOM(): void {
    const root = document.documentElement;
    root.style.setProperty('--theme-hue', String(hue.value));
    root.style.setProperty('--theme-vivid', String(vividToFactor(vivid.value)));
    root.setAttribute('data-theme', dark.value ? 'dark' : 'light');
    if (mono.value) {
      root.setAttribute('data-mono', 'black');
    } else {
      root.removeAttribute('data-mono');
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        'content',
        mono.value ? '#09090b' : dark.value ? '#11181c' : oklchPreviewColor(hue.value, vivid.value, false),
      );
    }
  }

  function persist(): void {
    try {
      localStorage.setItem(
        THEME_KEY,
        JSON.stringify({
          hue: hue.value,
          vivid: vivid.value,
          mono: mono.value,
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
        const norm = normalizeThemeConfig(saved);
        hue.value = norm.hue;
        vivid.value = norm.vivid;
        mono.value = !!norm.mono;
        if (typeof saved.dark === 'boolean') dark.value = saved.dark;
        if (typeof saved.userPicked === 'boolean') userPicked.value = saved.userPicked;
      } else {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_THEME_KEY) || 'null');
        if (legacy && typeof legacy === 'object') {
          const norm = normalizeThemeConfig(null, legacy.color);
          hue.value = norm.hue;
          vivid.value = norm.vivid;
          mono.value = !!norm.mono;
          if (typeof legacy.dark === 'boolean') dark.value = legacy.dark;
          if (typeof legacy.userPicked === 'boolean') userPicked.value = legacy.userPicked;
        }
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

  function setConfig(next: Partial<ThemeConfig>, fromUser = true): void {
    const norm = normalizeThemeConfig({
      hue: next.hue ?? hue.value,
      vivid: next.vivid ?? vivid.value,
      mono: next.mono ?? false,
    });
    hue.value = norm.hue;
    vivid.value = norm.vivid;
    mono.value = !!norm.mono;
    if (fromUser) userPicked.value = true;
    persist();
    applyDOM();
  }

  function setRoomDefault(next: ThemeConfig | null | undefined, legacyId?: string): void {
    const norm = normalizeThemeConfig(next, legacyId);
    roomDefault.value = norm;
    if (!userPicked.value) {
      hue.value = norm.hue;
      vivid.value = norm.vivid;
      mono.value = !!norm.mono;
      applyDOM();
    }
  }

  function resetToRoomDefault(): void {
    userPicked.value = false;
    if (roomDefault.value) {
      hue.value = roomDefault.value.hue;
      vivid.value = roomDefault.value.vivid;
      mono.value = !!roomDefault.value.mono;
    } else {
      hue.value = DEFAULT_THEME_CONFIG.hue;
      vivid.value = DEFAULT_THEME_CONFIG.vivid;
      mono.value = false;
    }
    persist();
    applyDOM();
  }

  function randomize(fromUser = true): ThemeConfig {
    const next: ThemeConfig = {
      hue: Math.floor(Math.random() * 360),
      vivid: 65 + Math.floor(Math.random() * 30),
      mono: false,
    };
    setConfig(next, fromUser);
    return next;
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
    hue,
    vivid,
    mono,
    dark,
    userPicked,
    roomDefault,
    config,
    hasCustomOverride,
    canInstall,
    init,
    setConfig,
    setRoomDefault,
    resetToRoomDefault,
    randomize,
    toggleDark,
    installPwa,
  };
});
