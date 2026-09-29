<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@floria-tune/store";
import AmbientBackground from "./components/AmbientBackground.vue";
import Sidebar from "./components/Sidebar.vue";
import PlayerBar from "./components/PlayerBar.vue";
import NowPlayingOverlay from "./components/NowPlayingOverlay.vue";

const route = useRoute();
const auth = useAuthStore();

const showShell = computed(() => route.name !== "login" && auth.isAuthenticated);
</script>

<template>
  <!-- Keeps the original background, only lowering its global opacity so the
       transparent Tauri window shows through. -->
  <AmbientBackground class="opacity-90" />

  <div v-if="showShell" class="grid h-screen grid-cols-[auto_1fr] grid-rows-[1fr_auto]">
    <Sidebar class="row-span-2" />
    <main class="overflow-y-auto px-10 py-8">
      <RouterView />
    </main>
    <PlayerBar class="col-start-2" />
    <NowPlayingOverlay />
  </div>
  <RouterView v-else />
</template>

<style>
html,
body,
#app {
  background-color: transparent !important;
  background: transparent !important;
}
</style>
