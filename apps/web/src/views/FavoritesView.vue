<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { ArtistID3, AlbumID3, Song } from "@floria-tune/types";
import { usePlayerStore } from "@floria-tune/store";
import { useNavidrome } from "../composables/useNavidrome";
import AlbumCard from "../components/AlbumCard.vue";
import TrackRow from "../components/TrackRow.vue";
import { Play } from "lucide-vue-next";

const api = useNavidrome();
const player = usePlayerStore();

const artists = ref<ArtistID3[]>([]);
const albums = ref<AlbumID3[]>([]);
const songs = ref<Song[]>([]);
const loading = ref(true);

onMounted(async () => {
  const starred = await api.getStarred2();
  artists.value = starred.artist;
  albums.value = starred.album;
  songs.value = starred.song;
  loading.value = false;
});
</script>

<template>
  <div>
    <h1 class="font-display text-3xl text-paper-100">{{ $t("favorites.title") }}</h1>
    <p class="mt-1 text-sm text-paper-400">{{ $t("favorites.subtitle") }}</p>

    <p v-if="loading" class="mt-8 text-sm text-paper-400">{{ $t("common.loading") }}</p>

    <template v-else>
      <p
        v-if="!artists.length && !albums.length && !songs.length"
        class="mt-8 text-sm text-paper-400"
      >
        {{ $t("favorites.empty") }}
      </p>

      <section v-if="artists.length" class="mt-8">
        <h2 class="mb-3 font-display text-xl text-paper-100">{{ $t("search.artists") }}</h2>
        <div class="flex flex-wrap gap-6">
          <AlbumCard
            v-for="a in artists"
            :key="a.id"
            :title="a.name"
            :cover-art="a.coverArt"
            :to="`/artist/${a.id}`"
          />
        </div>
      </section>

      <section v-if="albums.length" class="mt-8">
        <h2 class="mb-3 font-display text-xl text-paper-100">{{ $t("search.albums") }}</h2>
        <div class="flex flex-wrap gap-6">
          <AlbumCard
            v-for="al in albums"
            :key="al.id"
            :title="al.name"
            :subtitle="al.artist"
            :cover-art="al.coverArt"
            :to="`/album/${al.id}`"
          />
        </div>
      </section>

      <section v-if="songs.length" class="mt-8">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="font-display text-xl text-paper-100">{{ $t("search.songs") }}</h2>
          <button
            class="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-paper-100 transition-colors hover:border-gold-400 hover:text-gold-400"
            @click="player.playNow(songs, 0)"
          >
            <Play :size="14" /> {{ $t("common.playAll") }}
          </button>
        </div>
        <div class="flex flex-col">
          <TrackRow v-for="(song, i) in songs" :key="song.id" :song="song" :index="i" :queue="songs" />
        </div>
      </section>
    </template>
  </div>
</template>
