<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { AlbumID3, ArtistID3 } from "@floria-tune/types";
import { useNavidrome } from "../composables/useNavidrome";
import AlbumCard from "../components/AlbumCard.vue";
import StarButton from "../components/StarButton.vue";

const route = useRoute();
const api = useNavidrome();

const artist = ref<ArtistID3 | null>(null);
const albums = ref<AlbumID3[]>([]);
const loading = ref(true);

async function load(id: string) {
  loading.value = true;
  const data = await api.getArtist(id);
  artist.value = data.artist;
  albums.value = data.album;
  loading.value = false;
}

onMounted(() => load(route.params.id as string));
watch(
  () => route.params.id,
  (id) => load(id as string),
);
</script>

<template>
  <div v-if="!loading && artist">
    <div class="flex items-center gap-3">
      <h1 class="font-display text-4xl text-paper-100">{{ artist.name }}</h1>
      <StarButton :starred="!!artist.starred" :target="{ artistId: artist.id }" :size="22" />
    </div>
    <p class="mt-1 text-sm text-paper-400">
      {{ $t("artist.albumsCount", { n: albums.length }, albums.length) }}
    </p>

    <div class="mt-8 flex flex-wrap gap-6">
      <AlbumCard
        v-for="album in albums"
        :key="album.id"
        :title="album.name"
        :subtitle="String(album.year ?? '')"
        :cover-art="album.coverArt"
        :to="`/album/${album.id}`"
      />
    </div>
  </div>
  <p v-else class="text-sm text-paper-400">{{ $t("common.loading") }}</p>
</template>
