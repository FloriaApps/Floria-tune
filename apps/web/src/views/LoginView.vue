<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@floria-tune/store";

const url = ref("");
const username = ref("");
const password = ref("");
const loading = ref(false);

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

async function onSubmit() {
  loading.value = true;
  try {
    await auth.login({ url: url.value.trim(), username: username.value.trim(), password: password.value });
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/";
    router.push(redirect);
  } catch {
    // erro já fica em auth.errorMessage
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex h-screen items-center justify-center px-6">
    <div
      class="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-900/50 p-8 shadow-2xl shadow-black/40 backdrop-blur-2xl"
    >
      <p class="font-display text-3xl text-paper-100">Floria Tune</p>
      <p class="mt-1.5 text-sm text-paper-400">{{ $t("login.subtitle") }}</p>

      <form class="mt-8 flex flex-col gap-4" @submit.prevent="onSubmit">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs uppercase tracking-wide text-paper-400">{{ $t("login.serverUrl") }}</span>
          <input
            v-model="url"
            type="url"
            required
            :placeholder="$t('login.serverUrlPlaceholder')"
            class="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-paper-100 outline-none transition-colors focus:border-gold-400"
          />
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-xs uppercase tracking-wide text-paper-400">{{ $t("login.username") }}</span>
          <input
            v-model="username"
            type="text"
            required
            autocomplete="username"
            class="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-paper-100 outline-none transition-colors focus:border-gold-400"
          />
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-xs uppercase tracking-wide text-paper-400">{{ $t("login.password") }}</span>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-paper-100 outline-none transition-colors focus:border-gold-400"
          />
        </label>

        <p v-if="auth.errorMessage" class="text-sm text-red-400">{{ auth.errorMessage }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="mt-2 rounded-lg bg-gold-400 py-2.5 text-sm font-medium text-ink-950 shadow-lg shadow-gold-400/20 transition-colors hover:bg-gold-500 disabled:opacity-60"
        >
          {{ loading ? $t("login.connecting") : $t("login.signIn") }}
        </button>
      </form>
    </div>
  </div>
</template>
