import { describe, it, expect, vi } from "vitest";
import { NavidromeApi } from "./api";
import type { NavidromeClient } from "./client";

/** Cria um NavidromeClient falso com `call` e `buildMediaUrl` espionáveis. */
function fakeClient(callImpl: (endpoint: string, params?: unknown) => unknown) {
  return {
    call: vi.fn(callImpl),
    buildMediaUrl: vi.fn(
      (endpoint: string, params: Record<string, unknown>) =>
        `https://exemplo.com/rest/${endpoint}?${new URLSearchParams(params as Record<string, string>).toString()}`,
    ),
    baseUrl: "https://exemplo.com",
  } as unknown as NavidromeClient;
}

describe("NavidromeApi", () => {
  it("getArtists achata os índices alfabéticos em uma lista única", async () => {
    const client = fakeClient(() => ({
      artists: {
        index: [
          { artist: [{ id: "1", name: "AC/DC" }] },
          { artist: [{ id: "2", name: "Beatles" }, { id: "3", name: "Bee Gees" }] },
        ],
      },
    }));
    const api = new NavidromeApi(client);

    const artists = await api.getArtists();
    expect(artists.map((a) => a.name)).toEqual(["AC/DC", "Beatles", "Bee Gees"]);
    expect(client.call).toHaveBeenCalledWith("getArtists.view");
  });

  it("getAlbum separa metadados do álbum das músicas", async () => {
    const client = fakeClient(() => ({
      album: { id: "al1", name: "Abbey Road", songCount: 2, duration: 100, song: [{ id: "s1" }, { id: "s2" }] },
    }));
    const api = new NavidromeApi(client);

    const { album, song } = await api.getAlbum("al1");
    expect(album.name).toBe("Abbey Road");
    expect(song).toHaveLength(2);
    expect(client.call).toHaveBeenCalledWith("getAlbum.view", { id: "al1" });
  });

  it("getAlbum retorna lista vazia de músicas quando o servidor não manda 'song'", async () => {
    const client = fakeClient(() => ({ album: { id: "al1", name: "Vazio", songCount: 0, duration: 0 } }));
    const api = new NavidromeApi(client);

    const { song } = await api.getAlbum("al1");
    expect(song).toEqual([]);
  });

  it("search3 usa a busca por ID3 com contagens padrão e nunca quebra em campos ausentes", async () => {
    const client = fakeClient(() => ({ searchResult3: { song: [{ id: "s1" }] } }));
    const api = new NavidromeApi(client);

    const result = await api.search3("abbey road");
    expect(client.call).toHaveBeenCalledWith("search3.view", {
      query: "abbey road",
      artistCount: 20,
      albumCount: 20,
      songCount: 40,
    });
    expect(result).toEqual({ artist: [], album: [], song: [{ id: "s1" }] });
  });

  it("createPlaylist envia os songId como parâmetro repetido, não em chamadas separadas", async () => {
    const client = fakeClient(() => ({}));
    const api = new NavidromeApi(client);

    await api.createPlaylist("Favoritas", ["s1", "s2"]);
    expect(client.call).toHaveBeenCalledWith("createPlaylist.view", {
      name: "Favoritas",
      songId: ["s1", "s2"],
    });
  });

  it("addSongsToPlaylist usa updatePlaylist com songIdToAdd", async () => {
    const client = fakeClient(() => ({}));
    const api = new NavidromeApi(client);

    await api.addSongsToPlaylist("pl1", ["s9"]);
    expect(client.call).toHaveBeenCalledWith("updatePlaylist.view", {
      playlistId: "pl1",
      songIdToAdd: ["s9"],
    });
  });

  it("removeSongFromPlaylist usa updatePlaylist com songIndexToRemove", async () => {
    const client = fakeClient(() => ({}));
    const api = new NavidromeApi(client);

    await api.removeSongFromPlaylist("pl1", 3);
    expect(client.call).toHaveBeenCalledWith("updatePlaylist.view", {
      playlistId: "pl1",
      songIndexToRemove: [3],
    });
  });

  it("deletePlaylist chama deletePlaylist.view com o id certo", async () => {
    const client = fakeClient(() => ({}));
    const api = new NavidromeApi(client);

    await api.deletePlaylist("pl1");
    expect(client.call).toHaveBeenCalledWith("deletePlaylist.view", { id: "pl1" });
  });

  it("streamUrl e coverArtUrl delegam para buildMediaUrl com os parâmetros certos", () => {
    const client = fakeClient(() => ({}));
    const api = new NavidromeApi(client);

    api.streamUrl("song-1", 192);
    expect(client.buildMediaUrl).toHaveBeenCalledWith("stream", { id: "song-1", maxBitRate: 192 });

    api.coverArtUrl("cover-1");
    expect(client.buildMediaUrl).toHaveBeenCalledWith("getCoverArt", { id: "cover-1", size: 300 });
  });

  it("scrobble repassa submission=true/false corretamente", async () => {
    const client = fakeClient(() => ({}));
    const api = new NavidromeApi(client);

    await api.scrobble("s1", false);
    await api.scrobble("s1", true);
    expect(client.call).toHaveBeenNthCalledWith(1, "scrobble.view", { id: "s1", submission: false });
    expect(client.call).toHaveBeenNthCalledWith(2, "scrobble.view", { id: "s1", submission: true });
  });

  it("getAlbumList2 repassa type/size e parâmetros extras (ex.: genre) para o endpoint", async () => {
    const client = fakeClient(() => ({ albumList2: { album: [{ id: "al1" }] } }));
    const api = new NavidromeApi(client);

    await api.getAlbumList2("byGenre", 12, { genre: "Rock" });
    expect(client.call).toHaveBeenCalledWith("getAlbumList2.view", { type: "byGenre", size: 12, genre: "Rock" });
  });

  it("getGenres mapeia o campo 'value' do servidor para 'name'", async () => {
    const client = fakeClient(() => ({
      genres: { genre: [{ value: "Rock", songCount: 120, albumCount: 15 }, { value: "Jazz", songCount: 40, albumCount: 6 }] },
    }));
    const api = new NavidromeApi(client);

    const genres = await api.getGenres();
    expect(genres).toEqual([
      { name: "Rock", songCount: 120, albumCount: 15 },
      { name: "Jazz", songCount: 40, albumCount: 6 },
    ]);
  });

  it("getLyrics extrai as linhas (com o start em ms de cada uma) da primeira letra estruturada", async () => {
    const client = fakeClient(() => ({
      lyricsList: {
        structuredLyrics: [
          {
            synced: true,
            line: [
              { value: "primeira linha", start: 1200 },
              { value: "segunda linha", start: 4500 },
            ],
          },
        ],
      },
    }));
    const api = new NavidromeApi(client);

    const lyrics = await api.getLyrics("s1");
    expect(lyrics).toEqual({
      synced: true,
      lines: [
        { value: "primeira linha", start: 1200 },
        { value: "segunda linha", start: 4500 },
      ],
      cueLines: undefined,
    });
    // enhanced=true é sempre pedido: servidores antigos simplesmente ignoram.
    expect(client.call).toHaveBeenCalledWith("getLyricsBySongId.view", { id: "s1", enhanced: true });
  });

  it("getLyrics extrai cueLine/cue (timing por palavra) quando o servidor manda essa extensão v2", async () => {
    const client = fakeClient(() => ({
      lyricsList: {
        structuredLyrics: [
          {
            synced: true,
            line: [{ value: "You and I", start: 1000 }],
            cueLine: [
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
          },
        ],
      },
    }));
    const api = new NavidromeApi(client);

    const lyrics = await api.getLyrics("s1");
    expect(lyrics?.cueLines).toEqual([
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
    ]);
  });

  it("getLyrics retorna null quando não há letra ou o servidor não suporta a extensão", async () => {
    const clientEmpty = fakeClient(() => ({ lyricsList: {} }));
    expect(await new NavidromeApi(clientEmpty).getLyrics("s1")).toBeNull();

    const clientError = fakeClient(() => {
      throw new Error("endpoint desconhecido");
    });
    expect(await new NavidromeApi(clientError).getLyrics("s1")).toBeNull();
  });

  it("getPlayQueue retorna a fila salva, ou null se estiver vazia/inexistente", async () => {
    const client = fakeClient(() => ({
      playQueue: { current: "s2", position: 42000, entry: [{ id: "s1" }, { id: "s2" }] },
    }));
    const api = new NavidromeApi(client);

    expect(await api.getPlayQueue()).toEqual({
      current: "s2",
      positionMs: 42000,
      entry: [{ id: "s1" }, { id: "s2" }],
    });

    const emptyApi = new NavidromeApi(fakeClient(() => ({ playQueue: {} })));
    expect(await emptyApi.getPlayQueue()).toBeNull();

    const errorApi = new NavidromeApi(
      fakeClient(() => {
        throw new Error("sem suporte");
      }),
    );
    expect(await errorApi.getPlayQueue()).toBeNull();
  });

  it("savePlayQueue envia os ids na ordem certa e não quebra se o servidor recusar", async () => {
    const client = fakeClient(() => ({}));
    const api = new NavidromeApi(client);

    await api.savePlayQueue(["s1", "s2"], "s1", 5000);
    expect(client.call).toHaveBeenCalledWith("savePlayQueue.view", {
      id: ["s1", "s2"],
      current: "s1",
      position: 5000,
    });

    const errorApi = new NavidromeApi(
      fakeClient(() => {
        throw new Error("sem suporte");
      }),
    );
    await expect(errorApi.savePlayQueue(["s1"], "s1", 0)).resolves.toBeUndefined();
  });

  it("savePlayQueue não faz chamada nenhuma se a fila estiver vazia", async () => {
    const client = fakeClient(() => ({}));
    const api = new NavidromeApi(client);

    await api.savePlayQueue([], undefined, 0);
    expect(client.call).not.toHaveBeenCalled();
  });
});
