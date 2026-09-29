<script setup lang="ts">
import { ref } from "vue";
import { Plus, Check } from "lucide-vue-next";
import { useNavidrome } from "../composables/useNavidrome";
import type { Playlist } from "@floria-tune/types";

const props = defineProps<{ songId: string }>();

const api = useNavidrome();
const open = ref(false);
const loaded = ref(false);
const playlists = ref<Playlist[]>([]);
const addedTo = ref<Set<string>>(new Set());
const creating = ref(false);
const newName = ref("");

async function toggle() {
  open.value = !open.value;
  if (open.value && !loaded.value) {
    playlists.value = await api.getPlaylists();
    loaded.value = true;
  }
}

async function addTo(playlistId: string) {
  await api.addSongsToPlaylist(playlistId, [props.songId]);
  addedTo.value.add(playlistId);
}

async function createAndAdd() {
  const name = newName.value.trim();
  if (!name) return;
  await api.createPlaylist(name, [props.songId]);
  newName.value = "";
  creating.value = false;
  loaded.value = false; // força recarregar a lista da próxima vez que abrir
  close();
}

function close() {
  open.value = false;
  creating.value = false;
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="text-paper-400 transition-colors hover:text-paper-100"
      :title="$t('addToPlaylist.trigger')"
      @click.stop="toggle"
    >
      <Plus :size="15" />
    </button>

    <template v-if="open">
      <!-- Véu invisível só para fechar ao clicar fora -->
      <div class="fixed inset-0 z-30" @click.stop="close" />

      <div
        class="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-white/10 bg-ink-900/90 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl"
      >
        <p v-if="loaded && !playlists.length" class="px-3 py-2 text-xs text-paper-400">
          {{ $t("addToPlaylist.empty") }}
        </p>

        <button
          v-for="pl in playlists"
          :key="pl.id"
          type="button"
          class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-paper-100 transition-colors hover:bg-white/5"
          @click.stop="addTo(pl.id)"
        >
          <span class="truncate">{{ pl.name }}</span>
          <Check v-if="addedTo.has(pl.id)" :size="14" class="shrink-0 text-gold-400" />
        </button>

        <div class="mt-1 border-t border-white/10 pt-1.5">
          <input
            v-if="creating"
            v-model="newName"
            type="text"
            :placeholder="$t('playlists.namePlaceholder')"
            class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-paper-100 outline-none focus:border-gold-400"
            @click.stop
            @keyup.enter="createAndAdd"
            @keyup.esc="creating = false"
          />
          <button
            v-else
            type="button"
            class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gold-400 transition-colors hover:bg-white/5"
            @click.stop="creating = true"
          >
            <Plus :size="14" /> {{ $t("playlists.new") }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
