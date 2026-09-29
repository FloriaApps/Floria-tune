import { useAuthStore } from "@floria-tune/store";

/** Atalho para pegar a API já autenticada dentro de qualquer view/componente. */
export function useNavidrome() {
  const auth = useAuthStore();
  if (!auth.api) throw new Error("Nenhuma sessão ativa: faça login primeiro.");
  return auth.api;
}
