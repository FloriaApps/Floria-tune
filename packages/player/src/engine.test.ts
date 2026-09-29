import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlayerEngine } from "./engine";
import type { NavidromeApi } from "@floria-tune/navidrome";
import type { Song } from "@floria-tune/types";

/**
 * jsdom não implementa `HTMLMediaElement.play()/pause()` de verdade, então
 * testamos o PlayerEngine injetando um "áudio falso" que se comporta como um
 * EventTarget de verdade (os testes disparam eventos manualmente, como
 * 'ended' ou 'timeupdate', para simular a progressão da faixa).
 */
class FakeAudio extends EventTarget {
  currentTime = 0;
  duration = 0;
  volume = 1;
  src = "";
  preload = "";

  play = vi.fn(() => {
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.dispatchEvent(new Event("pause"));
  });
  removeAttribute = vi.fn((name: string) => {
    if (name === "src") this.src = "";
  });
}

function song(id: string): Song {
  return { id, title: `Faixa ${id}` };
}

function fakeApi() {
  return {
    streamUrl: vi.fn((id: string) => `https://exemplo.com/stream/${id}`),
    coverArtUrl: vi.fn((id: string) => `https://exemplo.com/cover/${id}`),
    scrobble: vi.fn().mockResolvedValue(undefined),
    savePlayQueue: vi.fn().mockResolvedValue(undefined),
  };
}

describe("PlayerEngine", () => {
  let audio: FakeAudio;
  let api: ReturnType<typeof fakeApi>;
  let engine: PlayerEngine;

  beforeEach(() => {
    audio = new FakeAudio();
    api = fakeApi();
    engine = new PlayerEngine(api as unknown as NavidromeApi, audio as unknown as HTMLAudioElement);
  });

  it("setQueue troca a fila, carrega a faixa e dá autoplay", () => {
    engine.setQueue([song("a"), song("b"), song("c")], 1);

    expect(engine.getState().current?.id).toBe("b");
    expect(engine.getState().index).toBe(1);
    expect(audio.src).toBe("https://exemplo.com/stream/b");
    expect(audio.play).toHaveBeenCalledOnce();
  });

  it("avança e recua a fila com next()/previous()", () => {
    engine.setQueue([song("a"), song("b"), song("c")], 0);

    engine.next();
    expect(engine.getState().current?.id).toBe("b");

    engine.next();
    expect(engine.getState().current?.id).toBe("c");

    // previous() no início da faixa (currentTime baixo) volta na fila
    audio.currentTime = 0;
    engine.previous();
    expect(engine.getState().current?.id).toBe("b");
  });

  it("previous() reinicia a faixa atual em vez de voltar, se já tocou mais de 3s", () => {
    engine.setQueue([song("a"), song("b")], 1);
    audio.currentTime = 10;

    engine.previous();

    expect(engine.getState().current?.id).toBe("b"); // não voltou para "a"
    expect(audio.currentTime).toBe(0); // reiniciou a própria faixa
  });

  it("sem repeat, para no fim da fila em vez de dar a volta", () => {
    engine.setQueue([song("a"), song("b")], 1);
    engine.next();
    expect(engine.getState().current?.id).toBe("b"); // ficou na última
    expect(audio.pause).toHaveBeenCalled();
  });

  it("com repeat=all, a fila dá a volta nas duas pontas", () => {
    engine.setQueue([song("a"), song("b")], 1);
    engine.cycleRepeat(); // off -> all

    engine.next();
    expect(engine.getState().current?.id).toBe("a"); // voltou pro início

    engine.previous();
    expect(engine.getState().current?.id).toBe("b"); // deu a volta pro fim
  });

  it("com repeat=one, next() recarrega a mesma faixa", () => {
    engine.setQueue([song("a"), song("b")], 0);
    engine.cycleRepeat(); // off -> all
    engine.cycleRepeat(); // all -> one

    engine.next();
    expect(engine.getState().current?.id).toBe("a");
  });

  it("evento 'ended' do áudio avança automaticamente para a próxima faixa", () => {
    engine.setQueue([song("a"), song("b")], 0);
    audio.dispatchEvent(new Event("ended"));
    expect(engine.getState().current?.id).toBe("b");
  });

  it("shuffle nunca escolhe o próprio índice atual quando há mais de uma faixa", () => {
    engine.setQueue([song("a"), song("b"), song("c")], 0);
    engine.toggleShuffle();

    for (let i = 0; i < 20; i++) {
      const before = engine.getState().index;
      engine.next();
      expect(engine.getState().index).not.toBe(before);
    }
  });

  it("play/pause disparam eventos que atualizam isPlaying e chamam scrobble(false) ao começar", () => {
    engine.setQueue([song("a")], 0);
    api.scrobble.mockClear();

    engine.play();
    expect(engine.getState().isPlaying).toBe(true);
    expect(api.scrobble).toHaveBeenCalledWith("a", false);

    engine.pause();
    expect(engine.getState().isPlaying).toBe(false);
  });

  it("registra scrobble de 'ouvida' (submission=true) ao passar da metade da faixa, uma única vez", () => {
    engine.setQueue([song("a")], 0);
    audio.duration = 100;

    audio.currentTime = 40;
    audio.dispatchEvent(new Event("timeupdate"));
    expect(api.scrobble).not.toHaveBeenCalledWith("a", true);

    audio.currentTime = 51;
    audio.dispatchEvent(new Event("timeupdate"));
    expect(api.scrobble).toHaveBeenCalledWith("a", true);

    const callsBefore = api.scrobble.mock.calls.length;
    audio.currentTime = 80;
    audio.dispatchEvent(new Event("timeupdate"));
    // não deve registrar de novo na mesma faixa
    expect(api.scrobble.mock.calls.length).toBe(callsBefore);
  });

  it("seek() nunca ultrapassa os limites [0, duration]", () => {
    engine.setQueue([song("a")], 0);
    audio.duration = 30;

    engine.seek(-5);
    expect(audio.currentTime).toBe(0);

    engine.seek(999);
    expect(audio.currentTime).toBe(30);
  });

  it("setVolume satura entre 0 e 1 e reflete no elemento de áudio", () => {
    engine.setVolume(1.5);
    expect(engine.getState().volume).toBe(1);
    expect(audio.volume).toBe(1);

    engine.setVolume(-0.2);
    expect(engine.getState().volume).toBe(0);
  });

  it("fila vazia: current fica null e o áudio é pausado/limpo", () => {
    engine.setQueue([], 0);
    expect(engine.getState().current).toBeNull();
    expect(audio.pause).toHaveBeenCalled();
  });

  it("subscribe recebe o estado atual imediatamente e depois a cada mudança", () => {
    const states: Array<ReturnType<PlayerEngine["getState"]>> = [];
    const unsubscribe = engine.subscribe((s) => states.push(s));

    expect(states).toHaveLength(1); // chamada imediata na inscrição
    engine.setQueue([song("a")], 0);
    expect(states.length).toBeGreaterThan(1);

    unsubscribe();
    const countAfterUnsub = states.length;
    engine.toggleShuffle();
    expect(states.length).toBe(countAfterUnsub); // não recebe mais nada
  });

  it("salva a fila no servidor (savePlayQueue) ao trocar de fila e ao pausar", () => {
    engine.setQueue([song("a"), song("b")], 0);
    expect(api.savePlayQueue).toHaveBeenCalledWith(["a", "b"], "a", 0);

    api.savePlayQueue.mockClear();
    audio.currentTime = 42;
    engine.pause();
    expect(api.savePlayQueue).toHaveBeenCalledWith(["a", "b"], "a", 42000);
  });

  it("não tenta salvar a fila quando ela está vazia", () => {
    engine.setQueue([], 0);
    expect(api.savePlayQueue).not.toHaveBeenCalled();
  });

  it("setStreamQuality reaplica a URL da faixa atual preservando a posição", () => {
    engine.setQueue([song("a")], 0);
    audio.currentTime = 37;
    api.streamUrl.mockClear();

    engine.setStreamQuality(192);

    expect(api.streamUrl).toHaveBeenCalledWith("a", 192);
    expect(audio.currentTime).toBe(37); // não perdeu a posição ao trocar a URL
  });

  it("setStreamQuality sem faixa tocando só guarda a preferência, sem tocar no áudio", () => {
    api.streamUrl.mockClear();
    engine.setStreamQuality(320);
    expect(api.streamUrl).not.toHaveBeenCalled();

    // e é aplicada na próxima faixa que carregar
    engine.setQueue([song("a")], 0);
    expect(api.streamUrl).toHaveBeenCalledWith("a", 320);
  });
});
