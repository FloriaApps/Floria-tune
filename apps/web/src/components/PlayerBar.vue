<script setup lang="ts">
import { computed } from "vue";
import { usePlayerStore, useAuthStore, useUiStore } from "@floria-tune/store";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  ChevronUp,
  ListMusic,
} from "lucide-vue-next";
import { formatDuration } from "../composables/format";
import StarButton from "./StarButton.vue";

const player = usePlayerStore();
const auth = useAuthStore();
const ui = useUiStore();

const coverUrl = computed(() =>
  player.current?.coverArt && auth.api ? auth.api.coverArtUrl(player.current.coverArt, 200) : null,
);

const seekModel = computed({
  get: () => (player.durationSec ? (player.positionSec / player.durationSec) * 100 : 0),
  set: (pct: number) => player.seek((pct / 100) * player.durationSec),
});

const volumeModel = computed({
  get: () => player.volume * 100,
  set: (pct: number) => player.setVolume(pct / 100),
});

function trackFill(pct: number) {
  const clamped = Math.min(100, Math.max(0, pct));
  return {
    background: `linear-gradient(to right, rgb(var(--color-gold-400)) ${clamped}%, rgb(var(--color-paper-400) / 0.25) ${clamped}%)`,
  };
}

const volumeIcon = computed(() => {
  if (player.volume <= 0) return VolumeX;
  if (player.volume < 0.5) return Volume1;
  return Volume2;
});

let lastVolume = 1;

function toggleMute() {
  if (player.volume > 0) {
    lastVolume = player.volume;
    player.setVolume(0);
  } else {
    player.setVolume(lastVolume || 1);
  }
}
</script>

<template>
  <footer
    class="relative z-10 mx-4 mb-4 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/50 shadow-2xl shadow-black/40 backdrop-blur-2xl"
  >
    <!-- Brilho ambiente: a própria capa do álbum, ampliada e borrada atrás
         do vidro — dá o "glow" de cor por trás do painel translúcido. -->
    <Transition name="fade" mode="out-in">
      <div
        v-if="coverUrl"
        :key="coverUrl"
        class="pointer-events-none absolute inset-0 scale-150 bg-cover bg-center opacity-40 blur-3xl"
        :style="{ backgroundImage: `url(${coverUrl})` }"
      />
    </Transition>
    <div class="pointer-events-none absolute inset-0 bg-ink-950/30" />

    <!-- Grid simétrico de 3 colunas: os controles de transporte ficam
         verdadeiramente centralizados no meio da barra. Uso minmax(0, 1fr)
         em vez de 1fr puro nas laterais — 1fr sozinho vira minmax(auto, 1fr),
         e esse "auto" impede a coluna de encolher abaixo do tamanho mínimo
         do conteúdo, fazendo o volume "vazar" pra fora quando a barra fica
         estreita (sidebar bem larga, janela pequena etc). Com minmax(0, 1fr)
         a coluna pode encolher de verdade, e min-w-0 nos containers internos
         deixa o slider de volume encolher junto em vez de estourar. -->
    <div
      class="relative grid h-20 grid-cols-[minmax(0,1fr)_minmax(240px,2fr)_minmax(0,1fr)] items-center gap-3 px-4 sm:gap-4 sm:px-6"
    >
      <!-- Faixa atual (clique abre a tela "Agora tocando" expandida) -->
      <div class="flex min-w-0 items-center gap-2">
        <button
          type="button"
          class="group/track flex min-w-0 items-center gap-3 text-left"
          :disabled="!player.current"
          @click="ui.openNowPlaying('lyrics')"
        >
          <div
            class="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-800 shadow-lg ring-1 ring-white/10"
          >
            <img v-if="coverUrl" :src="coverUrl" alt="" class="h-full w-full object-cover" />
            <div
              v-if="player.current"
              class="absolute inset-0 flex items-center justify-center bg-ink-950/0 opacity-0 transition-all group-hover/track:bg-ink-950/50 group-hover/track:opacity-100"
            >
              <ChevronUp :size="16" class="text-paper-100" />
            </div>
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-paper-100">
              {{ player.current?.title ?? $t("player.nothingPlaying") }}
            </p>
            <p class="truncate text-xs text-paper-400">{{ player.current?.artist ?? "—" }}</p>
          </div>
        </button>

        <StarButton
          v-if="player.current"
          class="shrink-0"
          :starred="!!player.current.starred"
          :target="{ id: player.current.id }"
          :size="15"
        />
      </div>

      <!-- Transporte + progresso, centralizado -->
      <div class="flex min-w-0 flex-col items-center gap-2">
        <div class="flex items-center gap-5">
          <button
            class="text-paper-400 transition-colors hover:text-paper-100"
            :class="{ '!text-gold-400': player.shuffle }"
            :title="$t('player.shuffle')"
            @click="player.toggleShuffle()"
          >
            <Shuffle :size="16" />
          </button>
          <button class="text-paper-300 transition-colors hover:text-paper-100" @click="player.previous()">
            <SkipBack :size="18" />
          </button>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full bg-paper-100 text-ink-950 shadow-lg shadow-black/40 transition-transform hover:scale-105 active:scale-95"
            @click="player.toggle()"
          >
            <Pause v-if="player.isPlaying" :size="17" />
            <Play v-else :size="17" class="ml-0.5" />
          </button>
          <button class="text-paper-300 transition-colors hover:text-paper-100" @click="player.next()">
            <SkipForward :size="18" />
          </button>
          <button
            class="text-paper-400 transition-colors hover:text-paper-100"
            :class="{ '!text-gold-400': player.repeat !== 'off' }"
            :title="$t('player.repeat')"
            @click="player.cycleRepeat()"
          >
            <Repeat1 v-if="player.repeat === 'one'" :size="16" />
            <Repeat v-else :size="16" />
          </button>
        </div>

        <div class="flex w-full max-w-xl items-center gap-2.5 text-[11px] tabular-nums text-paper-400">
          <span class="w-9 shrink-0 text-right">{{ formatDuration(player.positionSec) }}</span>
          <input
            v-model.number="seekModel"
            type="range"
            min="0"
            max="100"
            step="0.1"
            class="slider min-w-0 flex-1"
            :style="trackFill(seekModel)"
          />
          <span class="w-9 shrink-0">{{ formatDuration(player.durationSec) }}</span>
        </div>
      </div>

      <!-- Fila + volume -->
      <div class="flex min-w-0 items-center justify-end gap-3">
        <button
          type="button"
          class="relative shrink-0 text-paper-400 transition-colors hover:text-paper-100"
          :title="$t('player.viewQueue')"
          @click="ui.openNowPlaying('queue')"
        >
          <ListMusic :size="18" />
          <span
            v-if="player.queue.length"
            class="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-400 px-1 text-[9px] font-semibold text-ink-950"
          >
            {{ player.queue.length }}
          </span>
        </button>

        <div class="flex w-full min-w-0 max-w-[120px] items-center gap-2">
          <button
            class="shrink-0 text-paper-400 transition-colors hover:text-paper-100"
            :title="player.volume <= 0 ? $t('player.unmute') : $t('player.mute')"
            @click="toggleMute"
          >
            <component :is="volumeIcon" :size="16" />
          </button>
          <input
            v-model.number="volumeModel"
            type="range"
            min="0"
            max="100"
            step="1"
            class="slider min-w-0 flex-1"
            :style="trackFill(volumeModel)"
          />
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.slider {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 999px;
  outline: none;
  transition: height 0.15s ease;
}
.slider:hover {
  height: 5px;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: rgb(var(--color-paper-100));
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: transform 0.15s ease;
}
.slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}
.slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: none;
  border-radius: 999px;
  background: rgb(var(--color-paper-100));
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  cursor: pointer;
}
.slider::-webkit-slider-runnable-track {
  background: transparent;
}
.slider::-moz-range-track {
  background: transparent;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
