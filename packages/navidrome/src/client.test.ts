import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { md5 } from "js-md5";
import { NavidromeClient, SubsonicError } from "./client";

function okEnvelope(extra: Record<string, unknown> = {}) {
  return { "subsonic-response": { status: "ok", version: "1.16.1", ...extra } };
}

function fakeFetch(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

describe("NavidromeClient", () => {
  const creds = { url: "https://musica.exemplo.com/", username: "alice", password: "segredo123" };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("remove a barra final da URL do servidor", async () => {
    const fetchMock = fakeFetch(okEnvelope());
    vi.stubGlobal("fetch", fetchMock);

    const client = new NavidromeClient(creds);
    expect(client.baseUrl).toBe("https://musica.exemplo.com");

    await client.call("ping.view");
    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      "https://musica.exemplo.com/rest/ping.view",
    );
  });

  it("autentica com token = md5(senha + salt), não a senha em texto puro", async () => {
    const fetchMock = fakeFetch(okEnvelope());
    vi.stubGlobal("fetch", fetchMock);

    const client = new NavidromeClient(creds);
    await client.call("ping.view");

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    const salt = calledUrl.searchParams.get("s");
    const token = calledUrl.searchParams.get("t");

    expect(salt).toBeTruthy();
    expect(calledUrl.searchParams.get("u")).toBe("alice");
    expect(token).toBe(md5(creds.password + salt));
    // a senha em si nunca deve aparecer na URL
    expect(calledUrl.toString()).not.toContain(creds.password);
  });

  it("lança SubsonicError quando o servidor responde status=failed", async () => {
    vi.stubGlobal(
      "fetch",
      fakeFetch({
        "subsonic-response": {
          status: "failed",
          version: "1.16.1",
          error: { code: 40, message: "Usuário ou senha incorretos" },
        },
      }),
    );

    const client = new NavidromeClient(creds);
    await expect(client.call("ping.view")).rejects.toMatchObject({
      code: 40,
      message: "Usuário ou senha incorretos",
    });
    await expect(client.call("ping.view")).rejects.toBeInstanceOf(SubsonicError);
  });

  it("lança SubsonicError em falha HTTP (servidor fora do ar, URL errada etc.)", async () => {
    vi.stubGlobal("fetch", fakeFetch({}, false, 502));

    const client = new NavidromeClient(creds);
    await expect(client.call("ping.view")).rejects.toMatchObject({ code: 502 });
  });

  it("converte parâmetros em array em parâmetros repetidos na query string", async () => {
    const fetchMock = fakeFetch(okEnvelope());
    vi.stubGlobal("fetch", fetchMock);

    const client = new NavidromeClient(creds);
    await client.call("updatePlaylist.view", { playlistId: "pl1", songIdToAdd: ["s1", "s2", "s3"] });

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.getAll("songIdToAdd")).toEqual(["s1", "s2", "s3"]);
  });

  it("monta URLs de mídia (stream/coverArt) com autenticação e parâmetros extras", () => {
    vi.stubGlobal("fetch", fakeFetch(okEnvelope()));
    const client = new NavidromeClient(creds);

    const streamUrl = new URL(client.buildMediaUrl("stream", { id: "song-42", maxBitRate: 192 }));
    expect(streamUrl.pathname).toBe("/rest/stream");
    expect(streamUrl.searchParams.get("id")).toBe("song-42");
    expect(streamUrl.searchParams.get("maxBitRate")).toBe("192");
    expect(streamUrl.searchParams.get("u")).toBe("alice");

    const coverUrl = new URL(client.buildMediaUrl("getCoverArt", { id: "al-1", size: 300 }));
    expect(coverUrl.pathname).toBe("/rest/getCoverArt");
    expect(coverUrl.searchParams.get("size")).toBe("300");
  });

  it("updateCredentials gera um novo salt/token", async () => {
    vi.stubGlobal("fetch", fakeFetch(okEnvelope()));
    const client = new NavidromeClient(creds);
    const before = new URL(client.buildMediaUrl("stream", { id: "x" })).searchParams.get("s");

    client.updateCredentials({ ...creds, password: "outraSenha" });
    const after = new URL(client.buildMediaUrl("stream", { id: "x" })).searchParams.get("s");

    // salts são gerados aleatoriamente a cada troca de credenciais
    expect(after).not.toBe(before);
  });
});
