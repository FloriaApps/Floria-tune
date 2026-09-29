// @vitest-environment jsdom
// (precisa de `localStorage`, que só existe em ambiente de navegador/jsdom)
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const pingMock = vi.fn();

// Mocamos o pacote inteiro para não fazer chamadas de rede de verdade: o
// que queremos testar aqui é a lógica da store (persistência, estados de
// erro), não o client HTTP em si (que já tem seus próprios testes).
// vi.mock é hoisted pelo Vitest para antes de qualquer import, então isso
// vale mesmo para o `import { useAuthStore } from "./auth"` abaixo.
vi.mock("@floria-tune/navidrome", () => {
  class FakeNavidromeClient {
    constructor(public creds: unknown) {}
  }
  class FakeNavidromeApi {
    constructor(public client: FakeNavidromeClient) {}
    ping = pingMock;
  }
  return { NavidromeClient: FakeNavidromeClient, NavidromeApi: FakeNavidromeApi };
});

import { useAuthStore } from "./auth";

const creds = { url: "https://musica.exemplo.com", username: "alice", password: "123" };

describe("useAuthStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    pingMock.mockReset();
  });

  it("começa deslogada", () => {
    const auth = useAuthStore();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.status).toBe("idle");
  });

  it("login bem-sucedido valida com ping() e marca status ready", async () => {
    pingMock.mockResolvedValue(true);
    const auth = useAuthStore();

    await auth.login(creds);

    expect(auth.isAuthenticated).toBe(true);
    expect(auth.credentials).toEqual(creds);
    expect(pingMock).toHaveBeenCalledOnce();
  });

  it("login persiste as credenciais no localStorage por padrão", async () => {
    pingMock.mockResolvedValue(true);
    const auth = useAuthStore();

    await auth.login(creds);

    expect(JSON.parse(localStorage.getItem("floria-tune:credentials")!)).toEqual(creds);
  });

  it("login com falha de ping (usuário/senha errados) marca status error e não persiste nada", async () => {
    pingMock.mockRejectedValue(new Error("Usuário ou senha incorretos"));
    const auth = useAuthStore();

    await expect(auth.login(creds)).rejects.toThrow("Usuário ou senha incorretos");

    expect(auth.isAuthenticated).toBe(false);
    expect(auth.status).toBe("error");
    expect(auth.errorMessage).toBe("Usuário ou senha incorretos");
    expect(localStorage.getItem("floria-tune:credentials")).toBeNull();
  });

  it("restore() recupera a sessão salva e não persiste de novo (evita rewrite redundante)", async () => {
    pingMock.mockResolvedValue(true);
    localStorage.setItem("floria-tune:credentials", JSON.stringify(creds));

    const auth = useAuthStore();
    await auth.restore();

    expect(auth.isAuthenticated).toBe(true);
    expect(auth.credentials).toEqual(creds);
  });

  it("restore() sem nada salvo não faz nada e não quebra", async () => {
    const auth = useAuthStore();
    await auth.restore();
    expect(auth.isAuthenticated).toBe(false);
    expect(pingMock).not.toHaveBeenCalled();
  });

  it("restore() com JSON corrompido no localStorage limpa a chave e não quebra", async () => {
    localStorage.setItem("floria-tune:credentials", "{ isso não é json");
    const auth = useAuthStore();

    await auth.restore();

    expect(auth.isAuthenticated).toBe(false);
    expect(localStorage.getItem("floria-tune:credentials")).toBeNull();
  });

  it("logout limpa credenciais, api e o localStorage", async () => {
    pingMock.mockResolvedValue(true);
    const auth = useAuthStore();
    await auth.login(creds);

    auth.logout();

    expect(auth.isAuthenticated).toBe(false);
    expect(auth.credentials).toBeNull();
    expect(auth.api).toBeNull();
    expect(localStorage.getItem("floria-tune:credentials")).toBeNull();
  });
});
