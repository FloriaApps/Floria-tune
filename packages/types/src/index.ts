// Tipos baseados nos schemas de resposta da OpenSubsonic API
// https://opensubsonic.netlify.app/docs/responses/

export interface ServerCredentials {
  url: string; // ex: https://musica.meudominio.com
  username: string;
  password: string;
}

export interface ArtistID3 {
  id: string;
  name: string;
  coverArt?: string;
  albumCount?: number;
  starred?: string;
}

export interface AlbumID3 {
  id: string;
  name: string;
  artist?: string;
  artistId?: string;
  coverArt?: string;
  songCount: number;
  duration: number;
  year?: number;
  genre?: string;
  starred?: string;
}

export interface Song {
  id: string;
  parent?: string;
  title: string;
  album?: string;
  albumId?: string;
  artist?: string;
  artistId?: string;
  track?: number;
  year?: number;
  genre?: string;
  coverArt?: string;
  duration?: number;
  suffix?: string;
  starred?: string;
  path?: string;
}

export interface Playlist {
  id: string;
  name: string;
  owner?: string;
  public?: boolean;
  songCount: number;
  duration: number;
  coverArt?: string;
}

export interface PlaylistWithSongs extends Playlist {
  entry: Song[];
}

export interface SearchResult3 {
  artist: ArtistID3[];
  album: AlbumID3[];
  song: Song[];
}

export interface PlayQueueState {
  queue: Song[];
  currentIndex: number;
  positionMs: number;
}

// Estado de reprodução usado pelo pacote @floria-tune/player
export type RepeatMode = "off" | "all" | "one";

export interface PlayerState {
  current: Song | null;
  queue: Song[];
  index: number;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
}
