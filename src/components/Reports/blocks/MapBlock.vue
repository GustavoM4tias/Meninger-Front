<script setup>
// Mapa de localização com marcadores (empreendimento, pontos de interesse,
// origem de leads por região). Usa o embed do OpenStreetMap (sem chave de API);
// se não houver coordenadas, mostra só a lista de pontos.
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  lat: { type: Number, default: null },
  lon: { type: Number, default: null },
  zoom: { type: Number, default: 14 },
  // markers: [{ lat, lon, label, note }] — o primeiro vira o centro se lat/lon não vierem
  markers: { type: Array, default: () => [] },
  height: { type: Number, default: 320 },
  caption: { type: String, default: '' },
})

const center = computed(() => {
  if (props.lat != null && props.lon != null) return { lat: props.lat, lon: props.lon }
  const withCoords = props.markers.filter((m) => m.lat != null && m.lon != null)
  if (!withCoords.length) return null
  return {
    lat: withCoords.reduce((s, m) => s + Number(m.lat), 0) / withCoords.length,
    lon: withCoords.reduce((s, m) => s + Number(m.lon), 0) / withCoords.length,
  }
})

// Janela do mapa: quanto maior o zoom, menor o delta
const embedUrl = computed(() => {
  if (!center.value) return null
  const d = Math.max(0.004, 0.6 / Math.pow(1.6, props.zoom - 10))
  const bbox = [center.value.lon - d, center.value.lat - d * 0.6, center.value.lon + d, center.value.lat + d * 0.6]
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.join('%2C')}&layer=mapnik&marker=${center.value.lat}%2C${center.value.lon}`
})
</script>

<template>
  <figure class="rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden">
    <figcaption v-if="title" class="px-4 pt-3.5 pb-2 text-sm font-medium text-ink">{{ title }}</figcaption>

    <div v-if="embedUrl" class="relative bg-surface-sunken">
      <iframe
        :src="embedUrl"
        :style="{ height: height + 'px' }"
        class="w-full border-0"
        loading="lazy"
        referrerpolicy="no-referrer"
        :title="title || 'Mapa de localização'"
      />
    </div>
    <div v-else class="px-4 py-6 text-center text-xs text-ink-subtle">
      <i class="fas fa-map-location-dot text-lg mb-2 block" />
      Sem coordenadas informadas.
    </div>

    <!-- Legenda dos pontos -->
    <ul v-if="markers.length" class="divide-y divide-line/70 border-t border-line">
      <li v-for="(m, i) in markers" :key="i" class="flex items-start gap-2.5 px-4 py-2">
        <span class="mt-1 w-2 h-2 rounded-full bg-accent flex-shrink-0" />
        <div class="min-w-0">
          <p class="text-sm text-ink truncate">{{ m.label }}</p>
          <p v-if="m.note" class="text-xs text-ink-subtle">{{ m.note }}</p>
        </div>
      </li>
    </ul>

    <p v-if="caption" class="px-4 py-2.5 text-xs text-ink-subtle border-t border-line/70">{{ caption }}</p>
  </figure>
</template>
