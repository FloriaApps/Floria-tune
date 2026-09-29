<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import type { Playlist } from "@floria-tune/types";
import { useNavidrome } from "../composables/useNavidrome";
import { ListMusic, Plus } from "lucide-vue-next";

const api = useNavidrome();
const router = useRouter();

const playlists = ref<Playlist[]>([]);
const loading = ref(true);
const creating = ref(false);
const newName = ref("");
const submitting = ref(false);

async function load() {
  playlists.value = await api.getPlaylists();
  loading.value = false;
}

async function createPlaylist() {
  const name = newName.value.trim();
  if (!name || submitting.value) return;
  submitting.value = true;
  try {
    await api.createPlaylist(name);
    newName.value = "";
    creating.value = false;
    await load();
    const created = playlists.value.find((p) => p.name === name);
    if (created) router.push(`/playlist/${created.id}`);
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="font-display text-3xl text-paper-100">{{ $t("playlists.title") }}</h1>
      <button
        v-if="!creating"
        type="button"
        class="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-paper-100 transition-colors hover:border-gold-400 hover:text-gold-400"
        @click="creating = true"
      >
        <Plus :size="16" /> {{ $t("playlists.new") }}
      </button>
    </div>

    <form
      v-if="creating"
      class="mb-6 flex items-center gap-2"
      @submit.prevent="createPlaylist"
    >
      <input
        v-model="newName"
        type="text"
        autofocus
        :placeholder="$t('playlists.namePlaceholder')"
        class="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-paper-100 outline-none focus:border-gold-400"
      />
      <button
        type="submit"
        :disabled="submitting"
        class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950 hover:bg-gold-500 disabled:opacity-60"
      >
        {{ $t("common.create") }}
      </button>
      <button
        type="button"
        class="rounded-xl border border-white/10 px-4 py-2 text-sm text-paper-400 hover:text-paper-100"
        @click="creating = false"
      >
        {{ $t("common.cancel") }}
      </button>
    </form>

    <p v-if="loading" class="text-sm text-paper-400">{{ $t("common.loading") }}</p>
    <p v-else-if="!playlists.length" class="text-sm text-paper-400">{{ $t("playlists.empty") }}</p>

    <div v-else class="flex flex-col divide-y divide-white/10">
      <RouterLink
        v-for="pl in playlists"
        :key="pl.id"
        :to="`/playlist/${pl.id}`"
        class="flex items-center gap-3 py-3 text-paper-100 hover:text-gold-400"
      >
        <ListMusic :size="18" class="text-paper-400" />
        <div>
          <p class="text-sm">{{ pl.name }}</p>
          <p class="text-xs text-paper-400">{{ $t("common.tracksCount", { n: pl.songCount }, pl.songCount) }}</p>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
