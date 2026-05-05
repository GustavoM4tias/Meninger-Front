<script setup>
import { computed } from 'vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
  building: { type: Object, required: true },
});

const emit = defineEmits(['click']);

const stage = computed(() => props.building.situacao_comercial?.[0]?.nome ?? null);
const segment = computed(() => props.building.segmento?.[0]?.nome ?? null);
const workStatus = computed(() => props.building.situacao_obra?.[0]?.nome ?? null);
const buildingType = computed(() => props.building.tipo_empreendimento?.[0]?.nome ?? null);

// Mapping: stage → variant + accent color
const stageMeta = computed(() => ({
  'Pré-Lançamento':    { variant: 'success', accent: 'bg-emerald-500', icon: 'fas fa-map-location-dot' },
  'Lançamento':        { variant: 'info',    accent: 'bg-sky-500',     icon: 'fas fa-bullhorn' },
  'Em construção':     { variant: 'warning', accent: 'bg-amber-500',   icon: 'fas fa-helmet-safety' },
  'Finalizado':        { variant: 'danger',  accent: 'bg-rose-500',    icon: 'fas fa-key' },
  'Portal do Cliente': { variant: 'accent',  accent: 'bg-purple-500',  icon: 'fas fa-door-open' },
}[stage.value] || { variant: 'neutral', accent: 'bg-slate-500', icon: 'fas fa-building' }));

const showBuildingDetails = () => emit('click', props.building);
</script>

<template>
  <article
    @click="showBuildingDetails"
    class="group flex flex-col rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden cursor-pointer
           hover:shadow-elevated hover:border-accent/40 hover:-translate-y-0.5
           transition-all duration-200 ease-out-expo surface-gradient">

    <!-- Photo -->
    <div class="relative aspect-[16/10] overflow-hidden bg-surface-sunken">
      <img :src="building.foto || '/noimg.jpg'" :alt="building.nome"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out-expo" />

      <!-- Faixa de cor + badge no topo -->
      <div :class="['absolute top-0 left-0 right-0 h-1', stageMeta.accent]"></div>

      <!-- Stage badge sobre a foto -->
      <div v-if="stage"
        class="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md
               bg-black/60 backdrop-blur-md text-white text-[11px] font-medium border border-white/20">
        <i :class="stageMeta.icon" class="text-[9px]"></i>
        {{ stage }}
      </div>
    </div>

    <!-- Body -->
    <div class="flex flex-col flex-1 p-4">
      <!-- Title -->
      <h3 class="text-sm sm:text-base font-semibold text-ink leading-tight truncate group-hover:text-accent transition-colors">
        {{ building.nome }}
      </h3>

      <!-- Cidade / Estado -->
      <p class="text-xs text-ink-muted mt-1 inline-flex items-center gap-1.5">
        <i class="fas fa-location-dot text-[10px] text-ink-subtle"></i>
        {{ building.cidade }}<template v-if="building.estado">/{{ building.estado }}</template>
      </p>

      <!-- Tags -->
      <div class="mt-3 flex flex-wrap gap-1.5">
        <Badge v-if="segment" variant="neutral" size="sm">{{ segment }}</Badge>
        <Badge v-if="buildingType" variant="neutral" size="sm">{{ buildingType }}</Badge>
        <Badge v-if="workStatus && workStatus !== stage" variant="neutral" size="sm">{{ workStatus }}</Badge>
      </div>

      <!-- Footer -->
      <div class="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-ink-subtle">
        <span class="font-mono">#{{ building.idempreendimento }}</span>
        <span class="inline-flex items-center gap-1 text-accent group-hover:translate-x-0.5 transition-transform">
          Ver detalhes
          <i class="fas fa-arrow-right text-[10px]"></i>
        </span>
      </div>
    </div>
  </article>
</template>
