<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useNavidrome } from "../composables/useNavidrome";
import { Tags, ChevronRight } from "lucide-vue-next";

const api = useNavidrome();
const genres = ref<{ name: string; songCount: number; albumCount: number }[]>([]);
const loading = ref(true);

onMounted(async () => {
  const list = await api.getGenres();
  genres.value = [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  loading.value = false;
});
</script>

<template>
  <div>
    <h1 class="font-display text-3xl text-paper-100">{{ $t("genres.title") }}</h1>
    <p class="mt-1 text-sm text-paper-400">{{ $t("genres.subtitle") }}</p>

    <p v-if="loading" class="mt-8 text-sm text-paper-400">{{ $t("common.loading") }}</p>
    <p v-else-if="!genres.length" class="mt-8 text-sm text-paper-400">
      {{ $t("genres.empty") }}
    </p>

    <div v-else class="mt-6 flex flex-col divide-y divide-white/10">
      <RouterLink
        v-for="genre in genres"
        :key="genre.name"
        :to="`/genre/${encodeURIComponent(genre.name)}`"
        class="flex items-center gap-3 py-3 text-paper-100 transition-colors hover:text-gold-400"
      >
        <Tags :size="16" class="shrink-0 text-paper-400" />
        <span class="flex-1 truncate text-sm">{{ genre.name }}</span>
        <span class="shrink-0 text-xs text-paper-400">
          {{ $t("common.albumsCount", { n: genre.albumCount }, genre.albumCount) }}
        </span>
        <ChevronRight :size="16" class="shrink-0 text-paper-400" />
      </RouterLink>
    </div>
  </div>
</template>
