import { md5 } from "js-md5";
import type { ServerCredentials } from "@floria-tune/types";

const API_VERSION = "1.16.1";
const CLIENT_NAME = "floria-tune";

export class SubsonicError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
    this.name = "SubsonicError";
  }
}

interface SubsonicEnvelope<T> {
  "subsonic-response": {
    status: "ok" | "failed";
    version: string;
    error?: { code: number; message: string };
  } & T;
}

/**
 * Client fino sobre a OpenSubsonic API (implementada pelo Navidrome).
 * Ver: https://opensubsonic.netlify.app/docs/opensubsonic-api/
 *
 * Usa autenticação por token (u/t/s), que evita mandar a senha em texto
 * puro a cada request: t = md5(password + salt).
 */
export class NavidromeClient {
  private creds: ServerCredentials;
  private salt: string;
  private token: string;

  constructor(creds: ServerCredentials) {
    this.creds = { ...creds, url: creds.url.replace(/\/+$/, "") };
    this.salt = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    this.token = md5(this.creds.password + this.salt);
  }

  /** Refaz o salt/token, útil se a senha mudar. */
  updateCredentials(creds: ServerCredentials) {
    this.creds = { ...creds, url: creds.url.replace(/\/+$/, "") };
    this.salt = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    this.token = md5(this.creds.password + this.salt);
  }

  get baseUrl() {
    return this.creds.url;
  }

  /** Monta a URL de streaming/download/cover art para usar direto em <audio src> ou <img src>. */
  buildMediaUrl(endpoint: "stream" | "download" | "getCoverArt", params: Record<string, string | number>) {
    const qs = this.authParams();
    for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
    return `${this.baseUrl}/rest/${endpoint}?${qs.toString()}`;
  }

  private authParams() {
    return new URLSearchParams({
      u: this.creds.username,
      t: this.token,
      s: this.salt,
      v: API_VERSION,
      c: CLIENT_NAME,
      f: "json",
    });
  }

  /**
   * Chamada genérica a qualquer endpoint REST da API. Valores array viram
   * parâmetros repetidos (ex.: songId=1&songId=2), como a API espera para
   * endpoints como updatePlaylist.
   */
  async call<T = Record<string, unknown>>(
    endpoint: string,
    params: Record<string, string | number | boolean | undefined | (string | number)[]> = {},
  ): Promise<T> {
    const qs = this.authParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      if (Array.isArray(v)) {
        for (const item of v) qs.append(k, String(item));
      } else {
        qs.set(k, String(v));
      }
    }

    const res = await fetch(`${this.baseUrl}/rest/${endpoint}?${qs.toString()}`);
    if (!res.ok) {
      throw new SubsonicError(res.status, `Falha HTTP ${res.status} ao chamar ${endpoint}`);
    }

    const json = (await res.json()) as SubsonicEnvelope<T>;
    const body = json["subsonic-response"];

    if (body.status === "failed") {
      throw new SubsonicError(body.error?.code ?? -1, body.error?.message ?? "Erro desconhecido do servidor");
    }

    return body as unknown as T;
  }
}
