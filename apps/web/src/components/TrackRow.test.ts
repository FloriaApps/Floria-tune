// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import TrackRow from "./TrackRow.vue";
import { i18n } from "../i18n";

// A store real é usada (não mockada) porque TrackRow só chama
// player.playNow()/toggle(), que aqui vamos espionar depois de criado o
// pinia — sem precisar de login nem de um NavidromeApi de verdade, já que
// não estamos clicando em um item "atual" (o que criaria o engine).
import { usePlayerStore, useAuthStore } from "@floria-tune/store";

const song = { id: "s1", title: "Come Together", artist: "The Beatles", album: "Abbey Road", duration: 259 };

describe("TrackRow", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // StarButton (renderizado dentro de TrackRow) precisa de uma API
    // autenticada — aqui é só um fake com star/unstar espionáveis.
    const auth = useAuthStore();
    // @ts-expect-error -- fake mínimo só com o que o StarButton usa
    auth.api = { star: vi.fn().mockResolvedValue(undefined), unstar: vi.fn().mockResolvedValue(undefined) };
  });

  it("mostra título, artista, álbum e duração formatada", () => {
    const wrapper = mount(TrackRow, {
      props: { song, index: 0, queue: [song] },
      global: { plugins: [i18n] },
    });

    expect(wrapper.text()).toContain("Come Together");
    expect(wrapper.text()).toContain("The Beatles");
    expect(wrapper.text()).toContain("Abbey Road");
    expect(wrapper.text()).toContain("4:19"); // 259s -> 4:19
    expect(wrapper.text()).toContain("1"); // número da faixa (index + 1)
  });

  it("ao clicar numa faixa que não é a atual, chama playNow com a fila e o índice certos", async () => {
    const wrapper = mount(TrackRow, {
      props: { song, index: 2, queue: [song] },
      global: { plugins: [i18n] },
    });
    const player = usePlayerStore();
    const playNowSpy = vi.spyOn(player, "playNow").mockImplementation(() => {});

    await wrapper.find("button").trigger("click");

    expect(playNowSpy).toHaveBeenCalledWith([song], 2);
  });

  it("ao clicar na faixa que já está tocando, apenas alterna toggle() em vez de reiniciar", async () => {
    const wrapper = mount(TrackRow, {
      props: { song, index: 0, queue: [song] },
      global: { plugins: [i18n] },
    });
    const player = usePlayerStore();
    // Simula que essa já é a faixa atual sem precisar de um engine de verdade.
    player.current = song;
    const toggleSpy = vi.spyOn(player, "toggle").mockImplementation(() => {});
    const playNowSpy = vi.spyOn(player, "playNow").mockImplementation(() => {});

    await wrapper.find("button").trigger("click");

    expect(toggleSpy).toHaveBeenCalledOnce();
    expect(playNowSpy).not.toHaveBeenCalled();
  });
});
