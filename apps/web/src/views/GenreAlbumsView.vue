<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { AlbumID3, Song } from "@floria-tune/types";
import { usePlayerStore } from "@floria-tune/store";
import { useNavidrome } from "../composables/useNavidrome";
import AlbumCard from "../components/AlbumCard.vue";
import { Shuffle } from "lucide-vue-next";

const route = useRoute();
const api = useNavidrome();
const player = usePlayerStore();

const genreName = () => decodeURIComponent(route.params.name as string);

const albums = ref<AlbumID3[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  albums.value = await api.getAlbumList2("byGenre", 60, { genre: genreName() });
  loading.value = false;
}

/** Toca uma amostra de músicas desse gênero direto, sem escolher álbum. */
async function playGenreMix() {
  const result = await api.search3(genreName());
  const songs: Song[] = result.song;
  if (songs.length) player.playNow(songs, 0);
}

onMounted(load);
watch(() => route.params.name, load);
</script>

<template>
  <div>
    <div class="mb-8 flex items-center justify-between">
      <div>
        <p class="text-xs uppercase tracking-wide text-paper-400">{{ $t("genres.label") }}</p>
        <h1 class="mt-1 font-display text-3xl text-paper-100">{{ genreName() }}</h1>
      </div>
      <button
        class="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-paper-100 transition-colors hover:border-gold-400 hover:text-gold-400"
        @click="playGenreMix"
      >
        <Shuffle :size="16" /> {{ $t("genres.playMix") }}
      </button>
    </div>

    <p v-if="loading" class="text-sm text-paper-400">{{ $t("common.loading") }}</p>
    <p v-else-if="!albums.length" class="text-sm text-paper-400">{{ $t("genres.noAlbums") }}</p>

    <div v-else class="flex flex-wrap gap-6">
      <AlbumCard
        v-for="album in albums"
        :key="album.id"
        :title="album.name"
        :subtitle="album.artist"
        :cover-art="album.coverArt"
        :to="`/album/${album.id}`"
      />
    </div>
  </div>
</template>
