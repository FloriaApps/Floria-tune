<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useAuthStore, usePlayerStore, useUiStore, type StreamQuality } from "@floria-tune/store";
import { Check, LogOut } from "lucide-vue-next";
import { THEMES } from "../composables/themes";
import { SUPPORTED_LOCALES } from "../i18n";

const auth = useAuthStore();
const player = usePlayerStore();
const ui = useUiStore();
const router = useRouter();

// useScope: "global" pega a mesma instância de locale usada pelo app
// inteiro (a que foi registrada em main.ts via app.use(i18n)).
const { locale } = useI18n({ useScope: "global" });

const qualityOptions: { value: StreamQuality; labelKey: string; hintKey: string }[] = [
  { value: "auto", labelKey: "settings.quality.auto", hintKey: "settings.quality.autoHint" },
  { value: 128, labelKey: "", hintKey: "settings.quality.kbpsHint128" },
  { value: 192, labelKey: "", hintKey: "settings.quality.kbpsHint192" },
  { value: 320, labelKey: "", hintKey: "settings.quality.kbpsHint320" },
];

function onSelectQuality(value: StreamQuality) {
  ui.setStreamQuality(value);
  player.setStreamQuality(ui.streamQualityKbps);
}

function onSelectLocale(id: string) {
  ui.setLocale(id);
  locale.value = id as "en" | "pt";
}

function logout() {
  player.teardown();
  auth.logout();
  router.push("/login");
}
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="font-display text-3xl text-paper-100">{{ $t("settings.title") }}</h1>

    <!-- Aparência: temas -->
    <section class="mt-8">
      <h2 class="font-display text-lg text-paper-100">{{ $t("settings.appearance") }}</h2>
      <p class="mt-1 text-sm text-paper-400">{{ $t("settings.appearanceDesc") }}</p>

      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <button
          v-for="theme in THEMES"
          :key="theme.id"
          type="button"
          class="relative flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors"
          :class="
            ui.theme === theme.id
              ? 'border-gold-400 bg-gold-400/10'
              : 'border-white/10 bg-white/5 hover:border-white/20'
          "
          @click="ui.setTheme(theme.id)"
        >
          <div class="flex gap-1.5">
            <span
              v-for="color in theme.swatch"
              :key="color"
              class="h-5 w-5 rounded-full ring-1 ring-black/20"
              :style="{ backgroundColor: color }"
            />
          </div>
          <span class="text-sm text-paper-100">{{ theme.name }}</span>
          <Check
            v-if="ui.theme === theme.id"
            :size="16"
            class="absolute right-3 top-3 text-gold-400"
          />
        </button>
      </div>
    </section>

    <!-- Idioma -->
    <section class="mt-10">
      <h2 class="font-display text-lg text-paper-100">{{ $t("settings.language") }}</h2>
      <p class="mt-1 text-sm text-paper-400">{{ $t("settings.languageDesc") }}</p>

      <div class="mt-4 flex flex-wrap gap-2">
        <button
          v-for="opt in SUPPORTED_LOCALES"
          :key="opt.id"
          type="button"
          class="rounded-xl border px-4 py-2 text-sm transition-colors"
          :class="
            ui.locale === opt.id
              ? 'border-gold-400 bg-gold-400/10 text-gold-400'
              : 'border-white/10 bg-white/5 text-paper-100 hover:border-white/20'
          "
          @click="onSelectLocale(opt.id)"
        >
          {{ opt.label }}
        </button>
      </div>
    </section>

    <!-- Reprodução: qualidade de streaming -->
    <section class="mt-10">
      <h2 class="font-display text-lg text-paper-100">{{ $t("settings.playback") }}</h2>
      <p class="mt-1 text-sm text-paper-400">{{ $t("settings.playbackDesc") }}</p>

      <div class="mt-4 flex flex-wrap gap-2">
        <button
          v-for="opt in qualityOptions"
          :key="String(opt.value)"
          type="button"
          class="rounded-xl border px-4 py-2 text-left transition-colors"
          :class="
            ui.streamQuality === opt.value
              ? 'border-gold-400 bg-gold-400/10 text-gold-400'
              : 'border-white/10 bg-white/5 text-paper-100 hover:border-white/20'
          "
          @click="onSelectQuality(opt.value)"
        >
          <span class="block text-sm font-medium">
            {{ opt.labelKey ? $t(opt.labelKey) : `${opt.value} kbps` }}
          </span>
          <span class="block text-xs opacity-70">{{ $t(opt.hintKey) }}</span>
        </button>
      </div>
    </section>

    <!-- Conta -->
    <section class="mt-10">
      <h2 class="font-display text-lg text-paper-100">{{ $t("settings.account") }}</h2>
      <div class="mt-4 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div>
          <p class="text-xs uppercase tracking-wide text-paper-400">{{ $t("settings.server") }}</p>
          <p class="mt-1 truncate text-sm text-paper-100">{{ auth.credentials?.url }}</p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-paper-400">{{ $t("settings.username") }}</p>
          <p class="mt-1 text-sm text-paper-100">{{ auth.credentials?.username }}</p>
        </div>
      </div>

      <button
        class="mt-4 flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2 text-sm text-paper-100 transition-colors hover:border-red-400 hover:text-red-400"
        @click="logout"
      >
        <LogOut :size="16" /> {{ $t("settings.signOut") }}
      </button>
    </section>

    <!-- Sobre -->
    <section class="mt-10 border-t border-white/10 pt-6 text-xs text-paper-400">
      <p>{{ $t("settings.aboutText") }}</p>
      <p class="mt-1">
        <a
          href="https://github.com/FloriaApps/floria-tune"
          target="_blank"
          rel="noopener"
          class="hover:text-gold-400"
          >github.com/FloriaApps/floria-tune</a
        >
      </p>
    </section>
  </div>
</template>
