<script setup>
/** VizNav - abrir uma tela do Office com filtros. nav: { route, filters?, message? } */
import { useRouter } from 'vue-router';
import { screenLabel } from './telas.js';

const props = defineProps({ nav: { type: Object, required: true } });
const router = useRouter();
function abrir() { if (props.nav?.route) router.push({ path: props.nav.route, query: props.nav.filters || {} }); }
</script>

<template>
  <button type="button" @click="abrir"
    class="mt-2 w-full sm:w-auto flex items-center gap-3 py-2 px-3 rounded-xl border border-accent/25 bg-accent-soft/40
           hover:border-accent/50 transition-colors duration-120 text-left focus-ring">
    <i class="fas fa-arrow-up-right-from-square text-xs text-accent shrink-0"></i>
    <span class="text-sm text-ink flex-1 min-w-0 truncate">{{ nav.message || `Abrir ${screenLabel(nav.route)}` }}</span>
    <span class="text-xs text-accent font-medium shrink-0">Abrir</span>
  </button>
</template>
