import { defineStore } from "pinia";
import { markRaw, type Raw } from "vue";
import { PlayerEngine } from "@floria-tune/player";
import type { PlayerState, Song } from "@floria-tune/types";
import { useAuthStore } from "./auth";
import { useUiStore } from "./ui";

interface PlayerStoreShape extends PlayerState {
  _engine: Raw<PlayerEngine> | null;
}

function emptyState(): PlayerStoreShape {
  return {
    _engine: null,
    current: null,
    queue: [],
    index: -1,
    isPlaying: false,
    positionSec: 0,
    durationSec: 0,
    volume: 1,
    shuffle: false,
    repeat: "off",
  };
}

export const usePlayerStore = defineStore("player", {
  state: (): PlayerStoreShape => emptyState(),

  actions: {
    /** Cria o motor de áudio assim que o usuário está autenticado. Idempotente. */
    ensureEngine() {
      if (this._engine) return this._engine;
      const auth = useAuthStore();
      if (!auth.api) throw new Error("Faça login antes de iniciar o player.");
      const engine = new PlayerEngine(auth.api);
      engine.setStreamQuality(useUiStore().streamQualityKbps);
      engine.subscribe((state) => {
        this.current = state.current;
        this.queue = state.queue;
        this.index = state.index;
        this.isPlaying = state.isPlaying;
        this.positionSec = state.positionSec;
        this.durationSec = state.durationSec;
        this.volume = state.volume;
        this.shuffle = state.shuffle;
        this.repeat = state.repeat;
      });
      this._engine = markRaw(engine);
      return engine;
    },

    playNow(songs: Song[], startIndex = 0) {
      this.ensureEngine().setQueue(songs, startIndex);
    },
    enqueue(songs: Song[]) {
      this.ensureEngine().enqueue(songs);
    },
    toggle() {
      this.ensureEngine().toggle();
    },
    next() {
      this.ensureEngine().next();
    },
    previous() {
      this.ensureEngine().previous();
    },
    seek(sec: number) {
      this.ensureEngine().seek(sec);
    },
    setVolume(v: number) {
      this.ensureEngine().setVolume(v);
    },
    toggleShuffle() {
      this.ensureEngine().toggleShuffle();
    },
    cycleRepeat() {
      this.ensureEngine().cycleRepeat();
    },
    setStreamQuality(kbps: number | undefined) {
      this._engine?.setStreamQuality(kbps);
    },
    teardown() {
      this._engine?.destroy();
      Object.assign(this, emptyState());
    },
  },
});
