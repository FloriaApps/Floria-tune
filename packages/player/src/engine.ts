import type { PlayerState, RepeatMode, Song } from "@floria-tune/types";
import type { NavidromeApi } from "@floria-tune/navidrome";

type Listener = (state: PlayerState) => void;

/**
 * Motor de reprodução único para todas as plataformas.
 *
 * Web, Capacitor (Android/iOS) e Tauri (desktop) rodam código dentro de uma
 * webview, então `HTMLAudioElement` funciona nas três sem diferenciação de
 * plataforma — é exatamente a ideia de "Mesma API" do diagrama do projeto:
 * o Vue chama player.play()/pause()/seek() e nunca precisa saber em que
 * sistema está rodando.
 *
 * Pontos de extensão nativa futura (opcionais, não exigidos para funcionar):
 *  - Mobile: plugin do Capacitor para manter áudio em segundo plano.
 *  - Desktop: comandos Tauri/Rust para media keys do sistema operacional.
 * Ambos podem ser plugados aqui dentro sem mudar quem consome o PlayerEngine.
 */
export class PlayerEngine {
  private audio: HTMLAudioElement;
  private listeners = new Set<Listener>();
  private scrobbledCurrent = false;
  private lastQueueSaveAt = 0;
  private maxBitRateKbps: number | undefined;

  private state: PlayerState = {
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

  /**
   * @param api Client autenticado usado para montar URLs de stream/capa e
   *   registrar scrobbles.
   * @param audioElement Elemento de áudio a controlar. Em produção é sempre
   *   omitido (usa um `new Audio()` de verdade); testes injetam um objeto
   *   compatível para não depender do `<audio>` real do navegador.
   */
  constructor(
    private api: NavidromeApi,
    audioElement: HTMLAudioElement = new Audio(),
  ) {
    this.audio = audioElement;
    this.audio.preload = "metadata";
    this.bindAudioEvents();
    this.setupMediaSession();
  }

  // ---- API pública --------------------------------------------------------

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): PlayerState {
    return this.state;
  }

  /** Substitui a fila e começa a tocar a partir de startIndex. */
  setQueue(songs: Song[], startIndex = 0) {
    this.state.queue = songs;
    this.state.index = startIndex;
    this.loadCurrent(true);
    this.saveQueueState();
  }

  /** Adiciona ao fim da fila atual sem interromper a reprodução. */
  enqueue(songs: Song[]) {
    this.state.queue = [...this.state.queue, ...songs];
    this.emit();
    this.saveQueueState();
  }

  play() {
    void this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  toggle() {
    if (this.state.isPlaying) this.pause();
    else this.play();
  }

  seek(seconds: number) {
    this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration || 0));
  }

  setVolume(volume: number) {
    this.state.volume = Math.max(0, Math.min(1, volume));
    this.audio.volume = this.state.volume;
    this.emit();
  }

  toggleShuffle() {
    this.state.shuffle = !this.state.shuffle;
    this.emit();
  }

  cycleRepeat() {
    const order: RepeatMode[] = ["off", "all", "one"];
    const next = order[(order.indexOf(this.state.repeat) + 1) % order.length];
    this.state.repeat = next;
    this.emit();
  }

  /**
   * Define a qualidade máxima de streaming (kbps), ou `undefined` para
   * deixar o servidor decidir automaticamente. Se já tem uma faixa tocando,
   * reaplica na hora, preservando a posição atual.
   */
  setStreamQuality(kbps: number | undefined) {
    this.maxBitRateKbps = kbps;
    if (!this.state.current) return;
    const wasPlaying = this.state.isPlaying;
    const resumeAt = this.audio.currentTime;
    this.audio.src = this.api.streamUrl(this.state.current.id, this.maxBitRateKbps);
    this.audio.currentTime = resumeAt;
    if (wasPlaying) void this.audio.play();
  }

  next() {
    if (!this.state.queue.length) return;
    if (this.state.repeat === "one") {
      this.loadCurrent(true);
      return;
    }
    const nextIndex = this.computeNextIndex(1);
    if (nextIndex === null) {
      this.pause();
      return;
    }
    this.state.index = nextIndex;
    this.loadCurrent(true);
  }

  previous() {
    if (!this.state.queue.length) return;
    // Se já tocou mais de 3s, "anterior" volta para o início da faixa atual
    // (comportamento padrão de qualquer player de música).
    if (this.audio.currentTime > 3) {
      this.seek(0);
      return;
    }
    const prevIndex = this.computeNextIndex(-1);
    if (prevIndex === null) return;
    this.state.index = prevIndex;
    this.loadCurrent(true);
  }

  destroy() {
    this.audio.pause();
    this.audio.src = "";
    this.listeners.clear();
  }

  // ---- internos -----------------------------------------------------------

  private computeNextIndex(direction: 1 | -1): number | null {
    const { queue, index, shuffle, repeat } = this.state;
    if (shuffle) {
      if (queue.length <= 1) return index;
      let candidate = index;
      while (candidate === index) candidate = Math.floor(Math.random() * queue.length);
      return candidate;
    }
    const raw = index + direction;
    if (raw < 0) return repeat === "all" ? queue.length - 1 : null;
    if (raw >= queue.length) return repeat === "all" ? 0 : null;
    return raw;
  }

  private loadCurrent(autoplay: boolean) {
    const song = this.state.queue[this.state.index] ?? null;
    this.state.current = song;
    this.scrobbledCurrent = false;

    if (!song) {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.emit();
      return;
    }

    this.audio.src = this.api.streamUrl(song.id, this.maxBitRateKbps);
    this.updateMediaSessionMetadata(song);
    if (autoplay) void this.audio.play();
    this.emit();
  }

  private bindAudioEvents() {
    this.audio.addEventListener("play", () => {
      this.state.isPlaying = true;
      if (this.state.current) void this.api.scrobble(this.state.current.id, false);
      this.emit();
    });
    this.audio.addEventListener("pause", () => {
      this.state.isPlaying = false;
      this.saveQueueState();
      this.emit();
    });
    this.audio.addEventListener("timeupdate", () => {
      this.state.positionSec = this.audio.currentTime;
      // Convenção comum de scrobble: registrar como "ouvida" após 50% da
      // faixa (ou 4 min, o que vier primeiro), evitando contagens falsas.
      const halfway = this.audio.duration ? this.audio.duration / 2 : Infinity;
      if (!this.scrobbledCurrent && this.state.current && this.audio.currentTime >= Math.min(halfway, 240)) {
        this.scrobbledCurrent = true;
        void this.api.scrobble(this.state.current.id, true);
      }
      // Salva a posição no servidor a cada ~15s (não a cada timeupdate, que
      // dispara várias vezes por segundo) — assim, se o app fechar sem
      // pausar, ainda dá pra retomar de perto de onde parou em outro
      // aparelho.
      const now = Date.now();
      if (now - this.lastQueueSaveAt > 15_000) {
        this.lastQueueSaveAt = now;
        this.saveQueueState();
      }
      this.emit();
    });
    this.audio.addEventListener("loadedmetadata", () => {
      this.state.durationSec = this.audio.duration || 0;
      this.emit();
    });
    this.audio.addEventListener("ended", () => this.next());
    this.audio.addEventListener("volumechange", () => {
      this.state.volume = this.audio.volume;
      this.emit();
    });
  }

  private setupMediaSession() {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", () => this.play());
    navigator.mediaSession.setActionHandler("pause", () => this.pause());
    navigator.mediaSession.setActionHandler("previoustrack", () => this.previous());
    navigator.mediaSession.setActionHandler("nexttrack", () => this.next());
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) this.seek(details.seekTime);
    });
  }

  private updateMediaSessionMetadata(song: Song) {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (typeof MediaMetadata === "undefined") return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist ?? "",
      album: song.album ?? "",
      artwork: song.coverArt
        ? [{ src: this.api.coverArtUrl(song.coverArt, 512), sizes: "512x512", type: "image/jpeg" }]
        : [],
    });
  }

  private emit() {
    for (const l of this.listeners) l(this.state);
  }

  /** Envia a fila + faixa atual + posição para o servidor (best-effort). */
  private saveQueueState() {
    if (!this.state.queue.length) return;
    // Lê direto de `this.audio.currentTime` em vez de `this.state.positionSec`:
    // este último só é atualizado pelo evento 'timeupdate', que pode não ter
    // disparado ainda no exato momento do pause/troca de faixa.
    void this.api.savePlayQueue(
      this.state.queue.map((s) => s.id),
      this.state.current?.id,
      Math.round(this.audio.currentTime * 1000),
    );
  }
}
