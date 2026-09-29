<script setup lang="ts">
import type { AlbumID3 } from "@floria-tune/types";
import AlbumCard from "./AlbumCard.vue";

defineProps<{
  title: string;
  albums: AlbumID3[];
  loading?: boolean;
}>();
</script>

<template>
  <section>
    <h2 class="mb-3 font-display text-xl text-paper-100">{{ title }}</h2>

    <p v-if="loading" class="text-sm text-paper-400">{{ $t("common.loading") }}</p>
    <p v-else-if="!albums.length" class="text-sm text-paper-400">{{ $t("common.nothingHere") }}</p>

    <div v-else class="shelf-scroll -mx-1 flex gap-5 overflow-x-auto px-1 pb-2">
      <AlbumCard
        v-for="album in albums"
        :key="album.id"
        class="shrink-0"
        :title="album.name"
        :subtitle="album.artist"
        :cover-art="album.coverArt"
        :to="`/album/${album.id}`"
      />
    </div>
  </section>
</template>

<style scoped>
/* Barra de rolagem discreta, só quando necessário, combinando com o tema */
.shelf-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}
.shelf-scroll::-webkit-scrollbar {
  height: 6px;
}
.shelf-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
}
.shelf-scroll::-webkit-scrollbar-track {
  background: transparent;
}
</style>
