<script setup lang="ts">
import { computed } from "vue";
import { useAuthStore } from "@floria-tune/store";

const props = defineProps<{
  title: string;
  subtitle?: string;
  coverArt?: string;
  to: string;
}>();

const auth = useAuthStore();
const coverUrl = computed(() =>
  props.coverArt && auth.api ? auth.api.coverArtUrl(props.coverArt, 200) : null,
);
</script>

<template>
  <RouterLink :to="to" class="group block w-40">
    <div
      class="aspect-square w-40 overflow-hidden rounded-xl bg-ink-800 ring-1 ring-white/10 transition-shadow group-hover:ring-gold-400/50"
    >
      <img
        v-if="coverUrl"
        :src="coverUrl"
        alt=""
        width="160"
        height="160"
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover"
      />
      <div v-else class="flex h-full w-full items-center justify-center text-paper-400">
        <span class="font-display text-3xl">{{ title.charAt(0) }}</span>
      </div>
    </div>
    <p class="mt-2 truncate text-sm text-paper-100">{{ title }}</p>
    <p v-if="subtitle" class="truncate text-xs text-paper-400">{{ subtitle }}</p>
  </RouterLink>
</template>