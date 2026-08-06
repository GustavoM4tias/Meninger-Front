<script setup>
/**
 * SobreNav — as três faces do "Sobre o Office", numa faixa só.
 * ─────────────────────────────────────────────────────────────────────────────
 * O mapa mostra O QUE existe, a visão executiva explica POR QUE existe e as
 * atualizações mostram COMO chegou até aqui. Como as três se completam, elas
 * compartilham esta navegação em vez de virarem botões soltos no cabeçalho.
 */
import { useRoute } from 'vue-router';

const route = useRoute();

const tabs = [
    { to: '/sobre', label: 'Mapa do Sistema', short: 'Mapa', icon: 'fas fa-diagram-project' },
    { to: '/sobre/relatorio', label: 'Visão Executiva', short: 'Visão', icon: 'fas fa-file-lines' },
    { to: '/docs', label: 'Atualizações', short: 'Novidades', icon: 'fas fa-code-branch' },
];

const isActive = (to) => route.path === to;
</script>

<template>
  <nav class="flex items-center gap-1.5 p-1 mb-5 rounded-lg border border-line bg-surface-sunken
              shadow-inner-soft overflow-x-auto no-scrollbar">
    <router-link v-for="tab in tabs" :key="tab.to" :to="tab.to"
      class="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-md text-sm font-medium
             whitespace-nowrap shrink-0 transition-all duration-200 ease-out-expo"
      :class="isActive(tab.to)
        ? 'bg-surface text-accent shadow-soft'
        : 'text-ink-muted hover:text-ink'">
      <i :class="tab.icon" class="text-[11px]"></i>
      <span class="hidden sm:inline">{{ tab.label }}</span>
      <span class="sm:hidden">{{ tab.short }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
