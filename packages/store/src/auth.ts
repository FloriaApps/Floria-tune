import { defineStore } from "pinia";
import { markRaw, type Raw } from "vue";
import { NavidromeApi, NavidromeClient } from "@floria-tune/navidrome";
import type { ServerCredentials } from "@floria-tune/types";

const STORAGE_KEY = "floria-tune:credentials";

interface AuthStateShape {
  credentials: ServerCredentials | null;
  api: Raw<NavidromeApi> | null;
  status: "idle" | "connecting" | "ready" | "error";
  errorMessage: string | null;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthStateShape => ({
    credentials: null,
    api: null,
    status: "idle",
    errorMessage: null,
  }),

  getters: {
    isAuthenticated: (state) => state.status === "ready" && !!state.api,
  },

  actions: {
    /** Tenta restaurar a sessão salva localmente (chame no boot do app). */
    async restore() {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        const creds: ServerCredentials = JSON.parse(raw);
        await this.login(creds, { persist: false });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    },

    async login(creds: ServerCredentials, opts: { persist?: boolean } = { persist: true }) {
      this.status = "connecting";
      this.errorMessage = null;
      try {
        const client = new NavidromeClient(creds);
        const api = new NavidromeApi(client);
        await api.ping(); // valida usuário/senha/URL antes de aceitar o login
        this.credentials = creds;
        // markRaw: instâncias de classe (com campos privados e métodos) não
        // devem virar proxies reativos do Vue — isso evita bugs sutis e
        // também é o que preserva o tipo correto (sem isso, o UnwrapRef do
        // Pinia "achata" NavidromeApi e perde o campo privado `client`).
        this.api = markRaw(api);
        this.status = "ready";
        if (opts.persist !== false) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
        }
      } catch (err) {
        this.status = "error";
        this.errorMessage =
          err instanceof Error ? err.message : "Não foi possível conectar ao servidor.";
        throw err;
      }
    },

    logout() {
      this.credentials = null;
      this.api = null;
      this.status = "idle";
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});
