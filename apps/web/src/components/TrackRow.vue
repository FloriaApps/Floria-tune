<script setup lang="ts">
import type { Song } from "@floria-tune/types";
import { usePlayerStore } from "@floria-tune/store";
import { Play, Pause, X } from "lucide-vue-next";
import { formatDuration } from "../composables/format";
import StarButton from "./StarButton.vue";
import AddToPlaylistMenu from "./AddToPlaylistMenu.vue";
import { useNavidrome } from "../composables/useNavidrome";

const props = defineProps<{
  song: Song;
  index: number;
  queue: Song[]; // fila completa da tela (álbum, playlist, resultado de busca...)
  /** Se vier preenchido, mostra o botão de remover essa faixa desta playlist. */
  playlistId?: string;
}>();

const emit = defineEmits<{ removed: [] }>();

const player = usePlayerStore();

function isCurrent() {
  return player.current?.id === props.song.id;
}

function onRowClick() {
  if (isCurrent()) {
    player.toggle();
  } else {
    player.playNow(props.queue, props.index);
  }
}

async function removeFromPlaylist() {
  if (!props.playlistId) return;
  const api = useNavidrome();
  // index = posição da faixa dentro da playlist, exatamente o que
  // removeSongFromPlaylist espera (songIndexToRemove é baseado em 0).
  await api.removeSongFromPlaylist(props.playlistId, props.index);
  emit("removed");
}
</script>

<template>
  <div
    class="group grid w-full grid-cols-[2rem_1fr_10rem_auto_3.5rem] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
    :class="isCurrent() ? 'text-gold-400' : 'text-paper-100'"
  >
    <button type="button" class="flex items-center justify-center" @click="onRowClick">
      <span class="text-sm text-paper-400 group-hover:hidden">{{ index + 1 }}</span>
      <span class="hidden items-center justify-center group-hover:flex">
        <Pause v-if="isCurrent() && player.isPlaying" :size="14" />
        <Play v-else :size="14" />
      </span>
    </button>

    <button type="button" class="min-w-0 text-left" @click="onRowClick">
      <span class="block truncate text-sm">{{ song.title }}</span>
      <span class="block truncate text-xs text-paper-400">{{ song.artist }}</span>
    </button>

    <button type="button" class="truncate text-left text-xs text-paper-400" @click="onRowClick">
      {{ song.album }}
    </button>

    <div class="flex items-center justify-end gap-2.5">
      <StarButton :starred="!!song.starred" :target="{ id: song.id }" :size="15" />
      <AddToPlaylistMenu :song-id="song.id" />
      <button
        v-if="playlistId"
        type="button"
        class="text-paper-400 transition-colors hover:text-red-400"
        :title="$t('trackRow.removeFromPlaylist')"
        @click="removeFromPlaylist"
      >
        <X :size="15" />
      </button>
    </div>

    <span class="text-right text-xs text-paper-400">{{ formatDuration(song.duration) }}</span>
  </div>
</template>
