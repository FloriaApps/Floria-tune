<script setup lang="ts">
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from "vue";
import { usePlayerStore, useAuthStore, useUiStore } from "@floria-tune/store";
import type { LyricCue, LyricCueLine, LyricsResult } from "@floria-tune/navidrome";
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
} from "lucide-vue-next";
import { formatDuration } from "../composables/format";
import StarButton from "./StarButton.vue";
import TrackRow from "./TrackRow.vue";

const player = usePlayerStore();
const auth = useAuthStore();
const ui = useUiStore();

const coverUrl = computed(() =>
  player.current?.coverArt && auth.api ? auth.api.coverArtUrl(player.current.coverArt, 700) : null,
);

const seekModel = computed({
  get: () => (player.durationSec ? (player.positionSec / player.durationSec) * 100 : 0),
  set: (pct: number) => player.seek((pct / 100) * player.durationSec),
});

function trackFill(pct: number) {
  const clamped = Math.min(100, Math.max(0, pct));
  return {
    background: `linear-gradient(to right, rgb(var(--color-gold-400)) ${clamped}%, rgb(var(--color-paper-400) / 0.25) ${clamped}%)`,
  };
}

// A aba fica na store de UI (não num ref local) para que o ícone de fila da
// PlayerBar possa abrir o overlay direto na aba "Fila".
const tab = computed({
  get: () => ui.nowPlayingTab,
  set: (v: "lyrics" | "queue") => (ui.nowPlayingTab = v),
});

// ---- Letra da música ------------------------------------------------
const lyrics = ref<LyricsResult | null | undefined>(undefined);

// Referências aos elementos <p> de cada linha, pra rolar até a ativa.
// Declarado ANTES de loadLyrics: como o watcher abaixo roda com
// `immediate: true`, ele pode chamar loadLyrics() ainda durante a
// inicialização do componente — se `lineEls` fosse declarado depois, um
// `let` em TDZ (temporal dead zone) faria isso explodir com
// "Cannot access 'lineEls' before initialization".
let lineEls: (HTMLElement | null)[] = [];
function setLineEl(el: Element | ComponentPublicInstance | null, i: number) {
  lineEls[i] = (el as HTMLElement) ?? null;
}

// Guarda de qual música a letra em `lyrics` pertence, pra dois problemas:
// (1) não recarregar de novo só por alternar de aba sem trocar de música;
// (2) nunca mostrar a letra errada (do que tocava antes) quando o painel
//     estava na aba "Fila" durante a troca de faixa.
let lyricsLoadedForId: string | null = null;

async function loadLyrics() {
  const song = player.current;
  if (!song) {
    lyrics.value = null;
    lyricsLoadedForId = null;
    return;
  }
  if (lyricsLoadedForId === song.id) return; // já carregada pra essa música

  const requestedId = song.id;
  lyrics.value = undefined; // undefined = carregando
  lineEls = [];
  const result = auth.api ? await auth.api.getLyrics(requestedId) : null;

  // Corrida: o usuário pode ter trocado de música enquanto a letra estava
  // sendo buscada. Se trocou, esse resultado já não vale mais — descarta.
  if (player.current?.id !== requestedId) return;

  lyrics.value = result;
  lyricsLoadedForId = requestedId;
}

// Um único watcher cobrindo os três gatilhos (abrir o painel, trocar de
// aba, trocar de música): sempre que qualquer um muda e a aba visível é
// "Letra", tenta carregar — loadLyrics() decide sozinho se precisa buscar
// de novo ou se já tem a letra certa em cache.
watch(
  () => [ui.nowPlayingOpen, tab.value, player.current?.id] as const,
  ([open, t]) => {
    if (open && t === "lyrics") void loadLyrics();
  },
  { immediate: true },
);

// ---- Acompanhamento em tempo real -----------------------------------
// Linha atual: a última cujo `start` (ms) já passou da posição da música.
const activeLineIndex = computed(() => {
  if (!lyrics.value?.synced) return -1;
  const posMs = player.positionSec * 1000;
  let idx = -1;
  for (const [i, line] of lyrics.value.lines.entries()) {
    if (line.start !== undefined && line.start <= posMs) idx = i;
    else break;
  }
  return idx;
});

// cueLine = a mesma linha, mas com timing por palavra/sílaba (extensão
// songLyrics v2 do OpenSubsonic, Navidrome 0.63+). É uma estrutura
// PARALELA ao `line` normal, referenciada por `index` — só existe quando
// o servidor tem esse dado pra essa letra; senão a linha ativa cai pro
// destaque simples (linha inteira), sem quebra por palavra.
const activeCueLine = computed<LyricCueLine | null>(() => {
  if (activeLineIndex.value < 0) return null;
  return lyrics.value?.cueLines?.find((cl) => cl.index === activeLineIndex.value) ?? null;
});

type CueState = "sung" | "current" | "upcoming";
function cueState(cue: LyricCue): CueState {
  if (cue.start === undefined) return "upcoming";
  const posMs = player.positionSec * 1000;
  if (cue.end !== undefined && posMs >= cue.end) return "sung";
  if (posMs >= cue.start) return "current";
  return "upcoming";
}

watch(activeLineIndex, async (idx) => {
  if (idx < 0) return;
  await nextTick();
  // jsdom (ambiente de teste) não implementa scrollIntoView — daí o
  // encadeamento opcional também no método, não só no elemento.
  lineEls[idx]?.scrollIntoView?.({ behavior: "smooth", block: "center" });
});

/** Clicar numa linha (ou numa palavra específica, se houver cueLine) pula o áudio pra lá. */
function onLineClick(startMs: number | undefined) {
  if (!lyrics.value?.synced || startMs === undefined) return;
  player.seek(startMs / 1000);
}
</script>

<template>
  <Transition name="overlay">
    <div v-if="ui.nowPlayingOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <!-- Véu de fundo -->
      <div class="absolute inset-0 bg-ink-950/80 backdrop-blur-xl" @click="ui.closeNowPlaying()" />

      <div
        class="now-playing-panel relative flex w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-ink-900/60 shadow-2xl shadow-black/50 backdrop-blur-2xl"
      >
        <!-- Brilho ambiente vindo da própria capa -->
        <div
          v-if="coverUrl"
          class="pointer-events-none absolute inset-0 scale-125 bg-cover bg-center opacity-30 blur-[100px]"
          :style="{ backgroundImage: `url(${coverUrl})` }"
        />
        <div class="pointer-events-none absolute inset-0 bg-ink-950/40" />

        <button
          type="button"
          class="absolute right-5 top-5 z-10 text-paper-400 transition-colors hover:text-paper-100"
          :title="$t('common.close')"
          @click="ui.closeNowPlaying()"
        >
          <X :size="22" />
        </button>

        <div class="relative grid w-full grid-cols-1 gap-10 p-8 sm:p-10 md:grid-cols-[20rem_1fr]">
          <!-- Coluna esquerda: capa grande + transporte -->
          <div class="flex flex-col items-center md:items-start">
            <div
              class="aspect-square w-full max-w-[20rem] overflow-hidden rounded-2xl bg-ink-800 shadow-2xl shadow-black/50 ring-1 ring-white/10"
            >
              <img v-if="coverUrl" :src="coverUrl" alt="" class="h-full w-full object-cover" />
            </div>

            <div class="mt-6 flex w-full items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate font-display text-2xl text-paper-100">
                  {{ player.current?.title ?? $t("player.nothingPlaying") }}
                </p>
                <p class="truncate text-sm text-paper-400">{{ player.current?.artist ?? "—" }}</p>
              </div>
              <StarButton
                v-if="player.current"
                class="mt-1 shrink-0"
                :starred="!!player.current.starred"
                :target="{ id: player.current.id }"
                :size="20"
              />
            </div>

            <div class="mt-6 w-full">
              <input
                v-model.number="seekModel"
                type="range"
                min="0"
                max="100"
                step="0.1"
                class="slider w-full"
                :style="trackFill(seekModel)"
              />
              <div class="mt-1.5 flex justify-between text-[11px] tabular-nums text-paper-400">
                <span>{{ formatDuration(player.positionSec) }}</span>
                <span>{{ formatDuration(player.durationSec) }}</span>
              </div>
            </div>

            <div class="mt-6 flex w-full items-center justify-center gap-6">
              <button
                class="text-paper-400 transition-colors hover:text-paper-100"
                :class="{ '!text-gold-400': player.shuffle }"
                :title="$t('player.shuffle')"
                @click="player.toggleShuffle()"
              >
                <Shuffle :size="18" />
              </button>
              <button class="text-paper-200 hover:text-paper-100" @click="player.previous()">
                <SkipBack :size="22" />
              </button>
              <button
                class="flex h-14 w-14 items-center justify-center rounded-full bg-paper-100 text-ink-950 shadow-xl shadow-black/40 transition-transform hover:scale-105 active:scale-95"
                @click="player.toggle()"
              >
                <Pause v-if="player.isPlaying" :size="22" />
                <Play v-else :size="22" class="ml-0.5" />
              </button>
              <button class="text-paper-200 hover:text-paper-100" @click="player.next()">
                <SkipForward :size="22" />
              </button>
              <button
                class="text-paper-400 transition-colors hover:text-paper-100"
                :class="{ '!text-gold-400': player.repeat !== 'off' }"
                :title="$t('player.repeat')"
                @click="player.cycleRepeat()"
              >
                <Repeat1 v-if="player.repeat === 'one'" :size="18" />
                <Repeat v-else :size="18" />
              </button>
            </div>
          </div>

          <!-- Coluna direita: abas Letra / Fila -->
          <div class="flex min-h-0 flex-col">
            <div class="mb-4 flex gap-1 border-b border-white/10">
              <button
                type="button"
                class="border-b-2 px-3 pb-3 text-sm transition-colors"
                :class="
                  tab === 'lyrics'
                    ? 'border-gold-400 text-gold-400'
                    : 'border-transparent text-paper-400 hover:text-paper-100'
                "
                @click="tab = 'lyrics'"
              >
                {{ $t("nowPlaying.lyrics") }}
              </button>
              <button
                type="button"
                class="border-b-2 px-3 pb-3 text-sm transition-colors"
                :class="
                  tab === 'queue'
                    ? 'border-gold-400 text-gold-400'
                    : 'border-transparent text-paper-400 hover:text-paper-100'
                "
                @click="tab = 'queue'"
              >
                {{ $t("nowPlaying.queueCount", { n: player.queue.length }, player.queue.length) }}
              </button>
            </div>

            <div class="relative min-h-0 flex-1">
              <template v-if="tab === 'lyrics'">
                <p v-if="lyrics === undefined" class="text-sm text-paper-400">{{ $t("nowPlaying.loadingLyrics") }}</p>
                <p v-else-if="lyrics === null" class="text-sm text-paper-400">
                  {{ $t("nowPlaying.noLyrics") }}
                </p>
                <div
                  v-else
                  class="lyrics-scroll flex h-full flex-col gap-3.5 overflow-y-auto py-6 pr-1"
                >
                  <p
                    v-for="(line, i) in lyrics.lines"
                    :key="i"
                    :ref="(el) => setLineEl(el, i)"
                    class="leading-relaxed transition-all duration-300"
                    :class="[
                      lyrics.synced && line.start !== undefined ? 'cursor-pointer' : '',
                      i === activeLineIndex
                        ? 'scale-[1.03] text-xl font-medium'
                        : 'text-base text-paper-400 hover:text-paper-100',
                    ]"
                    @click="onLineClick(line.start)"
                  >
                    <!-- Linha ativa COM timing por palavra (Navidrome 0.63+,
                         extensão songLyrics v2): cada palavra pinta conforme
                         é cantada — o karaokê de verdade, palavra por
                         palavra. Clicar numa palavra pula pra ela. -->
                    <template v-if="i === activeLineIndex && activeCueLine?.cue?.length">
                      <span
                        v-for="(cue, ci) in activeCueLine.cue"
                        :key="ci"
                        class="transition-colors duration-150"
                        :class="{
                          'text-paper-100': cueState(cue) === 'sung',
                          'text-gold-400': cueState(cue) === 'current',
                          'text-paper-400': cueState(cue) === 'upcoming',
                        }"
                        @click.stop="onLineClick(cue.start)"
                      >
                        {{ cue.value }}
                      </span>
                    </template>
                    <!-- Sem dado por palavra pra essa linha (servidor mais
                         antigo, ou letra sem essa granularidade): destaque
                         de linha inteira, como antes. -->
                    <template v-else>
                      {{ line.value || "\u00A0" }}
                    </template>
                  </p>
                </div>
              </template>

              <template v-else>
                <p v-if="!player.queue.length" class="text-sm text-paper-400">{{ $t("nowPlaying.emptyQueue") }}</p>
                <div v-else class="flex h-full flex-col overflow-y-auto pr-1">
                  <TrackRow
                    v-for="(song, i) in player.queue"
                    :key="song.id + i"
                    :song="song"
                    :index="i"
                    :queue="player.queue"
                  />
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slider {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 999px;
  outline: none;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 13px;
  height: 13px;
  border-radius: 999px;
  background: rgb(var(--color-paper-100));
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  cursor: pointer;
}
.slider::-moz-range-thumb {
  width: 13px;
  height: 13px;
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

/* Fade suave no topo/base da letra — some antes de cortar a linha seca,
   e disfarça o scroll automático entrando/saindo de tela. */
.lyrics-scroll {
  mask-image: linear-gradient(to bottom, transparent, black 12%, black 88%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 12%, black 88%, transparent);
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}
.lyrics-scroll::-webkit-scrollbar {
  width: 6px;
}
.lyrics-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
}
.lyrics-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}
.overlay-enter-active .now-playing-panel,
.overlay-leave-active .now-playing-panel {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
.overlay-enter-from .now-playing-panel,
.overlay-leave-to .now-playing-panel {
  opacity: 0;
  transform: scale(0.97) translateY(8px);
}
</style>
