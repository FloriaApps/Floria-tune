// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useAuthStore } from "@floria-tune/store";
import AddToPlaylistMenu from "./AddToPlaylistMenu.vue";
import { i18n } from "../i18n";

function fakeApi() {
  return {
    getPlaylists: vi.fn().mockResolvedValue([
      { id: "pl1", name: "Favoritas", songCount: 3, duration: 100 },
      { id: "pl2", name: "Treino", songCount: 10, duration: 200 },
    ]),
    addSongsToPlaylist: vi.fn().mockResolvedValue(undefined),
    createPlaylist: vi.fn().mockResolvedValue(undefined),
  };
}

describe("AddToPlaylistMenu", () => {
  let api: ReturnType<typeof fakeApi>;

  beforeEach(() => {
    setActivePinia(createPinia());
    api = fakeApi();
    const auth = useAuthStore();
    // @ts-expect-error -- fake mínimo só com o que este componente usa
    auth.api = api;
  });

  it("não carrega playlists até o menu ser aberto", () => {
    mount(AddToPlaylistMenu, { props: { songId: "s1" }, global: { plugins: [i18n] } });
    expect(api.getPlaylists).not.toHaveBeenCalled();
  });

  it("ao abrir, busca e lista as playlists existentes", async () => {
    const wrapper = mount(AddToPlaylistMenu, { props: { songId: "s1" }, global: { plugins: [i18n] } });
    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(api.getPlaylists).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain("Favoritas");
    expect(wrapper.text()).toContain("Treino");
  });

  it("clicar numa playlist adiciona a música nela", async () => {
    const wrapper = mount(AddToPlaylistMenu, { props: { songId: "s1" }, global: { plugins: [i18n] } });
    await wrapper.find("button").trigger("click");
    await flushPromises();

    const playlistButtons = wrapper.findAll("button").filter((b) => b.text().includes("Favoritas"));
    await playlistButtons[0].trigger("click");

    expect(api.addSongsToPlaylist).toHaveBeenCalledWith("pl1", ["s1"]);
  });

  it("cria uma playlist nova com a música já dentro", async () => {
    const wrapper = mount(AddToPlaylistMenu, { props: { songId: "s1" }, global: { plugins: [i18n] } });
    await wrapper.find("button").trigger("click");
    await flushPromises();

    const newPlaylistButton = wrapper.findAll("button").find((b) => b.text().includes("New playlist"));
    await newPlaylistButton!.trigger("click");

    const input = wrapper.find("input");
    await input.setValue("Road trip");
    await input.trigger("keyup.enter");

    expect(api.createPlaylist).toHaveBeenCalledWith("Road trip", ["s1"]);
  });
});

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
