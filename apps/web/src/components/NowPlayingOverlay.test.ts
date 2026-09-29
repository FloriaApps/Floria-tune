// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useAuthStore, usePlayerStore, useUiStore } from "@floria-tune/store";
import { i18n } from "../i18n";
import NowPlayingOverlay from "./NowPlayingOverlay.vue";

import type { LyricsResult } from "@floria-tune/navidrome";

function fakeApi() {
  return {
    getLyrics: vi.fn(
      async (id: string): Promise<LyricsResult | null> => ({
        synced: false,
        lines: [{ value: `lyrics for ${id}` }],
      }),
    ),
    coverArtUrl: vi.fn(() => "https://example.com/cover.jpg"),
    getPlaylists: vi.fn().mockResolvedValue([]),
  };
}

function songA() {
  return { id: "a", title: "Song A", starred: undefined };
}
function songB() {
  return { id: "b", title: "Song B", starred: undefined };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("NowPlayingOverlay lyrics panel", () => {
  let api: ReturnType<typeof fakeApi>;

  beforeEach(() => {
    setActivePinia(createPinia());
    api = fakeApi();
    const auth = useAuthStore();
    // @ts-expect-error -- fake mínimo só com o que este painel usa
    auth.api = api;
  });

  function mountOverlay() {
    return mount(NowPlayingOverlay, { global: { plugins: [i18n] } });
  }

  it("carrega a letra da música atual ao abrir na aba Letra", async () => {
    const player = usePlayerStore();
    player.current = songA();
    const ui = useUiStore();
    ui.openNowPlaying("lyrics");

    const wrapper = mountOverlay();
    await flush();

    expect(api.getLyrics).toHaveBeenCalledWith("a");
    expect(wrapper.text()).toContain("lyrics for a");
  });

  it("não recarrega a letra só por alternar de aba sem trocar de música", async () => {
    const player = usePlayerStore();
    player.current = songA();
    const ui = useUiStore();
    ui.openNowPlaying("lyrics");

    mountOverlay();
    await flush();
    expect(api.getLyrics).toHaveBeenCalledOnce();

    ui.nowPlayingTab = "queue";
    await flush();
    ui.nowPlayingTab = "lyrics";
    await flush();

    expect(api.getLyrics).toHaveBeenCalledOnce(); // continua só 1x
  });

  it("busca a letra certa ao trocar de música enquanto o painel estava na aba Fila (bug corrigido)", async () => {
    const player = usePlayerStore();
    player.current = songA();
    const ui = useUiStore();
    ui.openNowPlaying("lyrics");

    const wrapper = mountOverlay();
    await flush();
    expect(wrapper.text()).toContain("lyrics for a");

    // Troca para a aba Fila e, enquanto isso, a música muda (ex.: acabou e
    // avançou pra próxima sozinha).
    ui.nowPlayingTab = "queue";
    await flush();
    player.current = songB();
    await flush();

    // Antes da correção, isso ficava mostrando a letra da música A (cache
    // nunca invalidado) em vez de buscar a da música B.
    ui.nowPlayingTab = "lyrics";
    await flush();

    expect(api.getLyrics).toHaveBeenCalledWith("b");
    expect(wrapper.text()).toContain("lyrics for b");
    expect(wrapper.text()).not.toContain("lyrics for a");
  });

  it("descarta uma resposta de letra que chegou atrasada para uma música que já não é mais a atual", async () => {
    const player = usePlayerStore();
    player.current = songA();
    const ui = useUiStore();
    ui.openNowPlaying("lyrics");

    // Resposta lenta para a música A.
    let resolveA!: (v: { synced: boolean; lines: { value: string }[] }) => void;
    api.getLyrics.mockImplementationOnce(
      () => new Promise((resolve) => (resolveA = resolve)),
    );

    const wrapper = mountOverlay();
    await flush();

    // Música muda para B antes da resposta de A chegar.
    player.current = songB();
    await flush();
    expect(api.getLyrics).toHaveBeenCalledWith("b");

    // Agora a resposta atrasada de A finalmente chega.
    resolveA({ synced: false, lines: [{ value: "lyrics for a" }] });
    await flush();

    // Não pode sobrescrever a letra de B, que já deve estar carregada.
    expect(wrapper.text()).toContain("lyrics for b");
    expect(wrapper.text()).not.toContain("lyrics for a");
  });

  it("destaca a linha certa conforme a posição da música avança (letra sincronizada)", async () => {
    api.getLyrics.mockResolvedValueOnce({
      synced: true,
      lines: [
        { value: "primeira linha", start: 1000 },
        { value: "segunda linha", start: 5000 },
        { value: "terceira linha", start: 9000 },
      ],
    });

    const player = usePlayerStore();
    player.current = songA();
    player.positionSec = 0.5; // antes da primeira linha começar
    const ui = useUiStore();
    ui.openNowPlaying("lyrics");

    const wrapper = mountOverlay();
    await flush();

    const lines = () => wrapper.findAll("p").filter((p) => p.text().includes("linha"));

    // Ainda nenhuma linha começou.
    expect(lines().some((p) => p.classes().includes("text-xl"))).toBe(false);

    player.positionSec = 6; // depois da 2ª linha, antes da 3ª
    await flush();

    const active = lines().find((p) => p.classes().includes("text-xl"));
    expect(active?.text()).toBe("segunda linha");
  });

  it("não destaca nenhuma linha quando a letra não é sincronizada (sem start)", async () => {
    // fakeApi() já retorna synced:false por padrão
    const player = usePlayerStore();
    player.current = songA();
    player.positionSec = 999; // não deveria importar, sem timestamps
    const ui = useUiStore();
    ui.openNowPlaying("lyrics");

    const wrapper = mountOverlay();
    await flush();

    expect(wrapper.findAll("p").some((p) => p.classes().includes("text-xl"))).toBe(false);
  });

  it("clicar numa linha sincronizada pula o áudio para o timestamp dela", async () => {
    api.getLyrics.mockResolvedValueOnce({
      synced: true,
      lines: [
        { value: "primeira linha", start: 1000 },
        { value: "segunda linha", start: 5000 },
      ],
    });

    const player = usePlayerStore();
    player.current = songA();
    const seekSpy = vi.spyOn(player, "seek").mockImplementation(() => {});
    const ui = useUiStore();
    ui.openNowPlaying("lyrics");

    const wrapper = mountOverlay();
    await flush();

    const secondLine = wrapper.findAll("p").find((p) => p.text() === "segunda linha");
    await secondLine!.trigger("click");

    expect(seekSpy).toHaveBeenCalledWith(5); // 5000ms -> 5s
  });

  it("clicar numa linha sem timestamp (letra não sincronizada) não faz nada", async () => {
    const player = usePlayerStore();
    player.current = songA(); // fakeApi() retorna synced:false
    const seekSpy = vi.spyOn(player, "seek").mockImplementation(() => {});
    const ui = useUiStore();
    ui.openNowPlaying("lyrics");

    const wrapper = mountOverlay();
    await flush();

    const line = wrapper.findAll("p").find((p) => p.text().includes("lyrics for a"));
    await line!.trigger("click");

    expect(seekSpy).not.toHaveBeenCalled();
  });

  it("destaca palavra por palavra a linha ativa quando o servidor manda cueLine (Navidrome 0.63+)", async () => {
    api.getLyrics.mockResolvedValueOnce({
      synced: true,
      lines: [{ value: "You and I", start: 1000 }],
      cueLines: [
        {
          index: 0,
          start: 1000,
          end: 4000,
          value: "You and I",
          cue: [
            { start: 1000, end: 1800, value: "You " },
            { start: 1800, end: 2400, value: "and " },
            { start: 2400, end: 3200, value: "I" },
          ],
        },
      ],
    });

    const player = usePlayerStore();
    player.current = songA();
    player.positionSec = 2.0; // dentro da 2ª palavra ("and ")
    const ui = useUiStore();
    ui.openNowPlaying("lyrics");

    const wrapper = mountOverlay();
    await flush();

    const words = wrapper.find(".lyrics-scroll").findAll("span");
    const you = words.find((w) => w.text() === "You");
    const and = words.find((w) => w.text() === "and");
    const i = words.find((w) => w.text() === "I");

    expect(you?.classes()).toContain("text-paper-100"); // já cantada
    expect(and?.classes()).toContain("text-gold-400"); // sendo cantada agora
    expect(i?.classes()).toContain("text-paper-400"); // ainda não chegou
  });

  it("clicar numa palavra específica pula pro timestamp dela, não só o início da linha", async () => {
    api.getLyrics.mockResolvedValueOnce({
      synced: true,
      lines: [{ value: "You and I", start: 1000 }],
      cueLines: [
        {
          index: 0,
          start: 1000,
          end: 4000,
          value: "You and I",
          cue: [
            { start: 1000, end: 1800, value: "You " },
            { start: 1800, end: 2400, value: "and " },
            { start: 2400, end: 3200, value: "I" },
          ],
        },
      ],
    });

    const player = usePlayerStore();
    player.current = songA();
    player.positionSec = 1.0;
    const seekSpy = vi.spyOn(player, "seek").mockImplementation(() => {});
    const ui = useUiStore();
    ui.openNowPlaying("lyrics");

    const wrapper = mountOverlay();
    await flush();

    const thirdWord = wrapper.find(".lyrics-scroll").findAll("span").find((w) => w.text() === "I");
    await thirdWord!.trigger("click");

    expect(seekSpy).toHaveBeenCalledWith(2.4); // 2400ms -> 2.4s, não o start da linha (1s)
  });

  it("sem cueLine (servidor antigo ou sem esse dado), a linha ativa destaca inteira, sem quebra por palavra", async () => {
    const player = usePlayerStore();
    player.current = songA(); // fakeApi() não manda cueLines
    player.positionSec = 999;
    const ui = useUiStore();
    ui.openNowPlaying("lyrics");

    const wrapper = mountOverlay();
    await flush();

    const lyricsArea = wrapper.find(".lyrics-scroll");
    expect(lyricsArea.findAll("span")).toHaveLength(0); // nenhuma quebra em palavras
  });
});
