import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// Mocamos @floria-tune/player para não instanciar um PlayerEngine de
// verdade (que criaria um `new Audio()`, inexistente em ambiente Node) e
// para verificar que a store liga (subscribe) e delega corretamente.
const subscribeMock = vi.fn((cb: (s: unknown) => void) => {
  cb({
    current: null,
    queue: [],
    index: -1,
    isPlaying: false,
    positionSec: 0,
    durationSec: 0,
    volume: 1,
    shuffle: false,
    repeat: "off",
  });
  return () => {};
});
const setQueueMock = vi.fn();
const toggleMock = vi.fn();
const destroyMock = vi.fn();
const setStreamQualityMock = vi.fn();

vi.mock("@floria-tune/player", () => {
  class FakePlayerEngine {
    subscribe = subscribeMock;
    setQueue = setQueueMock;
    enqueue = vi.fn();
    toggle = toggleMock;
    next = vi.fn();
    previous = vi.fn();
    seek = vi.fn();
    setVolume = vi.fn();
    toggleShuffle = vi.fn();
    cycleRepeat = vi.fn();
    setStreamQuality = setStreamQualityMock;
    destroy = destroyMock;
  }
  return { PlayerEngine: FakePlayerEngine };
});

vi.mock("@floria-tune/navidrome", () => {
  class FakeNavidromeApi {}
  class FakeNavidromeClient {}
  return { NavidromeApi: FakeNavidromeApi, NavidromeClient: FakeNavidromeClient };
});

import { usePlayerStore } from "./player";
import { useAuthStore } from "./auth";
import { useUiStore } from "./ui";

describe("usePlayerStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    subscribeMock.mockClear();
    setQueueMock.mockClear();
    toggleMock.mockClear();
    destroyMock.mockClear();
    setStreamQualityMock.mockClear();
  });

  it("recusa iniciar o player antes do login (evita usar API nula)", () => {
    const player = usePlayerStore();
    expect(() => player.playNow([])).toThrow(/Faça login/);
  });

  it("cria o engine uma única vez (idempotente) assim que autenticado", () => {
    const auth = useAuthStore();
    // @ts-expect-error -- só precisamos de um objeto truthy para o guard de auth.api
    auth.api = {};

    const player = usePlayerStore();
    player.playNow([{ id: "s1", title: "A" }]);
    player.toggle();

    expect(subscribeMock).toHaveBeenCalledOnce(); // engine só foi criado 1x
    expect(setQueueMock).toHaveBeenCalledWith([{ id: "s1", title: "A" }], 0);
    expect(toggleMock).toHaveBeenCalledOnce();
  });

  it("reflete o estado emitido pelo engine via subscribe", () => {
    const auth = useAuthStore();
    // @ts-expect-error -- objeto falso só para passar o guard
    auth.api = {};

    subscribeMock.mockImplementationOnce((cb: (s: unknown) => void) => {
      cb({
        current: { id: "s1", title: "Tocando" },
        queue: [{ id: "s1", title: "Tocando" }],
        index: 0,
        isPlaying: true,
        positionSec: 12,
        durationSec: 200,
        volume: 0.8,
        shuffle: true,
        repeat: "all",
      });
      return () => {};
    });

    const player = usePlayerStore();
    player.ensureEngine();

    expect(player.current?.title).toBe("Tocando");
    expect(player.isPlaying).toBe(true);
    expect(player.shuffle).toBe(true);
    expect(player.repeat).toBe("all");
  });

  it("teardown destrói o engine e reseta o estado", () => {
    const auth = useAuthStore();
    // @ts-expect-error -- objeto falso só para passar o guard
    auth.api = {};

    const player = usePlayerStore();
    player.ensureEngine();
    player.teardown();

    expect(destroyMock).toHaveBeenCalledOnce();
    expect(player.current).toBeNull();
    expect(player.queue).toEqual([]);
  });

  it("aplica a qualidade de streaming salva ao criar o engine, e delega mudanças depois", () => {
    const auth = useAuthStore();
    // @ts-expect-error -- objeto falso só para passar o guard
    auth.api = {};

    const ui = useUiStore();
    ui.setStreamQuality(192);

    const player = usePlayerStore();
    player.ensureEngine();
    expect(setStreamQualityMock).toHaveBeenCalledWith(192);

    player.setStreamQuality(320);
    expect(setStreamQualityMock).toHaveBeenCalledWith(320);
  });
});
