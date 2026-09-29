<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { AlbumID3, Song } from "@floria-tune/types";
import { usePlayerStore } from "@floria-tune/store";
import { useNavidrome } from "../composables/useNavidrome";
import AlbumShelf from "../components/AlbumShelf.vue";
import { Shuffle, Play } from "lucide-vue-next";

const api = useNavidrome();
const player = usePlayerStore();

const newest = ref<AlbumID3[]>([]);
const recentlyPlayed = ref<AlbumID3[]>([]);
const random = ref<AlbumID3[]>([]);
const loading = ref(true);
const errorMessage = ref<string | null>(null);

// "Continuar de onde parou": fila salva no servidor (extensão OpenSubsonic
// getPlayQueue/savePlayQueue), útil quando você trocou de dispositivo.
const savedQueue = ref<{ current?: string; positionMs: number; entry: Song[] } | null>(null);

/** Toca 40 músicas aleatórias direto, sem precisar entrar em nenhum álbum. */
async function playRandomMix() {
  const songs: Song[] = await api.getRandomSongs(40);
  player.playNow(songs, 0);
}

function resumeSavedQueue() {
  if (!savedQueue.value) return;
  const { entry, current, positionMs } = savedQueue.value;
  const startIndex = current ? Math.max(0, entry.findIndex((s) => s.id === current)) : 0;
  player.playNow(entry, startIndex);
  if (positionMs > 0) player.seek(positionMs / 1000);
  savedQueue.value = null; // já usamos, não precisa mais mostrar o card
}

onMounted(async () => {
  try {
    // As três prateleiras são independentes, então buscamos em paralelo em
    // vez de uma atrás da outra. A fila salva também não bloqueia o resto.
    const [newestAlbums, recentAlbums, randomAlbums, queue] = await Promise.all([
      api.getAlbumList2("newest", 16), // últimos lançamentos (adicionados ao servidor)
      api.getAlbumList2("recent", 16), // últimos tocados
      api.getAlbumList2("random", 16), // aleatório
      api.getPlayQueue(),
    ]);
    newest.value = newestAlbums;
    recentlyPlayed.value = recentAlbums;
    random.value = randomAlbums;
    savedQueue.value = queue;
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : "Failed to load your library.";
  } finally {
    loading.value = false;
  }
});

function currentSong(queue: { current?: string; entry: Song[] }) {
  return queue.entry.find((s) => s.id === queue.current) ?? queue.entry[0];
}

function coverUrl(song: Song) {
  return song.coverArt ? api.coverArtUrl(song.coverArt, 200) : null;
}
</script>

<template>
  <div>
    <div class="mb-10 flex items-center justify-between">
      <div>
        <h1 class="font-display text-3xl text-paper-100">{{ $t("library.title") }}</h1>
        <p class="mt-1 text-sm text-paper-400">{{ $t("library.subtitle") }}</p>
      </div>
      <button
        class="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-paper-100 transition-colors hover:border-gold-400 hover:text-gold-400"
        @click="playRandomMix"
      >
        <Shuffle :size="16" /> {{ $t("library.playRandom") }}
      </button>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-400">{{ errorMessage }}</p>

    <div v-else class="flex flex-col gap-10">
      <button
        v-if="savedQueue"
        type="button"
        class="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:border-gold-400/50"
        @click="resumeSavedQueue"
      >
        <div class="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-800">
          <img
            v-if="coverUrl(currentSong(savedQueue))"
            :src="coverUrl(currentSong(savedQueue))!"
            alt=""
            class="h-full w-full object-cover"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs uppercase tracking-wide text-paper-400">{{ $t("library.resumeLabel") }}</p>
          <p class="truncate text-sm text-paper-100">{{ currentSong(savedQueue).title }}</p>
          <p class="truncate text-xs text-paper-400">{{ currentSong(savedQueue).artist }}</p>
        </div>
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-400 text-ink-950">
          <Play :size="16" class="ml-0.5" />
        </div>
      </button>

      <AlbumShelf :title="$t('library.newest')" :albums="newest" :loading="loading" />
      <AlbumShelf :title="$t('library.recentlyPlayed')" :albums="recentlyPlayed" :loading="loading" />
      <AlbumShelf :title="$t('library.random')" :albums="random" :loading="loading" />
    </div>
  </div>
</template>
