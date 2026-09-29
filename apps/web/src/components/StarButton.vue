<script setup lang="ts">
import { ref, watch } from "vue";
import { Heart } from "lucide-vue-next";
import { useNavidrome } from "../composables/useNavidrome";

const props = defineProps<{
  /** Estado inicial vindo do servidor (ex.: `!!song.starred`). */
  starred: boolean;
  /** Exatamente um destes deve ser passado, conforme o tipo de item. */
  target: { id?: string; albumId?: string; artistId?: string };
  size?: number;
}>();

const api = useNavidrome();
const isStarred = ref(props.starred);
watch(
  () => props.starred,
  (v) => (isStarred.value = v),
);

/** Clique otimista: atualiza a UI na hora e desfaz se a chamada falhar. */
async function toggle(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  const next = !isStarred.value;
  isStarred.value = next;
  try {
    if (next) await api.star(props.target);
    else await api.unstar(props.target);
  } catch {
    isStarred.value = !next;
  }
}
</script>

<template>
  <button
    type="button"
    class="shrink-0 transition-colors"
    :class="isStarred ? 'text-gold-400' : 'text-paper-400 hover:text-paper-100'"
    :title="isStarred ? $t('star.remove') : $t('star.add')"
    @click="toggle"
  >
    <Heart :size="size ?? 16" :fill="isStarred ? 'currentColor' : 'none'" />
  </button>
</template>
