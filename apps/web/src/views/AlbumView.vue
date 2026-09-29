<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { AlbumID3, Song } from "@floria-tune/types";
import { usePlayerStore } from "@floria-tune/store";
import { useNavidrome } from "../composables/useNavidrome";
import TrackRow from "../components/TrackRow.vue";
import StarButton from "../components/StarButton.vue";
import { Play } from "lucide-vue-next";

const route = useRoute();
const api = useNavidrome();
const player = usePlayerStore();

const album = ref<AlbumID3 | null>(null);
const songs = ref<Song[]>([]);
const loading = ref(true);

const coverUrl = computed(() => (album.value?.coverArt ? api.coverArtUrl(album.value.coverArt, 400) : null));

async function load(id: string) {
  loading.value = true;
  const data = await api.getAlbum(id);
  album.value = data.album;
  songs.value = data.song;
  loading.value = false;
}

onMounted(() => load(route.params.id as string));
watch(
  () => route.params.id,
  (id) => load(id as string),
);
</script>

<template>
  <div v-if="!loading && album">
    <div class="mb-8 flex gap-6">
      <div class="h-52 w-52 shrink-0 overflow-hidden rounded-xl bg-ink-800 shadow-xl shadow-black/30 ring-1 ring-white/10">
        <img v-if="coverUrl" :src="coverUrl" alt="" class="h-full w-full object-cover" />
      </div>
      <div class="flex flex-col justify-end">
        <p class="text-xs uppercase tracking-wide text-paper-400">{{ $t("album.label") }}</p>
        <h1 class="mt-1 font-display text-4xl text-paper-100">{{ album.name }}</h1>
        <RouterLink
          :to="`/artist/${album.artistId}`"
          class="mt-2 w-fit text-sm text-paper-400 hover:text-gold-400"
        >
          {{ album.artist }}
        </RouterLink>
        <p class="mt-1 text-xs text-paper-400">
          {{ album.year }} · {{ $t("common.tracksCount", { n: songs.length }, songs.length) }}
        </p>

        <button
          class="mt-4 flex w-fit items-center gap-2 rounded-xl bg-gold-400 px-5 py-2 shadow-lg shadow-gold-400/20 text-sm font-medium text-ink-950 hover:bg-gold-500"
          @click="player.playNow(songs, 0)"
        >
          <Play :size="16" /> {{ $t("album.play") }}
        </button>
      </div>

      <StarButton
        class="ml-2 self-end"
        :starred="!!album.starred"
        :target="{ albumId: album.id }"
        :size="22"
      />
    </div>

    <div class="flex flex-col">
      <TrackRow v-for="(song, i) in songs" :key="song.id" :song="song" :index="i" :queue="songs" />
    </div>
  </div>
  <p v-else class="text-sm text-paper-400">{{ $t("common.loading") }}</p>
</template>
