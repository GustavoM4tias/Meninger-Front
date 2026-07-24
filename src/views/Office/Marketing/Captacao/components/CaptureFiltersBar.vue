<script setup>
// FiltersBar da Captação — mesma estrutura visual do FiltersBar de Campanhas.
// Toolbar header (sempre visível, com badge de filtros ativos) + grid expansível.
//
// Filtros: status, canal, origem CV, campanha, mídia, busca, período, sort.

import { computed, ref } from 'vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
    filtros: { type: Object, required: true },
    campaignOptions: { type: Array, default: () => [] }, // [{ id, name }]
    midiaOptions: { type: Array, default: () => [] },    // [string]
    cvOrigemOptions: { type: Array, default: () => [] }, // [string]
    hasActive: { type: Boolean, default: false },
});

const emit = defineEmits(['update:filtros', 'buscar', 'limpar']);

function updateField(key, val) {
    const next = { ...props.filtros, [key]: Array.isArray(val) ? [...val] : val };
    emit('update:filtros', next);
}

// ── Status: lista fixa de rótulos pt-BR → token ─────────────────────────────
const STATUS_LABELS = {
    received: 'Recebido', validated: 'Validado', held: 'Aguardando vínculo',
    routed: 'Roteado', dispatching: 'Despachando', delivered: 'Entregue',
    rejected: 'Recusado', failed: 'Falhou', spam: 'Spam', historical: 'Histórico Meta',
};
const STATUS_TOKENS = Object.fromEntries(Object.entries(STATUS_LABELS).map(([k, v]) => [v, k]));
const statusOptions = Object.values(STATUS_LABELS);
const statusSelected = computed({
    get: () => (props.filtros.status || []).map(s => STATUS_LABELS[s] || s),
    set: (v) => updateField('status', v.map(l => STATUS_TOKENS[l] || l)),
});

// ── Canal ────────────────────────────────────────────────────────────────────
const CHANNEL_LABELS = { meta_lead_ads: 'Meta Lead Ads', site_form: 'Formulário do site' };
const CHANNEL_TOKENS = Object.fromEntries(Object.entries(CHANNEL_LABELS).map(([k, v]) => [v, k]));
const channelOptions = Object.values(CHANNEL_LABELS);
const channelSelected = computed({
    get: () => (props.filtros.channel || []).map(c => CHANNEL_LABELS[c] || c),
    set: (v) => updateField('channel', v.map(l => CHANNEL_TOKENS[l] || l)),
});

// ── Origem CV (rótulos amigáveis) ────────────────────────────────────────────
const CV_ORIGEM_LABELS = {
    FB: 'Facebook (FB)', IG: 'Instagram (IG)', SI: 'WebSite (SI)',
    GO: 'Google (GO)',   MP: 'Mídia Paga (MP)', OU: 'Outros (OU)',
};
const CV_ORIGEM_TOKENS = Object.fromEntries(Object.entries(CV_ORIGEM_LABELS).map(([k, v]) => [v, k]));
const cvOrigemUnionOptions = computed(() => {
    // União: opções dos filtros já aplicados + opções vindas dos leads carregados.
    const set = new Set([...Object.keys(CV_ORIGEM_LABELS), ...(props.cvOrigemOptions || [])]);
    return [...set].map(k => CV_ORIGEM_LABELS[k] || k).sort();
});
const cvOrigemSelected = computed({
    get: () => (props.filtros.cv_origem || []).map(c => CV_ORIGEM_LABELS[c] || c),
    set: (v) => updateField('cv_origem', v.map(l => CV_ORIGEM_TOKENS[l] || l)),
});

// ── Campanha — value=id, mas exibe name ──────────────────────────────────────
const campLabelById = computed(() =>
    Object.fromEntries((props.campaignOptions || []).map(c => [String(c.id), c.name])));
const campIdByLabel = computed(() =>
    Object.fromEntries((props.campaignOptions || []).map(c => [c.name, String(c.id)])));
const campaignLabels = computed(() => (props.campaignOptions || []).map(c => c.name));
const campaignSelected = computed({
    get: () => (props.filtros.meta_campaign_id || [])
        .map(id => campLabelById.value[String(id)]).filter(Boolean),
    set: (v) => updateField('meta_campaign_id', v.map(l => campIdByLabel.value[l]).filter(Boolean)),
});

// ── Sort ─────────────────────────────────────────────────────────────────────
const SORT_LABELS = {
    recent: 'Mais recentes', oldest: 'Mais antigos', stuck: 'Presos há mais tempo',
};
const SORT_TOKENS = Object.fromEntries(Object.entries(SORT_LABELS).map(([k, v]) => [v, k]));
const sortOptions = Object.values(SORT_LABELS);
const sortSelected = computed({
    get: () => props.filtros.sort ? [SORT_LABELS[props.filtros.sort]] : [SORT_LABELS.recent],
    set: (v) => updateField('sort', v.length ? (SORT_TOKENS[v[v.length - 1]] || 'recent') : 'recent'),
});

// ── Datas ────────────────────────────────────────────────────────────────────
const periodStart = computed({
    get: () => props.filtros.period_start || '',
    set: (v) => updateField('period_start', v || ''),
});
const periodEnd = computed({
    get: () => props.filtros.period_end || '',
    set: (v) => updateField('period_end', v || ''),
});

// ── Expand/collapse ──────────────────────────────────────────────────────────
// Recolhido por padrão (padrão do sistema) — o usuário abre quando precisar.
const isExpanded = ref(false);
function toggle() { isExpanded.value = !isExpanded.value; }
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient">

    <!-- Toolbar header -->
    <div class="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-line bg-surface-sunken/40 rounded-t-xl">
      <button @click="toggle"
        class="flex items-center gap-2 text-sm font-medium text-ink hover:text-accent transition-colors">
        <i class="fas fa-filter text-xs text-ink-muted"></i>
        <span>Filtros</span>
        <Badge v-if="hasActive" variant="accent" size="sm">ativos</Badge>
        <i class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200"
          :class="{ 'rotate-180': isExpanded }"></i>
      </button>

      <div class="flex-1 min-w-0 hidden md:block">
        <Input :model-value="filtros.q"
          @update:modelValue="v => updateField('q', v)"
          @keyup.enter="$emit('buscar')"
          placeholder="Nome, e-mail, telefone ou mídia..."
          icon-left="fas fa-magnifying-glass" size="sm" />
      </div>

      <div class="ml-auto flex items-center gap-1.5">
        <slot name="extra-actions" />
        <Button variant="ghost" size="sm" icon="fas fa-eraser" @click="$emit('limpar')">
          <span class="hidden sm:inline">Limpar</span>
        </Button>
        <Button size="sm" icon="fas fa-magnifying-glass" @click="$emit('buscar')">
          <span class="hidden sm:inline">Aplicar</span>
        </Button>
      </div>
    </div>

    <!-- Campos -->
    <div v-show="isExpanded"
      class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in"
      style="overflow: visible;">

      <!-- Busca (mobile) -->
      <div class="md:hidden sm:col-span-2">
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-magnifying-glass text-[10px] mr-1 text-ink-subtle"></i>Buscar
        </label>
        <Input :model-value="filtros.q"
          @update:modelValue="v => updateField('q', v)"
          @keyup.enter="$emit('buscar')"
          placeholder="Nome, e-mail, telefone..." size="sm" />
      </div>

      <!-- Status -->
      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-circle-dot text-[10px] mr-1 text-ink-subtle"></i>Status do lead
        </label>
        <MultiSelector v-model="statusSelected" :options="statusOptions"
          placeholder="Todos os status" :page-size="50" />
      </div>

      <!-- Canal -->
      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-broadcast-tower text-[10px] mr-1 text-ink-subtle"></i>Canal de entrada
        </label>
        <MultiSelector v-model="channelSelected" :options="channelOptions"
          placeholder="Todos os canais" :page-size="10" />
      </div>

      <!-- Origem CV -->
      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-tags text-[10px] mr-1 text-ink-subtle"></i>Origem (CV)
        </label>
        <MultiSelector v-model="cvOrigemSelected" :options="cvOrigemUnionOptions"
          placeholder="Todas as origens" :page-size="20" />
      </div>

      <!-- Campanha -->
      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-bullhorn text-[10px] mr-1 text-ink-subtle"></i>Campanha (Meta)
        </label>
        <MultiSelector v-model="campaignSelected" :options="campaignLabels"
          placeholder="Todas as campanhas visíveis" :page-size="150" />
      </div>

      <!-- Mídia -->
      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-hashtag text-[10px] mr-1 text-ink-subtle"></i>Mídia (slug)
        </label>
        <MultiSelector :model-value="filtros.midia_slug"
          @update:modelValue="v => updateField('midia_slug', v)"
          :options="midiaOptions" placeholder="Todas as mídias visíveis" :page-size="100" />
      </div>

      <!-- Datas -->
      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-calendar-day text-[10px] mr-1 text-ink-subtle"></i>Entrada Office (de)
        </label>
        <Input v-model="periodStart" type="date" size="sm" />
      </div>
      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-calendar-check text-[10px] mr-1 text-ink-subtle"></i>Entrada Office (até)
        </label>
        <Input v-model="periodEnd" type="date" size="sm" />
      </div>

      <!-- Sort -->
      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-arrow-down-wide-short text-[10px] mr-1 text-ink-subtle"></i>Ordenar por
        </label>
        <MultiSelector v-model="sortSelected" :options="sortOptions"
          placeholder="Mais recentes" :page-size="5" />
      </div>
    </div>
  </section>
</template>
