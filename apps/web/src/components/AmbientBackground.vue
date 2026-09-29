<!--
  Fundo ambiente: alguns borrões de cor atrás de tudo. Sem isso, um painel
  com backdrop-blur sobre um fundo liso e escuro praticamente não muda de
  aparência — é o "algo colorido para borrar atrás do vidro" que faz o
  efeito de vidro fosco realmente aparecer.
-->
<template>
  <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950">
    <div class="absolute -left-40 -top-40 h-[26rem] w-[26rem] rounded-full bg-gold-400/20 blur-[120px]" />
    <div class="absolute -right-32 top-1/4 h-[30rem] w-[30rem] rounded-full bg-moss-500/25 blur-[130px]" />
    <div class="absolute -bottom-40 left-1/3 h-[28rem] w-[28rem] rounded-full bg-gold-500/10 blur-[140px]" />
  </div>
</template>
