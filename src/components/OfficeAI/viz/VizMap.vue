<script setup>
/**
 * VizMap - mapa com pontos. Sem chave de mapa própria no Office, usa o embed
 * do Google Maps (o mesmo que o detalhe de empreendimento já usava). Um ponto
 * = mapa centrado nele; vários = lista com "rota" por ponto.
 * map: { points: [{ lat, lng, label, address? }] }
 */
import { computed } from 'vue';

const props = defineProps({ map: { type: Object, required: true } });
const pontos = computed(() => (props.map.points || []).filter((p) => p.lat != null && p.lng != null));
const centro = computed(() => pontos.value[0] || null);
const embed = computed(() => centro.value ? `https://www.google.com/maps?q=${centro.value.lat},${centro.value.lng}&z=${props.map.zoom || 15}&output=embed` : null);
const rota = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
</script>

<template>
  <div class="p-3 space-y-2">
    <div v-if="embed" class="rounded-xl overflow-hidden border border-line">
      <iframe :src="embed" class="w-full h-48 sm:h-56" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Mapa"></iframe>
    </div>
    <ul v-if="pontos.length" class="space-y-1">
      <li v-for="(p, i) in pontos" :key="i" class="flex items-center gap-2 text-xs">
        <i class="fas fa-location-dot text-accent text-micro"></i>
        <span class="text-ink truncate flex-1">{{ p.label }}<span v-if="p.address" class="text-ink-subtle"> · {{ p.address }}</span></span>
        <a :href="rota(p)" target="_blank" rel="noopener" class="text-accent hover:underline shrink-0">Rota</a>
      </li>
    </ul>
    <p v-else class="text-xs text-ink-subtle italic">Sem coordenadas para mostrar no mapa.</p>
  </div>
</template>
