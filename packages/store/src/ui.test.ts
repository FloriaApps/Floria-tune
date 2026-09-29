// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useUiStore } from "./ui";

describe("useUiStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("começa no tema padrão e sem nada salvo", () => {
    const ui = useUiStore();
    expect(ui.theme).toBe("mono");
    expect(ui.streamQuality).toBe("auto");
    expect(ui.streamQualityKbps).toBeUndefined();
  });

  it("setTheme persiste no localStorage e aplica data-theme no <html>", () => {
    const ui = useUiStore();
    ui.setTheme("gruvbox");

    expect(ui.theme).toBe("gruvbox");
    expect(localStorage.getItem("floria-tune:theme")).toBe("gruvbox");
    expect(document.documentElement.dataset.theme).toBe("gruvbox");
  });

  it("lê o tema salvo ao criar a store de novo (nova sessão)", () => {
    localStorage.setItem("floria-tune:theme", "nord");
    const ui = useUiStore();
    expect(ui.theme).toBe("nord");
  });

  it("largura da sidebar é sempre limitada entre o mínimo e o máximo", () => {
    const ui = useUiStore();

    ui.setSidebarWidth(50); // abaixo do mínimo
    expect(ui.sidebarWidth).toBe(180);

    ui.setSidebarWidth(9999); // acima do máximo
    expect(ui.sidebarWidth).toBe(340);

    ui.setSidebarWidth(260);
    expect(ui.sidebarWidth).toBe(260);
    expect(localStorage.getItem("floria-tune:sidebar-width")).toBe("260");
  });

  it("recupera a largura salva da sidebar em uma nova sessão", () => {
    localStorage.setItem("floria-tune:sidebar-width", "300");
    const ui = useUiStore();
    expect(ui.sidebarWidth).toBe(300);
  });

  it("streamQualityKbps traduz 'auto' para undefined e o resto para número", () => {
    const ui = useUiStore();

    ui.setStreamQuality(192);
    expect(ui.streamQualityKbps).toBe(192);
    expect(localStorage.getItem("floria-tune:stream-quality")).toBe("192");

    ui.setStreamQuality("auto");
    expect(ui.streamQualityKbps).toBeUndefined();
  });

  it("ignora valor salvo inválido de qualidade e volta para 'auto'", () => {
    localStorage.setItem("floria-tune:stream-quality", "algo-invalido");
    const ui = useUiStore();
    expect(ui.streamQuality).toBe("auto");
  });

  it("abrir 'agora tocando' define a aba pedida", () => {
    const ui = useUiStore();
    ui.openNowPlaying("queue");
    expect(ui.nowPlayingOpen).toBe(true);
    expect(ui.nowPlayingTab).toBe("queue");

    ui.closeNowPlaying();
    expect(ui.nowPlayingOpen).toBe(false);
  });
});
