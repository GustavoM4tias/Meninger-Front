<script setup>
/**
 * Cartão do empreendimento na listagem. É o degrau `panel-focus` do design
 * system (clicável): foto com a etapa por cima, nome, cidade, o que o CV
 * sabe de estoque e entrega, e as tags de tipo/segmento/obra.
 */
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

// Etapa comercial → cor da faixa e do selo (mesma paleta das seções)
const stageMeta = computed(() => ({
  'Pré-Lançamento':    { variant: 'success', accent: 'bg-data-pos',  icon: 'fas fa-map-location-dot' },
  'Lançamento':        { variant: 'info',    accent: 'bg-accent',    icon: 'fas fa-bullhorn' },
  'Em construção':     { variant: 'warning', accent: 'bg-data-warn', icon: 'fas fa-helmet-safety' },
  'Finalizado':        { variant: 'danger',  accent: 'bg-data-neg',  icon: 'fas fa-key' },
  'Portal do Cliente': { variant: 'accent',  accent: 'bg-accent',    icon: 'fas fa-door-open' },
}[stage.value] || { variant: 'neutral', accent: 'bg-data-neutral', icon: 'fas fa-building' }));

const disponiveis = computed(() => {
  const n = Number(props.building.unidades_disponiveis);
  return Number.isFinite(n) && props.building.unidades_disponiveis != null ? n : null;
});
const andamento = computed(() => {
  const n = Number(props.building.andamento);
  return Number.isFinite(n) && props.building.andamento != null ? Math.max(0, Math.min(100, n)) : null;
});
const entrega = computed(() => {
  const d = props.building.data_entrega;
  if (!d) return null;
  const m = String(d).match(/^(\d{4})-(\d{2})/);
  return m ? `${m[2]}/${m[1]}` : String(d);
});

const abrir = () => emit('click', props.building);
</script>

<template>
  <article
    role="button" tabindex="0"
    @click="abrir" @keydown.enter.prevent="abrir" @keydown.space.prevent="abrir"
    :aria-label="`Abrir ${building.nome}`"
    class="group panel-focus flex flex-col overflow-hidden">

    <!-- Foto: a etapa comercial mora aqui, na faixa e no selo -->
    <div class="relative aspect-[16/9] overflow-hidden bg-surface-sunken">
      <img :src="building.foto_listagem || building.foto || '/noimg.jpg'" :alt="building.nome" loading="lazy"
        class="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out-expo" />
      <div :class="['absolute top-0 left-0 right-0 h-1', stageMeta.accent]"></div>
      <div v-if="stage"
        class="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md
               bg-black/60 backdrop-blur-md text-white text-micro font-medium border border-white/20">
        <i :class="stageMeta.icon" class="text-[9px]"></i>{{ stage }}
      </div>
      <img v-if="building.logo" :src="building.logo" alt=""
        class="absolute bottom-2 right-2 h-8 max-w-[96px] object-contain rounded-md bg-white/85 p-1" />
    </div>

    <div class="flex flex-col flex-1 p-4 gap-3">
      <div class="min-w-0">
        <h3 class="text-sm sm:text-base font-semibold text-ink leading-tight truncate group-hover:text-accent transition-colors" :title="building.nome">
          {{ building.nome }}
        </h3>
        <p class="text-xs text-ink-muted mt-1 inline-flex items-center gap-1.5 min-w-0">
          <i class="fas fa-location-dot text-[10px] text-ink-subtle"></i>
          <span class="truncate">{{ building.cidade || 'Cidade não informada' }}<template v-if="building.estado">/{{ building.estado }}</template></span>
        </p>
      </div>

      <!-- O que o CV sabe: estoque, entrega, andamento -->
      <dl class="grid grid-cols-3 gap-2 text-center">
        <div class="rounded-lg bg-surface-sunken border border-line-subtle px-1.5 py-1.5 min-w-0">
          <dt class="text-micro text-ink-subtle truncate">Disponíveis</dt>
          <dd class="metric text-sm tabular-nums" :class="disponiveis ? 'text-data-pos' : 'text-ink-muted'">{{ disponiveis ?? '-' }}</dd>
        </div>
        <div class="rounded-lg bg-surface-sunken border border-line-subtle px-1.5 py-1.5 min-w-0">
          <dt class="text-micro text-ink-subtle truncate">Entrega</dt>
          <dd class="metric text-sm tabular-nums text-ink">{{ entrega ?? '-' }}</dd>
        </div>
        <div class="rounded-lg bg-surface-sunken border border-line-subtle px-1.5 py-1.5 min-w-0">
          <dt class="text-micro text-ink-subtle truncate">Obra</dt>
          <dd class="metric text-sm tabular-nums text-ink">{{ andamento != null ? `${andamento}%` : '-' }}</dd>
        </div>
      </dl>
      <div v-if="andamento != null" class="h-1 rounded-full bg-surface-sunken overflow-hidden -mt-1">
        <div class="h-full rounded-full bg-data-warn/70 transition-all duration-500" :style="{ width: `${andamento}%` }"></div>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <Badge v-if="buildingType" variant="neutral" size="sm">{{ buildingType }}</Badge>
        <Badge v-if="segment" variant="neutral" size="sm">{{ segment }}</Badge>
        <Badge v-if="workStatus && workStatus !== stage" variant="neutral" size="sm">{{ workStatus }}</Badge>
      </div>

      <div class="mt-auto pt-3 border-t border-line-subtle flex items-center justify-between text-xs text-ink-subtle">
        <span class="font-mono">CV #{{ building.idempreendimento }}<template v-if="building.idempreendimento_int"> · Sienge {{ building.idempreendimento_int }}</template></span>
        <span class="inline-flex items-center gap-1 text-accent group-hover:translate-x-0.5 transition-transform">
          Abrir <i class="fas fa-arrow-right text-[10px]"></i>
        </span>
      </div>
    </div>
  </article>
</template>
