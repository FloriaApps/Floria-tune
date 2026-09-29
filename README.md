# Floria Tune

Player de música multiplataforma (Web, Android/iOS, Linux/Windows/macOS) que
fala com um servidor **Navidrome** através da **OpenSubsonic API**
(https://opensubsonic.netlify.app/docs/opensubsonic-api/).

Um único código Vue 3 + TypeScript roda nas três plataformas: a Web via
Vite, o mobile via Capacitor e o desktop via Tauri. Toda a lógica de negócio
(cliente da API, player de áudio, estado) vive em pacotes compartilhados —
os apps são só a casca de cada plataforma.

## Estrutura

```
floria-tune/
├── apps/
│   ├── web/            # Vue 3 + Vite + TS + Tailwind — a aplicação em si
│   └── desktop/         # Wrapper Tauri (Rust) em volta do build do web/
├── packages/
│   ├── types/           # Tipos compartilhados (Song, Album, PlayerState...)
│   ├── navidrome/        # Client da OpenSubsonic API (auth, streaming, busca...)
│   ├── player/           # Motor de áudio único (HTMLAudioElement + Media Session)
│   └── store/            # Estado global (Pinia): sessão do usuário + player
├── pnpm-workspace.yaml
└── package.json
```

O mobile (Android/iOS) não tem uma pasta própria de código: o Capacitor
empacota o *build* do `apps/web` dentro de um app nativo (ver
`apps/web/capacitor.config.ts`). As pastas `android/` e `ios/` são geradas
localmente por você, não fazem parte do repositório.

## Pré-requisitos

- Node.js 20+ e [pnpm](https://pnpm.io) (`corepack enable` já resolve)
- Para desktop: [Rust](https://rustup.rs) + toolchain do Tauri
  (https://v2.tauri.app/start/prerequisites/)
- Para mobile: Android Studio (Android) e/ou Xcode (iOS, precisa de macOS)
- Um servidor Navidrome acessível (URL, usuário e senha)

## Instalação

```bash
pnpm install
```

## Rodando

### Web

```bash
pnpm dev
# abre em http://localhost:5173
```

Na tela de login, informe a URL do seu Navidrome (ex.:
`https://musica.seudominio.com`), usuário e senha. A sessão fica salva no
`localStorage` do navegador.

### Desktop (Tauri)

```bash
pnpm desktop
```

Isso sobe o Vite em modo dev e abre uma janela nativa apontando para ele.
Para gerar o instalador (.dmg/.msi/.AppImage conforme o SO):

```bash
pnpm desktop:build
```

### Mobile (Capacitor)

```bash
pnpm build                      # gera apps/web/dist
cd apps/web
npx cap add android              # uma única vez
npx cap sync                     # sempre que o build mudar
npx cap open android              # abre no Android Studio
```

O fluxo para iOS é o mesmo trocando `android` por `ios` (precisa de macOS +
Xcode).

## Testes

```bash
pnpm test          # roda tudo uma vez
pnpm test:watch    # modo watch, útil durante o desenvolvimento
```

A suíte usa [Vitest](https://vitest.dev) e cobre a lógica que mais importa
manter correta, sem depender de rede nem de um servidor Navidrome de verdade:

- `packages/navidrome` — autenticação por token (garante que a senha nunca
  vai em texto puro na URL), tratamento de erro (`SubsonicError`) para
  falhas HTTP e `status=failed`, montagem de URLs de streaming/capa, e o
  mapeamento de cada método de alto nível para o endpoint certo.
- `packages/player` — o `PlayerEngine` é testado com um elemento de áudio
  falso injetado (jsdom não implementa `play()`/`pause()` de verdade),
  cobrindo navegação de fila, shuffle, os três modos de repeat, scrobble
  automático (now playing + "ouvida" após metade da faixa) e os limites de
  seek/volume.
- `packages/store` — as duas stores Pinia, mockando `@floria-tune/navidrome`
  e `@floria-tune/player` para isolar a lógica de estado (persistência de
  sessão, criação preguiçosa/idempotente do engine, teardown).
- `apps/web` — util de formatação de duração e um teste de componente
  (`TrackRow`) com `@vue/test-utils`.

## Como a OpenSubsonic API é usada

`packages/navidrome/src/client.ts` implementa a autenticação por token
(`u`/`t`/`s`, onde `t = md5(senha + salt)`), que é o esquema recomendado pela
API para não expor a senha em texto puro a cada chamada.

`packages/navidrome/src/api.ts` expõe um método por grupo de endpoints:
navegação (`getArtists`, `getAlbum`...), busca (`search3`), playlists,
streaming (`stream`, `getCoverArt`) e anotações (`star`, `setRating`,
`scrobble`). Qualquer view do Vue usa isso através do composable
`useNavidrome()`.

## Sobre o player de áudio

`packages/player/src/engine.ts` usa `HTMLAudioElement`, que funciona sem
diferenciação de plataforma porque tanto o Capacitor quanto o Tauri rodam a
aplicação dentro de uma webview. O Vue nunca lida com áudio diretamente —
ele chama `player.play()`, `player.next()`, `player.seek()` etc. através da
store `usePlayerStore()` (`packages/store/src/player.ts`), que expõe o
estado do player de forma reativa.

## Se quiser adicionar IA (ChatGPT) depois

Não coloque a chave da OpenAI direto no Vue: qualquer chamada à API da
OpenAI deve passar por um backend seu (mesmo que seja uma função serverless
simples), para a chave nunca ficar exposta no app instalado ou no bundle
web.
