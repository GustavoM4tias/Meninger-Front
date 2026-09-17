<script setup>
// FiltersBar da Captação - mesma estrutura visual do FiltersBar de Campanhas.
// Toolbar header (sempre visível, com badge de filtros ativos) + grid expansível.
//
// Filtros: status, canal, origem CV, campanha, mídia, busca, período, sort.

import { computed, ref } from 'vue';
import FilterBar from '@/components/UI/FilterBar.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Input from '@/components/UI/Input.vue';
import { labelBase } from '@/components/UI/_classes.js';

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
    rejected: 'Recusado', failed: 'Falhou', spam: 'Spam', ignored: 'Fora do CV', historical: 'Histórico Meta',
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

// ── Campanha - value=id, mas exibe name ──────────────────────────────────────
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

// Selo "N ativos" da barra: ordenação não é filtro.
const activeFiltersCount = computed(() => {
    const f = props.filtros || {};
    return Object.entries(f).reduce((acc, [k, v]) => {
        if (k === 'sort') return acc;
        if (Array.isArray(v)) return acc + (v.length > 0 ? 1 : 0);
        if (typeof v === 'boolean') return acc + (v ? 1 : 0);
        return acc + (v && String(v).trim() !== '' ? 1 : 0);
    }, 0);
});

</script>
<template>
  <!-- Filtros da inbox sobre o FilterBar do Office: barra fechada por padrão,
       selo de "N ativos", Limpar/Aplicar. A busca livre mora DENTRO do painel
       de filtros, junto dos outros campos (um caminho de filtro só). -->
  <FilterBar :active-count="activeFiltersCount" apply-label="Aplicar" @apply="$emit('buscar')" @clear="$emit('limpar')">
    <template #actions><slot name="extra-actions" /></template>

    <Input :model-value="filtros.q" @update:modelValue="v => updateField('q', v)" @keyup.enter="$emit('buscar')"
      label="Buscar" placeholder="Nome, e-mail, telefone ou mídia..." icon-left="fas fa-magnifying-glass" size="sm" class="sm:col-span-2" />

    <div>
      <label :class="labelBase">Status do lead</label>
      <MultiSelector v-model="statusSelected" :options="statusOptions" placeholder="Todos os status" :page-size="50" />
    </div>
    <div>
      <label :class="labelBase">Canal de entrada</label>
      <MultiSelector v-model="channelSelected" :options="channelOptions" placeholder="Todos os canais" :page-size="10" />
    </div>
    <div>
      <label :class="labelBase">Origem (CV)</label>
      <MultiSelector v-model="cvOrigemSelected" :options="cvOrigemUnionOptions" placeholder="Todas as origens" :page-size="20" />
    </div>
    <div>
      <label :class="labelBase">Campanha (Meta)</label>
      <MultiSelector v-model="campaignSelected" :options="campaignLabels" placeholder="Todas as campanhas" :page-size="100" />
    </div>
    <div>
      <label :class="labelBase">Mídia (slug)</label>
      <MultiSelector :model-value="filtros.midia_slug" @update:modelValue="v => updateField('midia_slug', v)"
        :options="midiaOptions" placeholder="Todas as mídias visíveis" :page-size="100" />
    </div>

    <Input v-model="periodStart" type="date" label="Entrada Office (de)" size="sm" />
    <Input v-model="periodEnd" type="date" label="Entrada Office (até)" size="sm" />

    <div>
      <label :class="labelBase">Ordenar por</label>
      <MultiSelector v-model="sortSelected" :options="sortOptions" placeholder="Mais recentes" :page-size="10" />
    </div>
  </FilterBar>
</template>
