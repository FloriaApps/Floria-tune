<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { LibraryBig, Search, ListMusic, Settings, Heart, Tags } from "lucide-vue-next";
import { useUiStore } from "@floria-tune/store";

const ui = useUiStore();
const { t } = useI18n();

const links = computed(() => [
  { to: "/", label: t("nav.library"), icon: LibraryBig },
  { to: "/favorites", label: t("nav.favorites"), icon: Heart },
  { to: "/genres", label: t("nav.genres"), icon: Tags },
  { to: "/search", label: t("nav.search"), icon: Search },
  { to: "/playlists", label: t("nav.playlists"), icon: ListMusic },
  { to: "/settings", label: t("nav.settings"), icon: Settings },
]);

let dragging = false;
let dragStartX = 0;
let widthAtDragStart = 0;

function onHandlePointerDown(e: PointerEvent) {
  dragging = true;
  dragStartX = e.clientX;
  widthAtDragStart = ui.sidebarWidth;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}

function onHandlePointerMove(e: PointerEvent) {
  if (!dragging) return;
  ui.setSidebarWidth(widthAtDragStart + (e.clientX - dragStartX));
}

function onHandlePointerUp() {
  dragging = false;
}

/** Duplo clique no puxador volta pro tamanho padrão. */
function onHandleDoubleClick() {
  ui.setSidebarWidth(240);
}
</script>

<template>
  <aside
    class="relative z-10 my-4 ml-4 flex shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-900/50 px-6 py-8 shadow-2xl shadow-black/30 backdrop-blur-2xl"
    :style="{ width: ui.sidebarWidth + 'px' }"
  >
    <div class="mb-10 min-w-0">
      <p class="truncate font-display text-2xl leading-none tracking-tight text-paper-100">Floria Tune</p>
      <p class="mt-1.5 truncate text-xs text-paper-400">{{ $t("sidebar.tagline") }}</p>
    </div>

    <nav class="flex flex-col gap-1">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-paper-400 transition-colors hover:bg-white/5 hover:text-paper-100"
        active-class="!bg-gold-400/10 !text-gold-400"
      >
        <component :is="link.icon" :size="18" :stroke-width="1.75" class="shrink-0" />
        <span class="truncate">{{ link.label }}</span>
      </RouterLink>
    </nav>

    <!-- Puxador de redimensionar: invisível até passar o mouse por perto -->
    <div
      class="group absolute inset-y-0 right-0 z-20 w-3 -mr-1.5 cursor-ew-resize touch-none"
      :title="$t('sidebar.resizeHint')"
      @pointerdown="onHandlePointerDown"
      @pointermove="onHandlePointerMove"
      @pointerup="onHandlePointerUp"
      @pointercancel="onHandlePointerUp"
      @dblclick="onHandleDoubleClick"
    >
      <div class="mx-auto h-full w-0.5 rounded-full bg-transparent transition-colors group-hover:bg-gold-400/50" />
    </div>
  </aside>
</template>
