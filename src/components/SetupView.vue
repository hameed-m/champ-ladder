<script setup lang="ts">
import { ref, watch } from 'vue';
import HostDashboard from '@/components/HostDashboard.vue';
import { useClientStore } from '@/stores/client';
import { useWorkspaceStore } from '@/stores/workspace';

const ws = useWorkspaceStore();
const client = useClientStore();

const mainTab = ref<'join' | 'host'>(ws.isAuthed ? 'host' : 'join');
const joinCode = ref('');
const joinErr = ref('');

const loginEmail = ref('');
const loginPass = ref('');
const authErr = ref('');
const loggingIn = ref(false);

watch(
  () => ws.isAuthed,
  (authed) => {
    if (authed) mainTab.value = 'host';
  },
);

function submitJoin() {
  joinErr.value = '';
  const code = joinCode.value.trim();
  if (!/^\d{6}$/.test(code)) {
    joinErr.value = 'يرجى كتابة رمز المباراة المكوّن من ٦ أرقام.';
    return;
  }
  client.startClient(code);
}

async function submitLogin() {
  authErr.value = '';
  loggingIn.value = true;
  const res = await ws.login(loginEmail.value, loginPass.value);
  loggingIn.value = false;
  if (!res.ok) {
    authErr.value = res.msg || 'تعذر تسجيل الدخول.';
  } else {
    loginPass.value = '';
  }
}
</script>

<template>
  <section class="mx-auto max-w-3xl rounded-2xl border-2 border-line bg-card p-4 shadow-sm">
    <!-- Main Entry Tabs: Join Match vs Host Dashboard -->
    <div class="mb-4 grid grid-cols-2 gap-2.5" role="tablist" aria-label="طريقة الدخول">
      <button
        type="button"
        role="tab"
        :aria-selected="mainTab === 'join'"
        class="flex cursor-pointer items-center gap-2.5 rounded-2xl border-2 p-3 text-right transition"
        :class="
          mainTab === 'join'
            ? 'border-accent bg-accent text-accent-ink shadow-sm'
            : 'border-line bg-bg text-ink hover:border-accent'
        "
        @click="mainTab = 'join'"
      >
        <span class="text-2xl leading-none">🎮</span>
        <div>
          <b class="block text-base font-extrabold leading-tight sm:text-lg">انضمام إلى مباراة</b>
          <small class="hidden text-xs opacity-80 sm:block">للاعبين عبر رمز المباراة</small>
        </div>
      </button>

      <button
        type="button"
        role="tab"
        :aria-selected="mainTab === 'host'"
        class="flex cursor-pointer items-center gap-2.5 rounded-2xl border-2 p-3 text-right transition"
        :class="
          mainTab === 'host'
            ? 'border-accent bg-accent text-accent-ink shadow-sm'
            : 'border-line bg-bg text-ink hover:border-accent'
        "
        @click="mainTab = 'host'"
      >
        <span class="text-2xl leading-none">👑</span>
        <div>
          <b class="block text-base font-extrabold leading-tight sm:text-lg">إنشاء وإدارة مباراة</b>
          <small class="hidden text-xs opacity-80 sm:block">للمشرف أو اللعب على نفس الجهاز</small>
        </div>
      </button>
    </div>

    <!-- Join Match Pane -->
    <div v-if="mainTab === 'join'" class="rounded-2xl border-2 border-line bg-bg px-4 py-6 text-center">
      <div class="mb-2 text-5xl leading-none">📱</div>
      <h2 class="mb-1.5 font-display text-3xl text-ink">انضم إلى المباراة الآن!</h2>
      <p class="mb-4 text-sm text-ink/80 sm:text-base">
        أدخل رمز المباراة المكوّن من ٦ أرقام الظاهر على شاشة المشرف، أو امسح رمز QR بكاميرا جهازك.
      </p>

      <div class="mx-auto flex max-w-md flex-wrap gap-2">
        <input
          v-model="joinCode"
          inputmode="numeric"
          maxlength="6"
          placeholder="اكتب رمز المباراة (٦ أرقام)"
          aria-label="رمز المباراة"
          class="min-h-12 min-w-44 flex-1 rounded-xl border-2 border-line bg-card px-3 text-center text-xl font-extrabold tracking-widest text-ink focus:border-accent focus:outline-none"
          @keydown.enter="submitJoin"
        />
        <button
          type="button"
          class="min-h-12 cursor-pointer rounded-xl bg-accent px-6 text-lg font-extrabold text-accent-ink transition hover:bg-accent-hover active:scale-[0.98]"
          @click="submitJoin"
        >
          دخول المباراة 🚀
        </button>
      </div>

      <p v-if="joinErr" role="alert" class="mt-2.5 text-sm font-extrabold text-bad">
        {{ joinErr }}
      </p>
    </div>

    <!-- Host Pane -->
    <div v-else>
      <!-- Admin Login Box -->
      <div v-if="!ws.isAuthed" class="rounded-2xl border-2 border-line bg-bg p-4">
        <h2 class="mb-1 font-display text-2xl text-ink">🔒 تسجيل دخول المشرف</h2>
        <p class="mb-3 text-sm text-ink/80">
          سجّل دخولك لإنشاء مباراة جديدة، إدارة الغرف واللاعبين، وتخصيص إعدادات اللعب.
        </p>

        <div class="mb-2.5 grid gap-2.5">
          <input
            v-model="loginEmail"
            type="email"
            dir="ltr"
            autocomplete="username"
            placeholder="البريد الإلكتروني"
            aria-label="البريد الإلكتروني"
            class="min-h-12 w-full rounded-xl border-2 border-line bg-card px-3 text-ink focus:border-accent focus:outline-none"
            @keydown.enter="submitLogin"
          />
          <input
            v-model="loginPass"
            type="password"
            dir="ltr"
            autocomplete="current-password"
            placeholder="كلمة المرور"
            aria-label="كلمة المرور"
            class="min-h-12 w-full rounded-xl border-2 border-line bg-card px-3 text-ink focus:border-accent focus:outline-none"
            @keydown.enter="submitLogin"
          />
        </div>

        <p v-if="authErr" role="alert" class="mb-2 text-sm font-extrabold text-bad">
          {{ authErr }}
        </p>

        <button
          type="button"
          :disabled="loggingIn"
          class="min-h-12 w-full cursor-pointer rounded-xl bg-accent px-5 text-lg font-extrabold text-accent-ink transition hover:bg-accent-hover disabled:opacity-50"
          @click="submitLogin"
        >
          {{ loggingIn ? 'جارٍ تسجيل الدخول…' : 'تسجيل الدخول' }}
        </button>
      </div>

      <!-- Authenticated Host Dashboard -->
      <HostDashboard v-else />
    </div>
  </section>
</template>
