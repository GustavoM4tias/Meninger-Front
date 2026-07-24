<script setup>
// Detalhe de uma campanha Meta: KPIs, gráfico de leads/dia, lista de leads,
// configuração interna (notes, priority, archived).

import { ref, computed, watch } from 'vue';
import { useCampaignsStore } from '@/stores/Marketing/Campaigns/campaignsStore';
import Button from '@/components/UI/Button.vue';
import EnterpriseMultiSelect from '@/components/Marketing/EnterpriseMultiSelect.vue';
import MetaFormMappingModal from '@/views/Office/Marketing/Formularios/components/MetaFormMappingModal.vue';
import CreativeLightbox from './CreativeLightbox.vue';
import CampaignDailyChart from './CampaignDailyChart.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    campaignId: { type: String, default: null },
    // Período do relatório — recorta o gráfico dia-a-dia e a lista de leads.
    // Sem período (ex.: aberto pela Central de Vínculos) → janela padrão de 30d
    // e leads mais recentes (comportamento legado).
    since: { type: String, default: null },
    until: { type: String, default: null },
});
const emit = defineEmits(['update:open', 'saved']);

const store = useCampaignsStore();

const campaign = ref(null);
const leads = ref([]);
const daily = ref([]);
const ads = ref([]);
const adsets = ref([]);                 // conjuntos de anúncio (ad sets)
const adsetsLoading = ref(false);
const expandedAdsets = ref(new Set());  // ids dos adsets expandidos
const adsLoading = ref(false);
const adsSyncing = ref(false);
const adsLastSync = ref(null);
const adsStatusFilter = ref('ALL');     // ALL | ACTIVE | PAUSED | OTHER
const adsetSortBy = ref('spend');       // spend | leads | name | recent
const formDetailOpen = ref(false);
const formDetailData = ref(null);       // { id, name, page_name, status, questions }
const loading = ref(false);
const activeSection = ref('overview');

// Editáveis pelo admin
const notes = ref('');
const priority = ref('normal');
const archived = ref(false);

function close() { emit('update:open', false); }

watch([() => props.open, () => props.campaignId, () => props.since, () => props.until], async ([isOpen, id], [prevOpen, prevId]) => {
    // Reset SEMPRE que muda de campanha (ou fecha modal) — evita ver dados
    // da campanha anterior enquanto carrega.
    campaign.value = null;
    leads.value = [];
    daily.value = [];
    ads.value = [];
    adsets.value = [];
    expandedAdsets.value = new Set();
    adsLastSync.value = null;
    formDetailOpen.value = false;
    formDetailData.value = null;

    if (!isOpen || !id) return;
    loading.value = true;
    activeSection.value = 'overview';
    try {
        const scope = (props.since && props.until) ? { since: props.since, until: props.until } : {};
        const [c, l, d] = await Promise.all([
            store.fetchDetail(id),
            store.fetchLeads(id, { limit: 100, ...scope }),
            store.fetchDaily(id, { days: 30, ...scope }),
        ]);
        campaign.value = c;
        leads.value = l;
        daily.value = d;
        notes.value = c?.notes || '';
        priority.value = c?.priority || 'normal';
        archived.value = !!c?.archived;
    } finally {
        loading.value = false;
    }
}, { immediate: true });

function fmtMoney(v, currency = 'BRL') {
    if (v == null) return '—';
    try {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(v));
    } catch { return `R$ ${v}`; }
}
function fmtInt(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('pt-BR').format(Number(v));
}
function fmtPct(v, digits = 2) {
    if (v == null) return '—';
    return `${Number(v).toFixed(digits)}%`;
}
function fmtDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return '—'; }
}
function fmtRelative(iso) {
    if (!iso) return '—';
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1)    return 'agora';
    if (min < 60)   return `${min}min atrás`;
    const h = Math.floor(min / 60);
    if (h < 24)     return `${h}h atrás`;
    const d = Math.floor(h / 24);
    if (d < 7)      return `${d}d atrás`;
    return new Date(iso).toLocaleDateString('pt-BR');
}

// Rótulo do período em uso (recorte do relatório, ou janela padrão de 30d).
const scopeLabel = computed(() => {
    if (props.since && props.until) {
        const f = (d) => d ? d.split('-').reverse().slice(0, 2).join('/') : '';
        return `${f(props.since)} a ${f(props.until)}`;
    }
    return 'últimos 30 dias';
});

const statusBadge = computed(() => {
    const s = String(campaign.value?.effective_status || campaign.value?.status || '').toUpperCase();
    if (s.includes('ACTIVE'))   return { label: s.replace(/_/g, ' '), cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20' };
    if (s.includes('PAUSED'))   return { label: s.replace(/_/g, ' '), cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20' };
    if (s.includes('DELETED'))  return { label: s.replace(/_/g, ' '), cls: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20' };
    if (s.includes('ARCHIVED')) return { label: s.replace(/_/g, ' '), cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    return { label: s || '—', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
});

const kpis = computed(() => {
    const c = campaign.value;
    if (!c) return null;
    const leadsMeta = Number(c.meta_leads_total) || 0;
    const spend = Number(c.spend) || 0;
    const cac = c.cac != null ? Number(c.cac) : (leadsMeta > 0 ? spend / leadsMeta : null);
    const conversionRate = c.clicks > 0 ? (leadsMeta / c.clicks) * 100 : null;
    return {
        spend,
        leadsMeta,
        cac,
        ctr: c.ctr,
        cpc: c.cpc,
        cpm: c.cpm,
        impressions: c.impressions,
        clicks: c.clicks,
        reach: c.reach,
        conversionRate,
    };
});

// Para o gráfico — escalas independentes pra spend (R$) e leads (count).
const dailyMaxSpend = computed(() => Math.max(1, ...daily.value.map(d => Number(d.spend) || 0)));
const dailyMaxLeads = computed(() => Math.max(1, ...daily.value.map(d => Number(d.meta_leads) || 0)));
const dailyTotals = computed(() => {
    const acc = { spend: 0, metaLeads: 0, clicks: 0, impressions: 0 };
    for (const d of daily.value) {
        acc.spend       += Number(d.spend)       || 0;
        acc.metaLeads   += Number(d.meta_leads)  || 0;
        acc.clicks      += Number(d.clicks)      || 0;
        acc.impressions += Number(d.impressions) || 0;
    }
    return acc;
});

function statusColor(s) {
    if (s === 'delivered')               return 'text-emerald-600 dark:text-emerald-300';
    if (s === 'held')                    return 'text-amber-600 dark:text-amber-300';
    if (s === 'spam')                    return 'text-red-500';
    if (s === 'failed' || s === 'rejected') return 'text-red-600 dark:text-red-300';
    return 'text-ink-muted';
}

async function saveInternal() {
    const updated = await store.updateInternal(campaign.value.id, {
        notes: notes.value.trim() || null,
        priority: priority.value || 'normal',
        archived: archived.value,
    });
    if (updated) {
        campaign.value = { ...campaign.value, ...updated };
        emit('saved', updated);
        window.alert('Salvo.');
    }
}

const sections = [
    { key: 'overview',  label: 'Visão geral',  icon: 'fas fa-chart-pie' },
    { key: 'vinculo',   label: 'Vínculo CV',   icon: 'fas fa-link' },
    { key: 'structure', label: 'Estrutura',    icon: 'fas fa-sitemap' },
    { key: 'leads',     label: 'Leads',        icon: 'fas fa-users' },
    { key: 'daily',     label: 'Dia-a-dia',    icon: 'fas fa-chart-column' },
    { key: 'gestao',    label: 'Gestão',       icon: 'fas fa-clipboard-list' },
];

// ── Vínculo CV (mapping da campanha) ───────────────────────────────────────
const vinculo = ref({
    bound_empreendimentos: [], midia_slug: '', cv_origem: 'FB',
    tags_str: '', mapping_active: true,
    default_utm_source: '', default_utm_medium: '', default_utm_campaign: '',
    default_utm_content: '', default_utm_term: '',
    cv_extra_json: '',
});
const vinculoSaving = ref(false);
const vinculoError = ref(null);

watch(campaign, (c) => {
    if (!c) return;
    vinculo.value = {
        bound_empreendimentos: Array.isArray(c.bound_empreendimentos) ? [...c.bound_empreendimentos] : [],
        midia_slug: c.midia_slug || '',
        cv_origem: c.cv_origem || 'FB',
        tags_str: Array.isArray(c.tags) ? c.tags.join(', ') : '',
        mapping_active: c.mapping_active !== false,
        default_utm_source:   c.default_utm_source   || '',
        default_utm_medium:   c.default_utm_medium   || '',
        default_utm_campaign: c.default_utm_campaign || '',
        default_utm_content:  c.default_utm_content  || '',
        default_utm_term:     c.default_utm_term     || '',
        cv_extra_json: c.cv_extra_fields ? JSON.stringify(c.cv_extra_fields, null, 2) : '',
    };
    vinculoError.value = null;
});

const willRoute = computed(() => vinculo.value.mapping_active && !!vinculo.value.midia_slug?.trim());

async function saveVinculo() {
    vinculoError.value = null;
    if (vinculo.value.mapping_active && !vinculo.value.midia_slug.trim()) {
        vinculoError.value = 'Mídia é obrigatória pra ativar o roteamento. Desative ou preencha.';
        return;
    }
    let cvExtra = null;
    if (vinculo.value.cv_extra_json.trim()) {
        try {
            const parsed = JSON.parse(vinculo.value.cv_extra_json);
            if (typeof parsed !== 'object' || Array.isArray(parsed)) {
                vinculoError.value = 'cv_extra_fields precisa ser um objeto JSON.';
                return;
            }
            cvExtra = parsed;
        } catch (e) {
            vinculoError.value = 'JSON inválido em cv_extra_fields: ' + e.message;
            return;
        }
    }
    const tagsArr = vinculo.value.tags_str.split(',').map(t => t.trim()).filter(Boolean);

    vinculoSaving.value = true;
    try {
        const updated = await store.updateInternal(campaign.value.id, {
            bound_empreendimentos: vinculo.value.bound_empreendimentos,
            midia_slug: vinculo.value.midia_slug.trim() || null,
            cv_origem: vinculo.value.cv_origem || 'FB',
            tags: tagsArr.length ? tagsArr : null,
            mapping_active: vinculo.value.mapping_active,
            default_utm_source:   vinculo.value.default_utm_source.trim()   || null,
            default_utm_medium:   vinculo.value.default_utm_medium.trim()   || null,
            default_utm_campaign: vinculo.value.default_utm_campaign.trim() || null,
            default_utm_content:  vinculo.value.default_utm_content.trim()  || null,
            default_utm_term:     vinculo.value.default_utm_term.trim()     || null,
            cv_extra_fields: cvExtra,
        });
        if (updated) {
            campaign.value = { ...campaign.value, ...updated };
            emit('saved', updated);
        }
    } finally {
        vinculoSaving.value = false;
    }
}

async function loadAds() {
    const targetId = campaign.value?.id;          // snapshot do id no momento
    if (!targetId) return;
    adsLoading.value = true;
    try {
        const result = await store.fetchAds(targetId);
        // Guarda contra race: só aplica se a campanha visível ainda for a mesma.
        if (campaign.value?.id === targetId) {
            ads.value = result;
        }
    } finally {
        adsLoading.value = false;
    }
}

async function loadAdSets() {
    const targetId = campaign.value?.id;
    if (!targetId) return;
    adsetsLoading.value = true;
    try {
        const result = await store.fetchAdSets(targetId);
        if (campaign.value?.id === targetId) {
            adsets.value = result;
        }
    } finally {
        adsetsLoading.value = false;
    }
}

/** Carrega adsets + ads em paralelo (pra aba Estrutura). */
async function loadStructure() {
    await Promise.all([loadAdSets(), loadAds()]);
    // UX: auto-expande se só tem 1 conjunto (drill-in implícito)
    if (adsets.value.length === 1 && expandedAdsets.value.size === 0) {
        expandedAdsets.value = new Set([adsets.value[0].id]);
    }
}

async function syncAds() {
    const targetId = campaign.value?.id;
    if (!targetId) return;
    adsSyncing.value = true;
    adsLastSync.value = null;
    try {
        // O backend já sincroniza ads + adsets em sequência (syncForCampaign).
        const r = await store.syncAds(targetId, { sinceDays: 90 });
        // Só aplica se ainda estamos na mesma campanha
        if (campaign.value?.id === targetId) {
            if (r) adsLastSync.value = r;
            await loadStructure();
        }
    } finally {
        adsSyncing.value = false;
    }
}

// Carrega adsets+ads quando entra na aba Estrutura pela 1ª vez OU quando a
// campanha muda. Os arrays já foram resetados pelo watch principal — aqui só
// dispara o fetch quando precisa.
watch([activeSection, campaign], async ([s, c]) => {
    if (s === 'structure' && c?.id && !adsLoading.value && !adsetsLoading.value
        && !ads.value.length && !adsets.value.length) {
        await loadStructure();
    }
});

function toggleAdsetExpanded(adsetId) {
    const next = new Set(expandedAdsets.value);
    if (next.has(adsetId)) next.delete(adsetId);
    else next.add(adsetId);
    expandedAdsets.value = next;
}

function expandAllAdsets() {
    const next = new Set();
    for (const a of adsets.value) next.add(a.id);
    expandedAdsets.value = next;
}

function collapseAllAdsets() {
    expandedAdsets.value = new Set();
}

function pacingBadge(pace) {
    if (pace === 'on_track') return { label: 'No ritmo', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20', icon: 'fas fa-bullseye' };
    if (pace === 'fast')     return { label: 'Acelerado', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20', icon: 'fas fa-gauge-high' };
    if (pace === 'slow')     return { label: 'Lento',     cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/20', icon: 'fas fa-gauge-simple-low' };
    return null;
}

function isVideoAd(ad) {
    return !!(ad?.creative_video_id || ad?.creative_video_url ||
              String(ad?.creative_object_type || '').toUpperCase().includes('VIDEO'));
}

function adStatusBadge(s) {
    const status = String(s || '').toUpperCase();
    if (status.includes('ACTIVE'))   return { label: 'Ativo',     cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20' };
    if (status.includes('PAUSED'))   return { label: 'Pausado',   cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20' };
    if (status.includes('DELETED'))  return { label: 'Excluído',  cls: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20' };
    if (status.includes('ARCHIVED')) return { label: 'Arquivado', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    return { label: status || '—', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
}

const filteredAds = computed(() => {
    if (adsStatusFilter.value === 'ALL') return ads.value;
    return ads.value.filter(a => {
        const s = String(a.effective_status || a.status || '').toUpperCase();
        if (adsStatusFilter.value === 'ACTIVE') return s.includes('ACTIVE');
        if (adsStatusFilter.value === 'PAUSED') return s.includes('PAUSED');
        return !s.includes('ACTIVE') && !s.includes('PAUSED');
    });
});

const adsTotals = computed(() => {
    const acc = { count: 0, spend: 0, leads: 0, impressions: 0, clicks: 0, withForm: 0 };
    for (const a of filteredAds.value) {
        acc.count += 1;
        acc.spend += Number(a.spend) || 0;
        acc.leads += Number(a.meta_leads_total) || 0;
        acc.impressions += Number(a.impressions) || 0;
        acc.clicks += Number(a.clicks) || 0;
        if (a.lead_form_id) acc.withForm += 1;
    }
    return acc;
});

// ── Estrutura hierárquica: Conjuntos → Ads ───────────────────────────────
// Agrupa os ads filtrados sob cada adset; mantém também um "bucket" sintético
// pra ads sem adset_id (caso raro — Meta retorna isso). Aplica sort por adset.
const adsetsWithAds = computed(() => {
    // Index ads por adset_id (usando o status filter já aplicado em filteredAds)
    const byAdSet = new Map();
    for (const ad of filteredAds.value) {
        const key = ad.adset_id || '__none__';
        if (!byAdSet.has(key)) byAdSet.set(key, []);
        byAdSet.get(key).push(ad);
    }

    // Mescla com os adsets vindos do backend (que têm name, status, métricas
    // próprias). Adsets sem ads filtrados ainda aparecem (com 0 ads).
    const items = adsets.value.map(adset => {
        const adsList = byAdSet.get(adset.id) || [];
        // Recalcula os totais a partir dos ads filtrados (pra refletir o filtro
        // de status) — pra spend/leads/impressões/cliques o adset.* original
        // continua disponível como "totalDoAdSet".
        const filteredTotals = adsList.reduce((acc, a) => ({
            spend: acc.spend + (Number(a.spend) || 0),
            leads: acc.leads + (Number(a.meta_leads_total) || 0),
            impressions: acc.impressions + (Number(a.impressions) || 0),
            clicks: acc.clicks + (Number(a.clicks) || 0),
        }), { spend: 0, leads: 0, impressions: 0, clicks: 0 });
        return {
            adset,
            ads: adsList,
            totals: filteredTotals,
            adsCount: adsList.length,
        };
    });

    // Caso haja ads "órfãos" (sem adset_id ou cujo adset_id não veio no sync)
    const orphans = [];
    for (const [key, list] of byAdSet.entries()) {
        if (key === '__none__' || !adsets.value.find(a => a.id === key)) {
            orphans.push(...list);
        }
    }
    if (orphans.length) {
        const t = orphans.reduce((acc, a) => ({
            spend: acc.spend + (Number(a.spend) || 0),
            leads: acc.leads + (Number(a.meta_leads_total) || 0),
            impressions: acc.impressions + (Number(a.impressions) || 0),
            clicks: acc.clicks + (Number(a.clicks) || 0),
        }), { spend: 0, leads: 0, impressions: 0, clicks: 0 });
        items.push({
            adset: { id: '__orphans__', name: '(Anúncios sem conjunto sincronizado)', status: null, effective_status: null },
            ads: orphans,
            totals: t,
            adsCount: orphans.length,
        });
    }

    // Sort
    const by = adsetSortBy.value;
    items.sort((a, b) => {
        if (by === 'spend')  return (b.totals.spend || 0) - (a.totals.spend || 0);
        if (by === 'leads')  return (b.totals.leads || 0) - (a.totals.leads || 0);
        if (by === 'name')   return String(a.adset.name || '').localeCompare(String(b.adset.name || ''));
        if (by === 'recent') {
            const ta = a.adset.updated_time ? new Date(a.adset.updated_time).getTime() : 0;
            const tb = b.adset.updated_time ? new Date(b.adset.updated_time).getTime() : 0;
            return tb - ta;
        }
        return 0;
    });

    return items;
});

function fmtBudget(adset) {
    if (adset.daily_budget_cents)    return `${fmtMoney(adset.daily_budget_cents / 100, campaign.value?.currency)}/dia`;
    if (adset.lifetime_budget_cents) return `${fmtMoney(adset.lifetime_budget_cents / 100, campaign.value?.currency)} total`;
    return null;
}

function openFormDetail(ad) {
    if (!ad?.lead_form) return;
    formDetailData.value = ad.lead_form;
    formDetailOpen.value = true;
}
function closeFormDetail() {
    formDetailOpen.value = false;
    formDetailData.value = null;
}

// Lightbox de criativo (imagem ou vídeo)
const lightboxOpen = ref(false);
const lightboxData = ref(null);  // { imageUrl, videoUrl, videoId, videoPermalink, title, subtitle }

function openLightbox(ad) {
    lightboxData.value = {
        imageUrl:       ad.creative_image_url || ad.creative_thumbnail || null,
        videoUrl:       ad.creative_video_url || null,
        videoId:        ad.creative_video_id || null,
        videoPermalink: ad.creative_video_permalink || null,
        title:          ad.name || ad.creative_title || '(sem nome)',
        subtitle:       [ad.adset_name, ad.creative_object_type].filter(Boolean).join(' · '),
    };
    lightboxOpen.value = true;
}

// Editor completo de mapeamento de campos. Mantemos os dados do form em
// `formDetailData` (que veio do sub-modal), mas fechamos o sub-modal pra evitar
// stack de 3 modais.
const formEditorOpen = ref(false);
function openFormEditor() {
    formEditorOpen.value = true;
    formDetailOpen.value = false;  // ← fecha o sub-modal de preview
}
function onFormEditorSaved() {
    // Atualiza referencia local com mudanças (recarrega ads pra refletir).
    loadAds();
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="close">
    <div class="bg-surface text-ink w-full max-w-5xl rounded-xl shadow-xl border border-line max-h-[92vh] flex flex-col">

      <!-- Header -->
      <header class="flex items-start gap-3 px-5 pt-5 pb-3 border-b border-line shrink-0">
        <div class="shrink-0 w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
          <i class="fas fa-bullseye text-lg"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-base font-semibold text-ink leading-tight truncate">{{ campaign?.name || 'Campanha' }}</h3>
          <p v-if="campaign" class="text-xs text-ink-subtle mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
            <span class="font-mono">#{{ campaign.id }}</span>
            <span v-if="campaign.account_name">· {{ campaign.account_name }}</span>
            <span v-if="campaign.objective">· {{ campaign.objective }}</span>
          </p>
        </div>
        <span v-if="campaign" :class="['inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium', statusBadge.cls]">
          {{ statusBadge.label }}
        </span>
        <button @click="close" class="shrink-0 text-ink-subtle hover:text-ink p-1">
          <i class="fas fa-times"></i>
        </button>
      </header>

      <!-- KPI bar -->
      <div v-if="kpis" class="grid grid-cols-2 sm:grid-cols-6 gap-2 px-5 py-3 border-b border-line bg-surface-sunken/30 shrink-0">
        <div class="text-center">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Gasto</div>
          <div class="text-lg font-semibold text-ink">{{ fmtMoney(kpis.spend, campaign?.currency) }}</div>
        </div>
        <div class="text-center">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Leads (Meta)</div>
          <div class="text-lg font-semibold text-ink">{{ fmtInt(kpis.leadsMeta) }}</div>
        </div>
        <div class="text-center">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle" title="Custo por lead">CAC</div>
          <div class="text-lg font-semibold" :class="kpis.cac ? 'text-ink' : 'text-ink-subtle'">
            {{ kpis.cac ? fmtMoney(kpis.cac, campaign?.currency) : '—' }}
          </div>
        </div>
        <div class="text-center">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Impressões</div>
          <div class="text-lg font-semibold text-ink">{{ fmtInt(kpis.impressions) }}</div>
        </div>
        <div class="text-center">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Cliques</div>
          <div class="text-lg font-semibold text-ink">{{ fmtInt(kpis.clicks) }}</div>
        </div>
        <div class="text-center">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">CTR</div>
          <div class="text-lg font-semibold text-ink">{{ fmtPct(kpis.ctr) }}</div>
        </div>
      </div>

      <!-- Tabs -->
      <nav class="px-5 border-b border-line shrink-0 overflow-x-auto">
        <div class="flex gap-0">
          <button v-for="s in sections" :key="s.key" @click="activeSection = s.key"
            :class="['px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5',
              activeSection === s.key
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink']">
            <i :class="s.icon" class="text-[10px]"></i>
            {{ s.label }}
          </button>
        </div>
      </nav>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        <div v-if="loading" class="text-center py-12 text-ink-subtle">
          <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando campanha...
        </div>

        <!-- ── Visão geral ───────────────────────────────────────────────── -->
        <section v-if="!loading && activeSection === 'overview' && campaign" class="space-y-4">

          <!-- ── HERO EXECUTIVO ─────────────────────────────────────────── -->
          <div class="rounded-xl border border-line bg-gradient-to-br from-surface to-surface-sunken/40 p-4">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <!-- Total gasto -->
              <div>
                <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Gasto total</div>
                <div class="text-2xl font-semibold text-blue-600 dark:text-blue-300 leading-tight">
                  {{ fmtMoney(campaign.spend, campaign.currency) }}
                </div>
                <div v-if="campaign.daily_avg_spend != null" class="text-[10px] text-ink-subtle">
                  ~{{ fmtMoney(campaign.daily_avg_spend, campaign.currency) }}/dia
                </div>
              </div>

              <!-- Dias rodando -->
              <div>
                <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Rodando há</div>
                <div class="text-2xl font-semibold text-ink leading-tight">
                  {{ campaign.days_running ?? '—' }}<span v-if="campaign.days_running" class="text-base text-ink-subtle ml-1">{{ campaign.days_running === 1 ? 'dia' : 'dias' }}</span>
                </div>
                <div class="text-[10px] text-ink-subtle">
                  desde {{ campaign.start_time ? fmtDate(campaign.start_time) : '—' }}
                </div>
              </div>

              <!-- Dias restantes -->
              <div>
                <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Encerra em</div>
                <div class="text-2xl font-semibold leading-tight"
                  :class="campaign.days_remaining === 0 ? 'text-red-500' : campaign.days_remaining != null && campaign.days_remaining <= 3 ? 'text-amber-500' : 'text-ink'">
                  <template v-if="campaign.days_remaining != null">
                    {{ campaign.days_remaining }}<span class="text-base text-ink-subtle ml-1">{{ campaign.days_remaining === 1 ? 'dia' : 'dias' }}</span>
                  </template>
                  <template v-else>
                    <span class="text-emerald-600 dark:text-emerald-300 text-base">em andamento</span>
                  </template>
                </div>
                <div class="text-[10px] text-ink-subtle">
                  <template v-if="campaign.stop_time">até {{ fmtDate(campaign.stop_time) }}</template>
                  <template v-else>sem data de fim</template>
                </div>
              </div>

              <!-- Ritmo -->
              <div>
                <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Ritmo de gasto</div>
                <template v-if="campaign.spend_pace && pacingBadge(campaign.spend_pace)">
                  <div class="mt-1">
                    <span :class="['inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium', pacingBadge(campaign.spend_pace).cls]">
                      <i :class="pacingBadge(campaign.spend_pace).icon"></i>
                      {{ pacingBadge(campaign.spend_pace).label }}
                    </span>
                  </div>
                  <div class="text-[10px] text-ink-subtle mt-1">
                    Diário Meta: {{ fmtMoney(campaign.daily_budget, campaign.currency) }}
                  </div>
                </template>
                <template v-else>
                  <div class="text-base text-ink-subtle italic mt-1">sem budget diário</div>
                  <div v-if="campaign.lifetime_budget" class="text-[10px] text-ink-subtle">
                    Total: {{ fmtMoney(campaign.lifetime_budget, campaign.currency) }}
                  </div>
                </template>
              </div>
            </div>

            <!-- Barra de consumo do budget lifetime -->
            <div v-if="campaign.lifetime_budget && campaign.budget_consumed_pct != null"
              class="mt-4 pt-3 border-t border-line/60">
              <div class="flex justify-between text-[10px] text-ink-subtle mb-1">
                <span>Consumo do orçamento total</span>
                <span class="font-mono">{{ campaign.budget_consumed_pct }}% · {{ fmtMoney(campaign.spend, campaign.currency) }} / {{ fmtMoney(campaign.lifetime_budget, campaign.currency) }}</span>
              </div>
              <div class="w-full h-2 rounded-full bg-surface-sunken overflow-hidden">
                <div :class="['h-full transition-all',
                  campaign.budget_consumed_pct >= 95 ? 'bg-red-500' :
                  campaign.budget_consumed_pct >= 80 ? 'bg-amber-500' : 'bg-blue-500']"
                  :style="{ width: Math.min(100, campaign.budget_consumed_pct) + '%' }"></div>
              </div>
            </div>

            <!-- Projeção (se tem stop_time) -->
            <div v-if="campaign.projected_total_spend != null && campaign.days_total"
              class="mt-3 text-[11px] text-ink-subtle flex items-center gap-1.5">
              <i class="fas fa-chart-line text-accent"></i>
              <span>
                Projeção (no ritmo atual): <b class="text-ink">{{ fmtMoney(campaign.projected_total_spend, campaign.currency) }}</b>
                em {{ campaign.days_total }} dias
              </span>
            </div>
          </div>

          <!-- ── KPIs de performance ──────────────────────────────────── -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 p-3">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Leads (Meta)</div>
              <div class="text-lg font-semibold text-ink">{{ fmtInt(kpis.leadsMeta) }}</div>
            </div>
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 p-3">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">CAC</div>
              <div class="text-lg font-semibold text-ink">{{ kpis.cac != null ? fmtMoney(kpis.cac, campaign.currency) : '—' }}</div>
              <div class="text-[10px] text-ink-subtle">
                <span><i class="fab fa-meta"></i> fonte Meta</span>
              </div>
            </div>
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 p-3">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Impressões / Cliques</div>
              <div class="text-lg font-semibold text-ink">{{ fmtInt(kpis.impressions) }} <span class="text-ink-subtle text-base">/ {{ fmtInt(kpis.clicks) }}</span></div>
              <div class="text-[10px] text-ink-subtle">CTR: {{ kpis.ctr ? fmtPct(kpis.ctr) : '—' }}</div>
            </div>
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 p-3">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">CPM / CPC</div>
              <div class="text-sm font-semibold text-ink">{{ kpis.cpm ? fmtMoney(kpis.cpm, campaign.currency) : '—' }}</div>
              <div class="text-[10px] text-ink-subtle">CPC: {{ kpis.cpc ? fmtMoney(kpis.cpc, campaign.currency) : '—' }}</div>
            </div>
          </div>

          <!-- ── Funil de conversão ────────────────────────────────────── -->
          <div class="rounded-lg border border-line/60 bg-surface-sunken/30 p-3">
            <div class="text-[10px] uppercase tracking-wider text-ink-subtle mb-2">
              <i class="fas fa-funnel-dollar mr-1 text-accent"></i>Funil de conversão
            </div>
            <div class="space-y-1.5">
              <div class="flex items-center gap-2">
                <span class="text-xs text-ink-muted w-24">Impressões</span>
                <div class="flex-1 h-5 rounded bg-surface relative overflow-hidden">
                  <div class="h-full bg-blue-500/30" :style="{ width: '100%' }"></div>
                  <span class="absolute inset-0 flex items-center px-2 text-[11px] font-mono text-ink">{{ fmtInt(kpis.impressions) }}</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-ink-muted w-24">Cliques</span>
                <div class="flex-1 h-5 rounded bg-surface relative overflow-hidden">
                  <div class="h-full bg-sky-500/30"
                    :style="{ width: kpis.impressions > 0 ? Math.max(2, (kpis.clicks / kpis.impressions) * 100) + '%' : '0%' }"></div>
                  <span class="absolute inset-0 flex items-center px-2 text-[11px] font-mono text-ink">
                    {{ fmtInt(kpis.clicks) }}
                    <span v-if="kpis.ctr" class="text-ink-subtle ml-2">({{ fmtPct(kpis.ctr) }})</span>
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-ink-muted w-24">Leads</span>
                <div class="flex-1 h-5 rounded bg-surface relative overflow-hidden">
                  <div class="h-full bg-emerald-500/30"
                    :style="{ width: kpis.impressions > 0 ? Math.max(2, (kpis.leadsMeta / kpis.impressions) * 100) + '%' : '0%' }"></div>
                  <span class="absolute inset-0 flex items-center px-2 text-[11px] font-mono text-ink">
                    {{ fmtInt(kpis.leadsMeta) }}
                    <span v-if="kpis.conversionRate != null" class="text-ink-subtle ml-2">({{ fmtPct(kpis.conversionRate) }} dos cliques)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Metadados ────────────────────────────────────────────── -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Objetivo</div>
              <div class="text-xs font-mono text-ink">{{ campaign.objective || '—' }}</div>
            </div>
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Conta</div>
              <div class="text-xs text-ink truncate">{{ campaign.account_name || '—' }}</div>
            </div>
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Mídia (CV)</div>
              <div class="text-xs font-mono text-ink">{{ campaign.midia_slug || '— sem vínculo' }}</div>
            </div>
          </div>

          <div class="text-[10px] text-ink-subtle">
            Insights de {{ campaign.insights_since }} → {{ campaign.insights_until }}
            · Última sync: {{ fmtRelative(campaign.last_synced_at) }}
          </div>
        </section>

        <!-- ── Vínculo CV ────────────────────────────────────────────────── -->
        <section v-if="!loading && activeSection === 'vinculo'" class="space-y-4">
          <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2.5">
            <div class="text-sm font-medium text-ink mb-0.5">
              <i class="fas fa-link text-accent mr-1.5"></i>Vínculo CV desta campanha
            </div>
            <p class="text-xs text-ink-subtle">
              Quando um lead Meta chega vinculado a esta campanha, o sistema usa esses valores pra rotear pro CV.
              Substitui o mapping por form (que continua funcionando como fallback).
            </p>
          </div>

          <!-- Toggle ativo -->
          <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2.5">
            <label class="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" v-model="vinculo.mapping_active" class="h-4 w-4 rounded border-line accent-emerald-500" />
              <span class="text-sm font-medium text-ink">Roteamento automático ativo</span>
            </label>
            <p class="text-[11px] text-ink-subtle mt-1 ml-6">
              Ativo + mídia preenchida → lead Meta entra direto como <span class="font-mono">routed</span>.
              Sem isso, vira <span class="font-mono">held</span> pra roteamento manual.
            </p>
          </div>

          <!-- Empreendimentos -->
          <div>
            <label class="text-sm font-medium text-ink block mb-1">Empreendimentos vinculados</label>
            <p class="text-xs text-ink-subtle mb-2">
              Geralmente uma campanha tem 1 empreendimento. Vazio = lead vai genérico.
            </p>
            <EnterpriseMultiSelect v-model="vinculo.bound_empreendimentos" />
          </div>

          <!-- Mídia + origem + tags -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="sm:col-span-2">
              <label class="text-sm font-medium text-ink block mb-1">Mídia <span class="text-red-500">*</span></label>
              <input v-model="vinculo.midia_slug" type="text" placeholder="meta-lancamento-wish"
                class="w-full rounded border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder-ink-subtle focus:outline-none focus:border-accent/40 font-mono" />
            </div>
            <div>
              <label class="text-sm font-medium text-ink block mb-1">Origem CV</label>
              <select v-model="vinculo.cv_origem" class="w-full rounded border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent/40">
                <option value="FB">FB (Facebook)</option>
                <option value="IG">IG (Instagram)</option>
              </select>
            </div>
          </div>

          <div>
            <label class="text-sm font-medium text-ink block mb-1">Tags</label>
            <input v-model="vinculo.tags_str" type="text" placeholder="lancamento, vip"
              class="w-full rounded border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder-ink-subtle focus:outline-none focus:border-accent/40" />
          </div>

          <!-- UTMs default -->
          <details class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2.5">
            <summary class="text-xs font-medium text-ink cursor-pointer"><i class="fas fa-tag mr-1.5 text-accent"></i>UTMs default (opcional)</summary>
            <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label class="text-[11px] text-ink-subtle">utm_source</label><input v-model="vinculo.default_utm_source" class="w-full rounded border border-line bg-surface px-2.5 py-1.5 text-xs font-mono text-ink focus:outline-none" /></div>
              <div><label class="text-[11px] text-ink-subtle">utm_medium</label><input v-model="vinculo.default_utm_medium" class="w-full rounded border border-line bg-surface px-2.5 py-1.5 text-xs font-mono text-ink focus:outline-none" /></div>
              <div><label class="text-[11px] text-ink-subtle">utm_campaign</label><input v-model="vinculo.default_utm_campaign" class="w-full rounded border border-line bg-surface px-2.5 py-1.5 text-xs font-mono text-ink focus:outline-none" /></div>
              <div><label class="text-[11px] text-ink-subtle">utm_content</label><input v-model="vinculo.default_utm_content" class="w-full rounded border border-line bg-surface px-2.5 py-1.5 text-xs font-mono text-ink focus:outline-none" /></div>
              <div class="sm:col-span-2"><label class="text-[11px] text-ink-subtle">utm_term</label><input v-model="vinculo.default_utm_term" class="w-full rounded border border-line bg-surface px-2.5 py-1.5 text-xs font-mono text-ink focus:outline-none" /></div>
            </div>
          </details>

          <!-- cv_extra_fields -->
          <details class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2.5">
            <summary class="text-xs font-medium text-ink cursor-pointer"><i class="fas fa-code mr-1.5 text-accent"></i>Campos extras pro CV (JSON)</summary>
            <textarea v-model="vinculo.cv_extra_json" rows="5" placeholder='{ "corretor_id": 42 }'
              class="mt-3 w-full rounded border border-line bg-surface px-3 py-2 text-xs font-mono text-ink placeholder-ink-subtle focus:outline-none focus:border-accent/40 resize-y" />
          </details>

          <!-- Preview -->
          <div class="rounded-lg border px-3 py-2.5"
            :class="willRoute ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'">
            <div class="text-xs font-medium" :class="willRoute ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'">
              <i :class="willRoute ? 'fas fa-bolt' : 'fas fa-hand'" class="mr-1.5"></i>
              <template v-if="willRoute">Próximo lead desta campanha vira <span class="font-mono">routed</span>.</template>
              <template v-else>Próximo lead fica em <span class="font-mono">held</span>.</template>
            </div>
          </div>

          <div v-if="vinculoError" class="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            <i class="fas fa-circle-exclamation mr-1.5"></i>{{ vinculoError }}
          </div>

          <div class="flex justify-end">
            <Button variant="primary" size="sm" icon="fas fa-save" :loading="vinculoSaving" @click="saveVinculo">
              Salvar vínculo
            </Button>
          </div>
        </section>

        <!-- ── Estrutura (Conjuntos → Anúncios — hierárquico estilo Meta) ── -->
        <section v-if="!loading && activeSection === 'structure'" class="space-y-3">
          <!-- Toolbar -->
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="text-[11px] text-ink-subtle">
              <i class="fas fa-sitemap mr-1 text-accent"></i>
              <b>{{ adsets.length }}</b> conjunto(s) ·
              <b>{{ ads.length }}</b> anúncio(s) — hierarquia Meta: Conjunto → Anúncio.
            </div>
            <div class="flex items-center gap-2">
              <select v-model="adsStatusFilter"
                class="rounded border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none"
                title="Filtrar ads por status">
                <option value="ALL">Todos status</option>
                <option value="ACTIVE">Ativos</option>
                <option value="PAUSED">Pausados</option>
                <option value="OTHER">Outros</option>
              </select>
              <select v-model="adsetSortBy"
                class="rounded border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none"
                title="Ordenar conjuntos por">
                <option value="spend">Maior gasto</option>
                <option value="leads">Mais leads</option>
                <option value="name">Nome A→Z</option>
                <option value="recent">Mais recentes</option>
              </select>
              <Button variant="ghost" size="sm" icon="fas fa-expand" @click="expandAllAdsets"
                title="Expandir todos os conjuntos">
                <span class="hidden sm:inline">Expandir</span>
              </Button>
              <Button variant="ghost" size="sm" icon="fas fa-compress" @click="collapseAllAdsets"
                title="Recolher todos os conjuntos">
                <span class="hidden sm:inline">Recolher</span>
              </Button>
              <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate"
                :loading="adsLoading || adsetsLoading" @click="loadStructure"
                title="Recarrega do nosso DB (não chama Meta).">
                Atualizar
              </Button>
              <Button variant="primary" size="sm" icon="fab fa-meta" :loading="adsSyncing" @click="syncAds"
                title="Refaz a busca na Meta (ads + conjuntos) — pode demorar.">
                Sincronizar com Meta
              </Button>
            </div>
          </div>

          <!-- Aviso pós-sync -->
          <div v-if="adsLastSync"
            class="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
            <i class="fas fa-circle-check mr-1"></i>
            Sincronizado: <b>{{ adsLastSync.ads_total }}</b> ads ({{ adsLastSync.ads_new }} novos, {{ adsLastSync.ads_updated }} atualizados)<template v-if="adsLastSync.adsets_total"> · <b>{{ adsLastSync.adsets_total }}</b> conjuntos ({{ adsLastSync.adsets_new }} novos)</template>
          </div>

          <!-- Totais agregados da campanha (refletem o filtro de status) -->
          <div v-if="ads.length" class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Anúncios</div>
              <div class="text-sm font-semibold text-ink">{{ adsTotals.count }}</div>
              <div class="text-[10px] text-ink-subtle">{{ adsTotals.withForm }} com form</div>
            </div>
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Gasto</div>
              <div class="text-sm font-semibold text-blue-600 dark:text-blue-300">{{ fmtMoney(adsTotals.spend, campaign?.currency) }}</div>
            </div>
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Leads (Meta)</div>
              <div class="text-sm font-semibold text-emerald-600 dark:text-emerald-300">{{ fmtInt(adsTotals.leads) }}</div>
            </div>
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Impr. / Cliques</div>
              <div class="text-sm font-semibold text-ink">{{ fmtInt(adsTotals.impressions) }} / {{ fmtInt(adsTotals.clicks) }}</div>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="adsLoading || adsetsLoading" class="text-center py-8 text-ink-subtle text-sm">
            <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando estrutura...
          </div>

          <!-- Empty state -->
          <div v-else-if="!ads.length && !adsets.length" class="text-center py-8 text-ink-subtle text-sm rounded-lg border border-dashed border-line">
            <i class="fas fa-sitemap text-2xl mb-2 block"></i>
            Sem conjuntos/anúncios sincronizados.<br>
            Clique em <b>Sincronizar com Meta</b> pra puxar a hierarquia.
          </div>

          <!-- Hierarquia: Conjuntos → Ads -->
          <div v-else class="space-y-2">
            <div v-for="group in adsetsWithAds" :key="group.adset.id"
              class="rounded-xl border border-line bg-surface overflow-hidden">

              <!-- Header do conjunto (clickable → expandir) -->
              <button @click="toggleAdsetExpanded(group.adset.id)"
                class="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-surface-hover/40 transition-colors">
                <!-- Chevron -->
                <i :class="['fas fa-chevron-right text-[10px] text-ink-subtle mt-1.5 transition-transform shrink-0',
                  expandedAdsets.has(group.adset.id) ? 'rotate-90' : '']"></i>

                <!-- Identificação -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <i class="fas fa-folder-tree text-[11px] text-accent"></i>
                    <span class="text-sm font-medium text-ink truncate">{{ group.adset.name || '(sem nome)' }}</span>
                    <span v-if="group.adset.id !== '__orphans__' && (group.adset.effective_status || group.adset.status)"
                      :class="['inline-flex rounded-md border px-1.5 py-0.5 text-[9px] font-medium',
                        adStatusBadge(group.adset.effective_status || group.adset.status).cls]">
                      {{ adStatusBadge(group.adset.effective_status || group.adset.status).label }}
                    </span>
                    <span class="inline-flex rounded bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20 px-1.5 py-0.5 text-[9px] font-medium">
                      <i class="fas fa-rectangle-ad text-[8px] mr-1"></i>{{ group.adsCount }} {{ group.adsCount === 1 ? 'ad' : 'ads' }}
                    </span>
                  </div>
                  <div class="text-[10px] font-mono text-ink-subtle truncate mt-0.5">
                    <template v-if="group.adset.id !== '__orphans__'">#{{ group.adset.id }}</template>
                    <span v-if="group.adset.optimization_goal"> · {{ group.adset.optimization_goal }}</span>
                    <span v-if="fmtBudget(group.adset)"> · <i class="fas fa-coins text-[8px]"></i> {{ fmtBudget(group.adset) }}</span>
                    <span v-if="group.adset.start_time"> · {{ fmtDate(group.adset.start_time) }} <template v-if="group.adset.end_time">→ {{ fmtDate(group.adset.end_time) }}</template></span>
                  </div>
                </div>

                <!-- Métricas inline do conjunto -->
                <div class="hidden sm:flex items-center gap-3 shrink-0 text-right">
                  <div>
                    <div class="text-[9px] uppercase tracking-wider text-ink-subtle">Gasto</div>
                    <div class="text-xs font-semibold text-blue-600 dark:text-blue-300">{{ fmtMoney(group.totals.spend, campaign?.currency) }}</div>
                  </div>
                  <div>
                    <div class="text-[9px] uppercase tracking-wider text-ink-subtle">Leads</div>
                    <div class="text-xs font-semibold text-emerald-600 dark:text-emerald-300">{{ fmtInt(group.totals.leads) }}</div>
                  </div>
                  <div>
                    <div class="text-[9px] uppercase tracking-wider text-ink-subtle">Impr.</div>
                    <div class="text-xs font-semibold text-ink">{{ fmtInt(group.totals.impressions) }}</div>
                  </div>
                  <div>
                    <div class="text-[9px] uppercase tracking-wider text-ink-subtle">Cliques</div>
                    <div class="text-xs font-semibold text-ink">{{ fmtInt(group.totals.clicks) }}</div>
                  </div>
                </div>
              </button>

              <!-- Ads dentro do conjunto (expandido) -->
              <div v-if="expandedAdsets.has(group.adset.id)"
                class="border-t border-line/60 bg-surface-sunken/20 p-3">

                <!-- Sem ads filtrados nesse conjunto -->
                <div v-if="!group.ads.length" class="text-center py-6 text-[11px] text-ink-subtle italic">
                  Nenhum anúncio neste conjunto bate com o filtro atual.
                </div>

                <!-- Grid de ads -->
                <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div v-for="ad in group.ads" :key="ad.id"
                    class="rounded-lg border border-line bg-surface overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">

                    <!-- Thumbnail + status (clickable → abre lightbox) -->
                    <button @click="openLightbox(ad)"
                      class="relative aspect-square bg-black flex items-center justify-center overflow-hidden group cursor-pointer"
                      :title="isVideoAd(ad) ? 'Reproduzir vídeo' : 'Ampliar imagem'">
                      <img v-if="ad.creative_image_url || ad.creative_thumbnail"
                        :src="ad.creative_image_url || ad.creative_thumbnail"
                        class="w-full h-full object-contain transition-transform group-hover:scale-[1.02]"
                        :alt="ad.name" loading="lazy"
                        @error="$event.target.src = ad.creative_thumbnail || ''" />
                      <div v-else class="text-white/40 text-5xl">
                        <i :class="isVideoAd(ad) ? 'fas fa-video' : 'fas fa-image'"></i>
                      </div>

                      <!-- Play overlay pra vídeos -->
                      <div v-if="isVideoAd(ad)"
                        class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                        <div class="w-14 h-14 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-2xl transition-all group-hover:scale-110">
                          <i class="fas fa-play text-xl text-black ml-1"></i>
                        </div>
                      </div>

                      <!-- Status (top-right) -->
                      <span :class="['absolute top-2 right-2 inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm', adStatusBadge(ad.effective_status || ad.status).cls]">
                        {{ adStatusBadge(ad.effective_status || ad.status).label }}
                      </span>

                      <!-- Lead Ad badge (top-left) -->
                      <span v-if="ad.lead_form_id"
                        class="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-violet-500/40 text-white border border-violet-300/50 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium"
                        title="Lead Ad — form vinculado">
                        <i class="fas fa-file-lines text-[9px]"></i>Lead Ad
                      </span>

                      <!-- Tipo (bottom-left) -->
                      <span v-if="ad.creative_object_type || isVideoAd(ad)"
                        class="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-black/60 text-white/90 backdrop-blur-sm px-1.5 py-0.5 text-[9px] font-mono">
                        <i :class="isVideoAd(ad) ? 'fas fa-video' : 'fas fa-image'" class="text-[8px]"></i>
                        {{ ad.creative_object_type || (isVideoAd(ad) ? 'VIDEO' : 'PHOTO') }}
                      </span>
                    </button>

                    <!-- Conteúdo -->
                    <div class="p-3 flex-1 flex flex-col">
                      <div class="text-sm font-medium text-ink leading-tight truncate" :title="ad.name">{{ ad.name || '(sem nome)' }}</div>
                      <div class="text-[10px] font-mono text-ink-subtle truncate">
                        #{{ ad.id }}
                      </div>

                      <div v-if="ad.creative_title" class="mt-2 text-[11px] text-ink font-medium truncate" :title="ad.creative_title">
                        "{{ ad.creative_title }}"
                      </div>
                      <div v-if="ad.creative_body" class="text-[11px] text-ink-muted line-clamp-2 mt-0.5">{{ ad.creative_body }}</div>

                      <!-- Métricas -->
                      <div class="grid grid-cols-4 gap-1.5 mt-3 pt-2 border-t border-line/60">
                        <div>
                          <div class="text-[9px] uppercase tracking-wider text-ink-subtle">Gasto</div>
                          <div class="text-xs font-semibold text-blue-600 dark:text-blue-300">{{ fmtMoney(ad.spend, campaign?.currency) }}</div>
                        </div>
                        <div>
                          <div class="text-[9px] uppercase tracking-wider text-ink-subtle">Leads</div>
                          <div class="text-xs font-semibold text-emerald-600 dark:text-emerald-300">{{ fmtInt(ad.meta_leads_total) }}</div>
                        </div>
                        <div>
                          <div class="text-[9px] uppercase tracking-wider text-ink-subtle">CTR</div>
                          <div class="text-xs font-semibold text-ink">{{ fmtPct(ad.ctr) }}</div>
                        </div>
                        <div>
                          <div class="text-[9px] uppercase tracking-wider text-ink-subtle">CPC</div>
                          <div class="text-xs font-semibold text-ink">{{ fmtMoney(ad.cpc, campaign?.currency) }}</div>
                        </div>
                      </div>

                      <!-- Link / form -->
                      <div class="mt-2 flex flex-wrap items-center gap-1.5">
                        <a v-if="ad.creative_link_url" :href="ad.creative_link_url" target="_blank" rel="noopener"
                          class="inline-flex items-center gap-1 text-[10px] text-accent hover:underline truncate max-w-full"
                          :title="ad.creative_link_url">
                          <i class="fas fa-arrow-up-right-from-square"></i>
                          {{ ad.creative_link_url }}
                        </a>
                        <button v-if="ad.lead_form_id"
                          @click.stop="openFormDetail(ad)"
                          :title="ad.lead_form?.name ? `Ver perguntas do form '${ad.lead_form.name}'` : `Form #${ad.lead_form_id} (não sincronizado)`"
                          class="inline-flex items-center gap-1 rounded border border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 text-[10px] font-medium hover:bg-violet-500/20 transition-colors max-w-full">
                          <i class="fas fa-file-lines text-[9px] shrink-0"></i>
                          <span class="truncate">
                            <template v-if="ad.lead_form">{{ ad.lead_form.name || `Form #${ad.lead_form_id}` }}</template>
                            <template v-else>Form #{{ ad.lead_form_id }} <span class="opacity-60">(não sync)</span></template>
                          </span>
                          <span v-if="ad.lead_form?.questions?.length" class="text-[9px] opacity-70 shrink-0">· {{ ad.lead_form.questions.length }}q</span>
                        </button>
                      </div>

                      <!-- Última sync -->
                      <div class="mt-1.5 pt-1.5 border-t border-line/40 text-[9px] text-ink-subtle">
                        <i class="fas fa-clock"></i> sync {{ ad.last_synced_at ? fmtRelative(ad.last_synced_at) : '—' }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Leads ─────────────────────────────────────────────────────── -->
        <section v-if="!loading && activeSection === 'leads'" class="space-y-2">
          <div class="text-[11px] text-ink-subtle">
            Leads da campanha <template v-if="since && until">no período ({{ scopeLabel }})</template><template v-else>(mais recentes)</template>.
          </div>
          <div v-if="!leads.length" class="text-center py-8 text-ink-subtle text-sm">
            <i class="fas fa-inbox text-2xl mb-2 block"></i>
            <template v-if="since && until">Nenhum lead nesse período.</template>
            <template v-else>Nenhum lead chegou por essa campanha ainda.</template>
          </div>
          <div v-else class="rounded-lg border border-line overflow-hidden">
            <table class="min-w-full text-sm">
              <thead class="bg-surface-sunken/30 border-b border-line">
                <tr>
                  <th class="px-3 py-2 text-left  text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Quando</th>
                  <th class="px-3 py-2 text-left  text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Contato</th>
                  <th class="px-3 py-2 text-left  text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Mídia</th>
                  <th class="px-3 py-2 text-left  text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Form</th>
                  <th class="px-3 py-2 text-center text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line/60">
                <tr v-for="l in leads" :key="l.id" class="hover:bg-surface-hover/40">
                  <td class="px-3 py-2 text-[11px] text-ink-subtle whitespace-nowrap">{{ fmtRelative(l.created_at) }}</td>
                  <td class="px-3 py-2">
                    <div class="text-ink text-xs">{{ l.nome || '—' }}</div>
                    <div class="text-[10px] text-ink-subtle">{{ l.email || l.telefone || '' }}</div>
                  </td>
                  <td class="px-3 py-2 text-[11px] font-mono text-ink-muted">{{ l.midia_slug || '—' }}</td>
                  <td class="px-3 py-2 text-[10px] font-mono text-ink-subtle">{{ l.meta_form_id || '—' }}</td>
                  <td class="px-3 py-2 text-center">
                    <span :class="['text-[11px] font-medium', statusColor(l.status)]">{{ l.status }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ── Dia-a-dia ─────────────────────────────────────────────────── -->
        <section v-if="!loading && activeSection === 'daily'" class="space-y-3">
          <div class="text-[11px] text-ink-subtle">Período: {{ scopeLabel }} - gasto da Meta (azul) e leads da Meta (verde).</div>

          <!-- Totais agregados -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Gasto 30d</div>
              <div class="text-sm font-semibold text-blue-600 dark:text-blue-300">{{ fmtMoney(dailyTotals.spend, campaign?.currency) }}</div>
            </div>
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Leads Meta 30d</div>
              <div class="text-sm font-semibold text-emerald-600 dark:text-emerald-300">{{ fmtInt(dailyTotals.metaLeads) }}</div>
            </div>
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Impr. / Cliques</div>
              <div class="text-sm font-semibold text-ink">{{ fmtInt(dailyTotals.impressions) }} / {{ fmtInt(dailyTotals.clicks) }}</div>
            </div>
          </div>

          <!-- Gráfico ECharts dual-axis: bars (spend) + line (leads) -->
          <CampaignDailyChart :daily="daily" :currency="campaign?.currency || 'BRL'" />

          <!-- Tabela detalhada por dia -->
          <details v-if="daily.length" class="rounded-lg border border-line/60 bg-surface-sunken/30">
            <summary class="px-3 py-2 cursor-pointer text-xs text-ink-subtle hover:text-ink">
              <i class="fas fa-table mr-1"></i>Ver tabela detalhada por dia ({{ daily.length }} dias)
            </summary>
            <div class="overflow-x-auto border-t border-line/60">
              <table class="min-w-full text-xs">
                <thead class="bg-surface-sunken/40">
                  <tr>
                    <th class="px-2 py-1.5 text-left  font-mono uppercase text-[10px] text-ink-subtle">Dia</th>
                    <th class="px-2 py-1.5 text-right font-mono uppercase text-[10px] text-ink-subtle">Gasto</th>
                    <th class="px-2 py-1.5 text-right font-mono uppercase text-[10px] text-ink-subtle">Impr.</th>
                    <th class="px-2 py-1.5 text-right font-mono uppercase text-[10px] text-ink-subtle">Cliques</th>
                    <th class="px-2 py-1.5 text-right font-mono uppercase text-[10px] text-ink-subtle">Meta L.</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-line/40">
                  <tr v-for="(d, i) in [...daily].reverse()" :key="i">
                    <td class="px-2 py-1 text-ink-muted">{{ d.day }}</td>
                    <td class="px-2 py-1 text-right text-blue-600 dark:text-blue-300 font-mono">{{ fmtMoney(d.spend, campaign?.currency) }}</td>
                    <td class="px-2 py-1 text-right text-ink-muted">{{ fmtInt(d.impressions) }}</td>
                    <td class="px-2 py-1 text-right text-ink-muted">{{ fmtInt(d.clicks) }}</td>
                    <td class="px-2 py-1 text-right text-emerald-600 dark:text-emerald-300">{{ fmtInt(d.meta_leads) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </section>

        <!-- ── Gestão interna ────────────────────────────────────────────── -->
        <section v-if="!loading && activeSection === 'gestao' && campaign" class="space-y-4">
          <div>
            <label class="text-sm font-medium text-ink block mb-1">Notas internas</label>
            <textarea v-model="notes" rows="4"
              placeholder="Observações sobre essa campanha — não vão pro Meta nem pro CV."
              class="w-full rounded border border-line bg-surface px-3 py-2 text-sm text-ink placeholder-ink-subtle focus:outline-none focus:border-accent/40 resize-y" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-sm font-medium text-ink block mb-1">Prioridade</label>
              <select v-model="priority" class="w-full rounded border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent/40">
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
              </select>
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" v-model="archived" class="h-4 w-4 rounded border-line accent-slate-500" />
                <span class="text-sm text-ink font-medium">Arquivar (oculta da listagem)</span>
              </label>
            </div>
          </div>
          <div class="flex justify-end">
            <Button variant="primary" size="sm" icon="fas fa-save" :loading="store.saving" @click="saveInternal">Salvar</Button>
          </div>
        </section>
      </div>

      <!-- Footer -->
      <footer class="px-5 py-3 border-t border-line flex items-center justify-between bg-surface-sunken/30 shrink-0">
        <div class="text-[10px] text-ink-subtle">
          Última sync: {{ campaign?.last_synced_at ? new Date(campaign.last_synced_at).toLocaleString('pt-BR') : '—' }}
        </div>
        <Button variant="secondary" size="sm" @click="close">Fechar</Button>
      </footer>
    </div>

    <!-- Sub-modal: detalhes do Lead Form -->
    <div v-if="formDetailOpen && formDetailData" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" @click.self="closeFormDetail">
      <div class="bg-surface text-ink w-full max-w-2xl rounded-xl shadow-xl border border-line max-h-[85vh] flex flex-col">
        <header class="flex items-start gap-3 px-5 pt-5 pb-3 border-b border-line shrink-0">
          <div class="shrink-0 w-10 h-10 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300 flex items-center justify-center">
            <i class="fas fa-file-lines text-lg"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-semibold text-ink leading-tight truncate">{{ formDetailData.name || '(sem nome)' }}</h3>
            <p class="text-xs text-ink-subtle mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
              <span class="font-mono">#{{ formDetailData.id }}</span>
              <span v-if="formDetailData.page_name">· {{ formDetailData.page_name }}</span>
              <span v-if="formDetailData.status">· {{ formDetailData.status }}</span>
              <span v-if="formDetailData.created_time">· Criado {{ new Date(formDetailData.created_time).toLocaleDateString('pt-BR') }}</span>
            </p>
          </div>
          <button @click="closeFormDetail" class="shrink-0 text-ink-subtle hover:text-ink p-1">
            <i class="fas fa-times"></i>
          </button>
        </header>

        <div class="flex-1 overflow-y-auto p-5 space-y-4">
          <!-- Status do mapping local -->
          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Mídia (Office)</div>
              <div class="text-sm font-mono text-ink">{{ formDetailData.midia_slug || '—' }}</div>
            </div>
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Roteamento</div>
              <div class="text-sm font-medium">
                <span v-if="formDetailData.mapping_active && formDetailData.midia_slug" class="text-emerald-600 dark:text-emerald-300">
                  <i class="fas fa-bolt text-xs"></i> Auto
                </span>
                <span v-else class="text-amber-600 dark:text-amber-300">
                  <i class="fas fa-hand text-xs"></i> Manual (held)
                </span>
              </div>
            </div>
          </div>

          <!-- Perguntas -->
          <div>
            <div class="text-[10px] uppercase tracking-wider text-ink-subtle mb-2">
              <i class="fas fa-list-check mr-1"></i>Perguntas do formulário
              <span v-if="formDetailData.questions?.length" class="text-ink">({{ formDetailData.questions.length }})</span>
            </div>
            <div v-if="!Array.isArray(formDetailData.questions) || !formDetailData.questions.length"
              class="text-center py-6 text-ink-subtle text-sm rounded-lg border border-dashed border-line">
              <i class="fas fa-circle-info text-xl mb-1 block"></i>
              Sincronize os Forms Meta na Central Meta → <span class="font-mono">Captação → Sincronizar Meta</span> pra puxar as perguntas.
            </div>
            <ol v-else class="space-y-1.5 text-sm">
              <li v-for="(q, i) in formDetailData.questions" :key="i"
                class="flex items-start gap-2 rounded border border-line/60 bg-surface px-2.5 py-1.5">
                <span class="text-[10px] font-mono text-ink-subtle pt-0.5">{{ String(i + 1).padStart(2, '0') }}</span>
                <div class="flex-1 min-w-0">
                  <div class="text-ink font-medium leading-tight">{{ q.label || q.key }}</div>
                  <div class="text-[10px] text-ink-subtle font-mono mt-0.5">
                    <span v-if="q.type">{{ q.type }}</span>
                    <span v-if="q.key && q.key !== q.label"> · key: {{ q.key }}</span>
                  </div>
                </div>
              </li>
            </ol>
          </div>

          <!-- Botões: editar mapeamento de campos -->
          <div class="pt-3 border-t border-line/60 flex items-center justify-between gap-2">
            <div class="text-[11px] text-ink-subtle">
              <i class="fas fa-circle-info mr-1"></i>
              Vínculo CV (empreendimento, mídia) vive na <b>campanha</b>. Aqui você só configura o mapeamento <b>pergunta → campo CV</b>.
            </div>
            <Button variant="primary" size="sm" icon="fas fa-list-check" @click="openFormEditor">
              Editar mapeamento
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Editor completo (Estrutura & Mapeamento + Comparativo + Leads).
         Independente do sub-modal de preview — quando abre, o preview fecha. -->
    <MetaFormMappingModal
      v-if="formDetailData"
      v-model:open="formEditorOpen"
      :form="formDetailData"
      @saved="onFormEditorSaved" />

    <!-- Lightbox de criativo (imagem ou vídeo do ad) -->
    <CreativeLightbox
      v-if="lightboxData"
      v-model:open="lightboxOpen"
      :image-url="lightboxData.imageUrl"
      :video-url="lightboxData.videoUrl"
      :video-id="lightboxData.videoId"
      :video-permalink="lightboxData.videoPermalink"
      :title="lightboxData.title"
      :subtitle="lightboxData.subtitle" />
  </div>
</template>
