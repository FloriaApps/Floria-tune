import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    // "node" por padrão: mais rápido, e a maioria dos testes (client HTTP,
    // stores, lógica do player) não precisa de DOM. Arquivos que precisam
    // de DOM (componentes Vue) usam o comentário
    // `// @vitest-environment jsdom` no topo do próprio arquivo.
    environment: "node",
    include: ["apps/*/src/**/*.test.ts", "packages/*/src/**/*.test.ts"],
    css: false,
  },
});
