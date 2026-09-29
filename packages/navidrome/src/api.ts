import type {
  AlbumID3,
  ArtistID3,
  Playlist,
  PlaylistWithSongs,
  SearchResult3,
  Song,
} from "@floria-tune/types";
import { NavidromeClient } from "./client";

/** Um "cue" é uma palavra ou sílaba com o intervalo de tempo em que é cantada. */
export interface LyricCue {
  start?: number;
  end?: number;
  value: string;
}

/**
 * Uma linha com granularidade de palavra/sílaba (extensão songLyrics v2,
 * `enhanced=true`). Paralela ao `line` tradicional, não o substitui — por
 * isso carrega `index`, referenciando a posição correspondente em `lines`.
 */
export interface LyricCueLine {
  index?: number;
  start?: number;
  end?: number;
  value: string;
  cue?: LyricCue[];
}

export interface LyricsResult {
  synced: boolean;
  lines: { value: string; start?: number }[];
  /** Só existe se o servidor suportar a extensão v2 E tiver esse dado pra essa letra. */
  cueLines?: LyricCueLine[];
}

/**
 * Camada de métodos de alto nível, um por endpoint (ou grupo de endpoints)
 * da OpenSubsonic API. Cada função aqui corresponde a uma entrada da tabela
 * "API methods" da documentação.
 */
export class NavidromeApi {
  constructor(private client: NavidromeClient) {}

  // ---- System ----------------------------------------------------------
  /** ping: verifica se o servidor está de pé e as credenciais são válidas. */
  async ping() {
    await this.client.call("ping.view");
    return true;
  }

  // ---- Browsing (por ID3, recomendado desde a v1.8.0) -------------------
  async getArtists(): Promise<ArtistID3[]> {
    const data = await this.client.call<{ artists: { index: { artist: ArtistID3[] }[] } }>(
      "getArtists.view",
    );
    return data.artists.index.flatMap((i) => i.artist);
  }

  async getArtist(id: string): Promise<{ artist: ArtistID3; album: AlbumID3[] }> {
    const data = await this.client.call<{ artist: ArtistID3 & { album: AlbumID3[] } }>(
      "getArtist.view",
      { id },
    );
    return { artist: data.artist, album: data.artist.album ?? [] };
  }

  async getAlbum(id: string): Promise<{ album: AlbumID3; song: Song[] }> {
    const data = await this.client.call<{ album: AlbumID3 & { song: Song[] } }>(
      "getAlbum.view",
      { id },
    );
    return { album: data.album, song: data.album.song ?? [] };
  }

  async getSong(id: string): Promise<Song> {
    const data = await this.client.call<{ song: Song }>("getSong.view", { id });
    return data.song;
  }

  // ---- Album/song lists ---------------------------------------------------
  async getAlbumList2(
    type: "recent" | "frequent" | "random" | "newest" | "alphabeticalByName" | "byGenre" = "newest",
    size = 20,
    extra: { genre?: string } = {},
  ): Promise<AlbumID3[]> {
    const data = await this.client.call<{ albumList2: { album: AlbumID3[] } }>(
      "getAlbumList2.view",
      { type, size, ...extra },
    );
    return data.albumList2.album ?? [];
  }

  async getRandomSongs(size = 50): Promise<Song[]> {
    const data = await this.client.call<{ randomSongs: { song: Song[] } }>(
      "getRandomSongs.view",
      { size },
    );
    return data.randomSongs.song ?? [];
  }

  async getStarred2(): Promise<{ artist: ArtistID3[]; album: AlbumID3[]; song: Song[] }> {
    const data = await this.client.call<{
      starred2: { artist?: ArtistID3[]; album?: AlbumID3[]; song?: Song[] };
    }>("getStarred2.view");
    return {
      artist: data.starred2.artist ?? [],
      album: data.starred2.album ?? [],
      song: data.starred2.song ?? [],
    };
  }

  async getGenres(): Promise<{ name: string; songCount: number; albumCount: number }[]> {
    const data = await this.client.call<{ genres: { genre: { value: string; songCount: number; albumCount: number }[] } }>(
      "getGenres.view",
    );
    return (data.genres.genre ?? []).map((g) => ({
      name: g.value,
      songCount: g.songCount,
      albumCount: g.albumCount,
    }));
  }

  // ---- Letras (extensão OpenSubsonic) ------------------------------------
  /**
   * getLyricsBySongId: retorna a letra da música, síncrona ou não.
   * Pedimos `enhanced=true` (extensão songLyrics v2, Navidrome 0.63+): quando
   * o servidor tem esse dado, ele devolve `cueLine`/`cue` com timing por
   * PALAVRA (ou sílaba), em paralelo ao `line` tradicional (por linha).
   * Servidores mais antigos simplesmente ignoram o parâmetro e devolvem só
   * `line` — por isso `cueLines` é opcional no retorno.
   *
   * Nem todo servidor Navidrome tem letras indexadas (depende de arquivos
   * .lrc/.txt ao lado da música ou de um provedor externo configurado), e
   * nem todo servidor OpenSubsonic implementa essa extensão — por isso o
   * retorno é `null` em caso de erro em vez de propagar exceção.
   */
  async getLyrics(songId: string): Promise<LyricsResult | null> {
    try {
      const data = await this.client.call<{
        lyricsList?: {
          structuredLyrics?: {
            synced?: boolean;
            line?: { value: string; start?: number }[];
            cueLine?: {
              index?: number;
              start?: number;
              end?: number;
              value: string;
              cue?: { start?: number; end?: number; value: string }[];
            }[];
          }[];
        };
      }>("getLyricsBySongId.view", { id: songId, enhanced: true });

      const first = data.lyricsList?.structuredLyrics?.[0];
      if (!first?.line?.length) return null;
      return {
        synced: !!first.synced,
        lines: first.line.map((l) => ({ value: l.value, start: l.start })),
        // Servidores sem enhanced=true (ou sem esse dado) simplesmente não
        // mandam cueLine — cueLines fica undefined e a UI cai pro modo
        // linha-a-linha automaticamente.
        cueLines: first.cueLine?.map((cl) => ({
          index: cl.index,
          start: cl.start,
          end: cl.end,
          value: cl.value,
          cue: cl.cue?.map((c) => ({ start: c.start, end: c.end, value: c.value })),
        })),
      };
    } catch {
      return null;
    }
  }

  // ---- Fila de reprodução (sincroniza entre dispositivos) ----------------
  /**
   * getPlayQueue/savePlayQueue permitem retomar a reprodução de onde parou
   * em outro dispositivo — o servidor guarda a fila, a faixa atual e a
   * posição em ms. `null` quando não há nada salvo (ou o servidor não
   * suporta a extensão).
   */
  async getPlayQueue(): Promise<{ current?: string; positionMs: number; entry: Song[] } | null> {
    try {
      const data = await this.client.call<{
        playQueue?: { current?: string; position?: number; entry?: Song[] };
      }>("getPlayQueue.view");
      if (!data.playQueue?.entry?.length) return null;
      return {
        current: data.playQueue.current,
        positionMs: data.playQueue.position ?? 0,
        entry: data.playQueue.entry,
      };
    } catch {
      return null;
    }
  }

  async savePlayQueue(songIds: string[], currentSongId?: string, positionMs?: number): Promise<void> {
    if (!songIds.length) return;
    try {
      await this.client.call("savePlayQueue.view", {
        id: songIds,
        current: currentSongId,
        position: positionMs,
      });
    } catch {
      // não é crítico: se o servidor não suportar, a fila simplesmente não
      // sincroniza entre dispositivos, mas a reprodução local continua normal.
    }
  }

  // ---- Searching ------------------------------------------------------
  /** search3: busca ID3 (artistas/álbuns/músicas), recomendada sobre search/search2. */
  async search3(query: string): Promise<SearchResult3> {
    const data = await this.client.call<{ searchResult3: Partial<SearchResult3> }>(
      "search3.view",
      { query, artistCount: 20, albumCount: 20, songCount: 40 },
    );
    return {
      artist: data.searchResult3.artist ?? [],
      album: data.searchResult3.album ?? [],
      song: data.searchResult3.song ?? [],
    };
  }

  // ---- Playlists --------------------------------------------------------
  async getPlaylists(): Promise<Playlist[]> {
    const data = await this.client.call<{ playlists: { playlist: Playlist[] } }>(
      "getPlaylists.view",
    );
    return data.playlists.playlist ?? [];
  }

  async getPlaylist(id: string): Promise<PlaylistWithSongs> {
    const data = await this.client.call<{ playlist: PlaylistWithSongs }>(
      "getPlaylist.view",
      { id },
    );
    return { ...data.playlist, entry: data.playlist.entry ?? [] };
  }

  async createPlaylist(name: string, songIds: string[] = []): Promise<void> {
    // createPlaylist aceita songId repetido diretamente na criação.
    await this.client.call("createPlaylist.view", { name, songId: songIds });
  }

  async addSongsToPlaylist(playlistId: string, songIds: string[]): Promise<void> {
    await this.client.call("updatePlaylist.view", {
      playlistId,
      songIdToAdd: songIds,
    });
  }

  async removeSongFromPlaylist(playlistId: string, songIndex: number): Promise<void> {
    // songIndexToRemove é baseado em 0, na posição dentro da playlist.
    await this.client.call("updatePlaylist.view", {
      playlistId,
      songIndexToRemove: [songIndex],
    });
  }

  async deletePlaylist(id: string): Promise<void> {
    await this.client.call("deletePlaylist.view", { id });
  }

  // ---- Media retrieval --------------------------------------------------
  streamUrl(songId: string, maxBitRateKbps?: number): string {
    return this.client.buildMediaUrl("stream", {
      id: songId,
      ...(maxBitRateKbps ? { maxBitRate: maxBitRateKbps } : {}),
    });
  }

  coverArtUrl(coverArtId: string, size = 300): string {
    return this.client.buildMediaUrl("getCoverArt", { id: coverArtId, size });
  }

  downloadUrl(songId: string): string {
    return this.client.buildMediaUrl("download", { id: songId });
  }

  // ---- Media annotation ---------------------------------------------------
  async star(params: { id?: string; albumId?: string; artistId?: string }): Promise<void> {
    await this.client.call("star.view", params as Record<string, string>);
  }

  async unstar(params: { id?: string; albumId?: string; artistId?: string }): Promise<void> {
    await this.client.call("unstar.view", params as Record<string, string>);
  }

  async setRating(id: string, rating: 0 | 1 | 2 | 3 | 4 | 5): Promise<void> {
    await this.client.call("setRating.view", { id, rating });
  }

  /** scrobble: registra "tocando agora" (submission=false) ou "ouvida" (submission=true). */
  async scrobble(id: string, submission: boolean): Promise<void> {
    await this.client.call("scrobble.view", { id, submission });
  }
}
