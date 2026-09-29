import { defineStore } from "pinia";

const THEME_KEY = "floria-tune:theme";
const LOCALE_KEY = "floria-tune:locale";
const SIDEBAR_WIDTH_KEY = "floria-tune:sidebar-width";
const STREAM_QUALITY_KEY = "floria-tune:stream-quality";

const DEFAULT_THEME = "mono"; // preto e branco — tema principal do app
const DEFAULT_LOCALE = "en"; // inglês é o idioma primário do app
const DEFAULT_SIDEBAR_WIDTH = 240;
const SIDEBAR_MIN_WIDTH = 180;
const SIDEBAR_MAX_WIDTH = 340;

/** Qualidades de streaming oferecidas — undefined = "automático" (sem maxBitRate, o Navidrome decide). */
export type StreamQuality = "auto" | 128 | 192 | 320;

function readLocalStorage(key: string): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null; // Safari em modo privado, por exemplo, pode lançar aqui
  }
}

function writeLocalStorage(key: string, value: string) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  } catch {
    // não é crítico: a preferência simplesmente não persiste entre sessões
  }
}

function clampSidebarWidth(px: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(px)));
}

function parseStreamQuality(raw: string | null): StreamQuality {
  if (raw === "128" || raw === "192" || raw === "320") return Number(raw) as StreamQuality;
  return "auto";
}

interface UiStateShape {
  nowPlayingOpen: boolean;
  nowPlayingTab: "lyrics" | "queue";
  theme: string;
  locale: string;
  sidebarWidth: number;
  streamQuality: StreamQuality;
}

export const useUiStore = defineStore("ui", {
  state: (): UiStateShape => ({
    nowPlayingOpen: false,
    nowPlayingTab: "lyrics",
    theme: readLocalStorage(THEME_KEY) || DEFAULT_THEME,
    locale: readLocalStorage(LOCALE_KEY) || DEFAULT_LOCALE,
    sidebarWidth: clampSidebarWidth(Number(readLocalStorage(SIDEBAR_WIDTH_KEY)) || DEFAULT_SIDEBAR_WIDTH),
    streamQuality: parseStreamQuality(readLocalStorage(STREAM_QUALITY_KEY)),
  }),

  getters: {
    /** undefined = deixa o servidor decidir (sem maxBitRate na URL de stream). */
    streamQualityKbps: (state): number | undefined =>
      state.streamQuality === "auto" ? undefined : state.streamQuality,
  },

  actions: {
    openNowPlaying(tab: "lyrics" | "queue" = "lyrics") {
      this.nowPlayingTab = tab;
      this.nowPlayingOpen = true;
    },
    closeNowPlaying() {
      this.nowPlayingOpen = false;
    },
    toggleNowPlaying() {
      this.nowPlayingOpen = !this.nowPlayingOpen;
    },

    setTheme(id: string) {
      this.theme = id;
      writeLocalStorage(THEME_KEY, id);
      this.applyTheme();
    },

    /** Aplica o tema atual ao <html> — chamar uma vez no boot do app. */
    applyTheme() {
      if (typeof document !== "undefined") {
        document.documentElement.dataset.theme = this.theme;
      }
    },

    /**
     * Só guarda a preferência — quem realmente troca o idioma ativo do
     * vue-i18n é o app (ver apps/web/src/i18n), pra este pacote não
     * precisar depender da lib de i18n.
     */
    setLocale(id: string) {
      this.locale = id;
      writeLocalStorage(LOCALE_KEY, id);
    },

    setSidebarWidth(px: number) {
      this.sidebarWidth = clampSidebarWidth(px);
      writeLocalStorage(SIDEBAR_WIDTH_KEY, String(this.sidebarWidth));
    },

    setStreamQuality(quality: StreamQuality) {
      this.streamQuality = quality;
      writeLocalStorage(STREAM_QUALITY_KEY, String(quality));
    },
  },
});
