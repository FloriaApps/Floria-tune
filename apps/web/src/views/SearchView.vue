<script setup lang="ts">
import { ref, watch } from "vue";
import type { SearchResult3 } from "@floria-tune/types";
import { useNavidrome } from "../composables/useNavidrome";
import AlbumCard from "../components/AlbumCard.vue";
import TrackRow from "../components/TrackRow.vue";
import { Search } from "lucide-vue-next";

const api = useNavidrome();
const query = ref("");
const results = ref<SearchResult3 | null>(null);
const loading = ref(false);
let debounceHandle: ReturnType<typeof setTimeout> | undefined;

watch(query, (q) => {
  clearTimeout(debounceHandle);
  if (!q.trim()) {
    results.value = null;
    return;
  }
  debounceHandle = setTimeout(async () => {
    loading.value = true;
    results.value = await api.search3(q.trim());
    loading.value = false;
  }, 300);
});
</script>

<template>
  <div>
    <div class="relative max-w-xl">
      <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-paper-400" />
      <input
        v-model="query"
        type="search"
        :placeholder="$t('search.placeholder')"
        class="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-paper-100 outline-none focus:border-gold-400"
      />
    </div>

    <p v-if="loading" class="mt-6 text-sm text-paper-400">{{ $t("search.searching") }}</p>

    <template v-else-if="results">
      <section v-if="results.artist.length" class="mt-8">
        <h2 class="mb-3 font-display text-xl text-paper-100">{{ $t("search.artists") }}</h2>
        <div class="flex flex-wrap gap-6">
          <AlbumCard
            v-for="a in results.artist"
            :key="a.id"
            :title="a.name"
            :cover-art="a.coverArt"
            :to="`/artist/${a.id}`"
          />
        </div>
      </section>

      <section v-if="results.album.length" class="mt-8">
        <h2 class="mb-3 font-display text-xl text-paper-100">{{ $t("search.albums") }}</h2>
        <div class="flex flex-wrap gap-6">
          <AlbumCard
            v-for="al in results.album"
            :key="al.id"
            :title="al.name"
            :subtitle="al.artist"
            :cover-art="al.coverArt"
            :to="`/album/${al.id}`"
          />
        </div>
      </section>

      <section v-if="results.song.length" class="mt-8">
        <h2 class="mb-3 font-display text-xl text-paper-100">{{ $t("search.songs") }}</h2>
        <div class="flex flex-col">
          <TrackRow
            v-for="(song, i) in results.song"
            :key="song.id"
            :song="song"
            :index="i"
            :queue="results.song"
          />
        </div>
      </section>

      <p
        v-if="!results.artist.length && !results.album.length && !results.song.length"
        class="mt-6 text-sm text-paper-400"
      >
        {{ $t("search.noResults", { query }) }}
      </p>
    </template>
  </div>
</template>
