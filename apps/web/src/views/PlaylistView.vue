<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { PlaylistWithSongs } from "@floria-tune/types";
import { usePlayerStore } from "@floria-tune/store";
import { useNavidrome } from "../composables/useNavidrome";
import TrackRow from "../components/TrackRow.vue";
import { Play, Trash2 } from "lucide-vue-next";

const route = useRoute();
const router = useRouter();
const api = useNavidrome();
const player = usePlayerStore();

const playlist = ref<PlaylistWithSongs | null>(null);
const loading = ref(true);
const confirmingDelete = ref(false);

async function load(id: string) {
  loading.value = true;
  playlist.value = await api.getPlaylist(id);
  loading.value = false;
}

function currentId() {
  return route.params.id as string;
}

async function onSongRemoved() {
  await load(currentId());
}

function onDeleteClick() {
  if (!confirmingDelete.value) {
    confirmingDelete.value = true;
    // Some 3s depois se o usuário não confirmar, para não deixar o botão
    // travado em "tem certeza?" pra sempre.
    setTimeout(() => (confirmingDelete.value = false), 3000);
    return;
  }
  void deletePlaylist();
}

async function deletePlaylist() {
  await api.deletePlaylist(currentId());
  router.push("/playlists");
}

onMounted(() => load(currentId()));
watch(
  () => route.params.id,
  (id) => load(id as string),
);
</script>

<template>
  <div v-if="!loading && playlist">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-wide text-paper-400">{{ $t("playlist.label") }}</p>
        <h1 class="mt-1 font-display text-4xl text-paper-100">{{ playlist.name }}</h1>
        <p class="mt-1 text-xs text-paper-400">
          {{ $t("common.tracksCount", { n: playlist.entry.length }, playlist.entry.length) }}
        </p>
      </div>
      <button
        type="button"
        class="flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors"
        :class="
          confirmingDelete
            ? 'border-red-400 bg-red-400/10 text-red-400'
            : 'border-white/10 text-paper-400 hover:border-red-400/50 hover:text-red-400'
        "
        @click="onDeleteClick"
      >
        <Trash2 :size="14" />
        {{ confirmingDelete ? $t("playlist.confirmDelete") : $t("playlist.delete") }}
      </button>
    </div>

    <button
      class="mt-4 flex items-center gap-2 rounded-xl bg-gold-400 px-5 py-2 shadow-lg shadow-gold-400/20 text-sm font-medium text-ink-950 hover:bg-gold-500"
      @click="player.playNow(playlist.entry, 0)"
    >
      <Play :size="16" /> {{ $t("common.playAll") }}
    </button>

    <div class="mt-6 flex flex-col">
      <TrackRow
        v-for="(song, i) in playlist.entry"
        :key="song.id + i"
        :song="song"
        :index="i"
        :queue="playlist.entry"
        :playlist-id="currentId()"
        @removed="onSongRemoved"
      />
    </div>
  </div>
  <p v-else class="text-sm text-paper-400">{{ $t("common.loading") }}</p>
</template>
