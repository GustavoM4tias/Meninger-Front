<script setup>
// Detalhe de uma campanha Meta: KPIs, gráfico de leads/dia, lista de leads,
// configuração interna (notes, priority, archived).

import { ref, computed, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useCampaignsStore } from '@/stores/Marketing/Campaigns/campaignsStore';
import Button from '@/components/UI/Button.vue';
import EnterpriseMultiSelect from '@/components/Marketing/EnterpriseMultiSelect.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    campaignId: { type: String, default: null },
});
const emit = defineEmits(['update:open', 'saved']);

const store = useCampaignsStore();

const campaign = ref(null);
const leads = ref([]);
const daily = ref([]);
const ads = ref([]);
const adsLoading = ref(false);
const adsSyncing = ref(false);
const adsLastSync = ref(null);
const adsStatusFilter = ref('ALL');     // ALL | ACTIVE | PAUSED | OTHER
const formDetailOpen = ref(false);
const formDetailData = ref(null);       // { id, name, page_name, status, questions }
const loading = ref(false);
const activeSection = ref('overview');

// Editáveis pelo admin
const notes = ref('');
const priority = ref('normal');
const archived = ref(false);

function close() { emit('update:open', false); }

watch([() => props.open, () => props.campaignId], async ([isOpen, id], [prevOpen, prevId]) => {
    // Reset SEMPRE que muda de campanha (ou fecha modal) — evita ver dados
    // da campanha anterior enquanto carrega.
    campaign.value = null;
    leads.value = [];
    daily.value = [];
    ads.value = [];
    adsLastSync.value = null;
    formDetailOpen.value = false;
    formDetailData.value = null;

    if (!isOpen || !id) return;
    loading.value = true;
    activeSection.value = 'overview';
    try {
        const [c, l, d] = await Promise.all([
            store.fetchDetail(id),
            store.fetchLeads(id, { limit: 100 }),
            store.fetchDaily(id, { days: 30 }),
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
    const leadsOffice = c.lead_stats?.total || 0;
    const leadsMeta = Number(c.meta_leads_total) || 0;
    const leadsTotal = leadsOffice > 0 ? leadsOffice : leadsMeta;     // pra cálculos
    const spend = Number(c.spend) || 0;
    const cac = leadsTotal > 0 ? spend / leadsTotal : null;
    const conversionRate = c.clicks > 0 ? (leadsTotal / c.clicks) * 100 : null;
    return {
        spend,
        leadsTotal,
        leadsMeta,
        leadsOffice,
        cac,
        cacSource: c.cac_source,
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
const dailyMaxLeads = computed(() => Math.max(1, ...daily.value.map(d => {
    const meta = Number(d.meta_leads) || 0;
    const office = Number(d.office_leads) || 0;
    return Math.max(meta, office);
})));
const dailyTotals = computed(() => {
    const acc = { spend: 0, metaLeads: 0, officeLeads: 0, clicks: 0, impressions: 0 };
    for (const d of daily.value) {
        acc.spend       += Number(d.spend)       || 0;
        acc.metaLeads   += Number(d.meta_leads)  || 0;
        acc.officeLeads += Number(d.office_leads)|| 0;
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
    { key: 'overview', label: 'Visão geral',  icon: 'fas fa-chart-pie' },
    { key: 'vinculo',  label: 'Vínculo CV',   icon: 'fas fa-link' },
    { key: 'ads',      label: 'Anúncios',     icon: 'fas fa-rectangle-ad' },
    { key: 'leads',    label: 'Leads',        icon: 'fas fa-users' },
    { key: 'daily',    label: 'Dia-a-dia',    icon: 'fas fa-chart-column' },
    { key: 'gestao',   label: 'Gestão',       icon: 'fas fa-clipboard-list' },
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

async function syncAds() {
    const targetId = campaign.value?.id;
    if (!targetId) return;
    adsSyncing.value = true;
    adsLastSync.value = null;
    try {
        const r = await store.syncAds(targetId, { sinceDays: 90 });
        // Só aplica se ainda estamos na mesma campanha
        if (campaign.value?.id === targetId) {
            if (r) adsLastSync.value = r;
            await loadAds();
        }
    } finally {
        adsSyncing.value = false;
    }
}

// Carrega ads quando entra na aba pela 1ª vez OU quando a campanha muda
// estando na aba ads. O ads.value já foi resetado pelo watch principal — aqui
// só dispara o fetch quando precisa.
watch([activeSection, campaign], async ([s, c]) => {
    if (s === 'ads' && c?.id && !ads.value.length && !adsLoading.value) {
        await loadAds();
    }
});

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

function openFormDetail(ad) {
    if (!ad?.lead_form) return;
    formDetailData.value = ad.lead_form;
    formDetailOpen.value = true;
}
function closeFormDetail() {
    formDetailOpen.value = false;
    formDetailData.value = null;
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
          <div class="text-[9px] text-ink-subtle">Office: {{ fmtInt(kpis.leadsOffice) }}</div>
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
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 p-3">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle mb-1">Período</div>
              <div class="text-sm text-ink">
                {{ fmtDate(campaign.start_time) }}
                <i class="fas fa-arrow-right text-ink-subtle text-[10px] mx-1"></i>
                <span v-if="campaign.stop_time">{{ fmtDate(campaign.stop_time) }}</span>
                <span v-else-if="String(campaign.effective_status || campaign.status || '').toUpperCase().includes('ACTIVE')" class="text-emerald-600 dark:text-emerald-300">em andamento</span>
                <span v-else class="text-ink-subtle italic">—</span>
              </div>
            </div>
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 p-3">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle mb-1">Orçamento</div>
              <div class="text-sm text-ink">
                <template v-if="campaign.daily_budget_cents">{{ fmtMoney(campaign.daily_budget_cents / 100, campaign.currency) }} / dia</template>
                <template v-else-if="campaign.lifetime_budget_cents">{{ fmtMoney(campaign.lifetime_budget_cents / 100, campaign.currency) }} total</template>
                <span v-else class="text-ink-subtle italic">—</span>
              </div>
              <div v-if="campaign.budget_remaining_cents != null" class="text-[10px] text-ink-subtle mt-0.5">
                Restante: {{ fmtMoney(campaign.budget_remaining_cents / 100, campaign.currency) }}
              </div>
            </div>
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 p-3">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle mb-1">Alcance</div>
              <div class="text-sm text-ink">{{ fmtInt(kpis.reach) }} pessoas</div>
              <div class="text-[10px] text-ink-subtle mt-0.5">CPM: {{ kpis.cpm ? fmtMoney(kpis.cpm, campaign.currency) : '—' }} · CPC: {{ kpis.cpc ? fmtMoney(kpis.cpc, campaign.currency) : '—' }}</div>
            </div>
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 p-3">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle mb-1">Conversão</div>
              <div class="text-sm text-ink">
                <span v-if="kpis.conversionRate !== null">{{ fmtPct(kpis.conversionRate) }} dos cliques</span>
                <span v-else class="text-ink-subtle italic">—</span>
              </div>
              <div class="text-[10px] text-ink-subtle mt-0.5">{{ campaign.lead_stats?.delivered || 0 }} entregues ao CV · {{ campaign.lead_stats?.held || 0 }} em held</div>
            </div>
          </div>

          <div class="text-[11px] text-ink-subtle">
            Janela do último sync: {{ campaign.insights_since }} → {{ campaign.insights_until }}
            · Última atualização: {{ fmtRelative(campaign.last_synced_at) }}
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

        <!-- ── Anúncios ──────────────────────────────────────────────────── -->
        <section v-if="!loading && activeSection === 'ads'" class="space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="text-[11px] text-ink-subtle">
              Anúncios <b>desta campanha</b> ({{ ads.length }} total) — criativo, form vinculado e desempenho individual.
            </div>
            <div class="flex items-center gap-2">
              <select v-model="adsStatusFilter"
                class="rounded border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none">
                <option value="ALL">Todos status</option>
                <option value="ACTIVE">Ativos</option>
                <option value="PAUSED">Pausados</option>
                <option value="OTHER">Outros</option>
              </select>
              <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate" :loading="adsLoading" @click="loadAds"
                title="Recarrega do nosso DB (não chama Meta).">
                Atualizar
              </Button>
              <Button variant="primary" size="sm" icon="fab fa-meta" :loading="adsSyncing" @click="syncAds"
                title="Refaz a busca na Meta — pode demorar.">
                Sincronizar com Meta
              </Button>
            </div>
          </div>

          <!-- Aviso pós-sync -->
          <div v-if="adsLastSync"
            class="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
            <i class="fas fa-circle-check mr-1"></i>
            Sincronizado: <b>{{ adsLastSync.ads_total }}</b> ads ({{ adsLastSync.ads_new }} novos, {{ adsLastSync.ads_updated }} atualizados)
          </div>

          <!-- Totais -->
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
          <div v-if="adsLoading" class="text-center py-8 text-ink-subtle text-sm">
            <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando anúncios...
          </div>

          <!-- Empty state -->
          <div v-else-if="!ads.length" class="text-center py-8 text-ink-subtle text-sm rounded-lg border border-dashed border-line">
            <i class="fas fa-rectangle-ad text-2xl mb-2 block"></i>
            Sem anúncios sincronizados.<br>
            Clique em <b>Sincronizar ads</b> pra puxar da Meta.
          </div>

          <!-- Cards de ads -->
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div v-for="ad in filteredAds" :key="ad.id"
              class="rounded-lg border border-line bg-surface overflow-hidden flex flex-col">

              <!-- Thumbnail + status -->
              <div class="relative aspect-[16/9] bg-surface-sunken flex items-center justify-center overflow-hidden">
                <img v-if="ad.creative_thumbnail || ad.creative_image_url"
                  :src="ad.creative_thumbnail || ad.creative_image_url"
                  class="w-full h-full object-cover" :alt="ad.name" loading="lazy" />
                <div v-else class="text-ink-subtle text-3xl">
                  <i :class="ad.creative_video_id ? 'fas fa-video' : 'fas fa-image'"></i>
                </div>
                <span :class="['absolute top-2 right-2 inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium', adStatusBadge(ad.effective_status || ad.status).cls]">
                  {{ adStatusBadge(ad.effective_status || ad.status).label }}
                </span>
                <span v-if="ad.lead_form_id"
                  class="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-violet-500/20 text-white border border-violet-300/50 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-medium"
                  title="Lead Ad — form vinculado">
                  <i class="fas fa-file-lines text-[9px]"></i>Lead Ad
                </span>
              </div>

              <!-- Conteúdo -->
              <div class="p-3 flex-1 flex flex-col">
                <div class="text-sm font-medium text-ink leading-tight truncate" :title="ad.name">{{ ad.name || '(sem nome)' }}</div>
                <div class="text-[10px] font-mono text-ink-subtle truncate">
                  #{{ ad.id }}<span v-if="ad.adset_name"> · {{ ad.adset_name }}</span>
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
                    @click="openFormDetail(ad)"
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
        </section>

        <!-- ── Leads ─────────────────────────────────────────────────────── -->
        <section v-if="!loading && activeSection === 'leads'" class="space-y-2">
          <div v-if="!leads.length" class="text-center py-8 text-ink-subtle text-sm">
            <i class="fas fa-inbox text-2xl mb-2 block"></i>
            Nenhum lead chegou por essa campanha ainda.
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
          <div class="text-[11px] text-ink-subtle">Últimos 30 dias — gasto da Meta (azul) e leads (verde Meta / âmbar Office).</div>

          <!-- Totais agregados -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Gasto 30d</div>
              <div class="text-sm font-semibold text-blue-600 dark:text-blue-300">{{ fmtMoney(dailyTotals.spend, campaign?.currency) }}</div>
            </div>
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Leads Meta 30d</div>
              <div class="text-sm font-semibold text-emerald-600 dark:text-emerald-300">{{ fmtInt(dailyTotals.metaLeads) }}</div>
            </div>
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Leads Office 30d</div>
              <div class="text-sm font-semibold text-amber-600 dark:text-amber-300">{{ fmtInt(dailyTotals.officeLeads) }}</div>
            </div>
            <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Impr. / Cliques</div>
              <div class="text-sm font-semibold text-ink">{{ fmtInt(dailyTotals.impressions) }} / {{ fmtInt(dailyTotals.clicks) }}</div>
            </div>
          </div>

          <div v-if="!daily.length" class="text-center py-8 text-ink-subtle text-sm">
            <i class="fas fa-chart-column text-2xl mb-2 block"></i>
            Sem dados no período.
          </div>

          <!-- Gráfico de barras (spend + leads) -->
          <div v-else class="rounded-lg border border-line p-4 bg-surface-sunken/30">
            <!-- Spend bars -->
            <div class="text-[10px] uppercase tracking-wider text-ink-subtle mb-1">Gasto/dia</div>
            <div class="flex items-end gap-0.5 h-24 mb-3">
              <div v-for="(d, i) in daily" :key="`s-${i}`" class="flex-1 flex flex-col items-center justify-end group">
                <div class="text-[9px] text-blue-700 dark:text-blue-300 opacity-0 group-hover:opacity-100 mb-0.5 whitespace-nowrap">{{ fmtMoney(d.spend, campaign?.currency) }}</div>
                <div class="w-full bg-blue-500/40 rounded-t group-hover:bg-blue-500/70 transition-colors"
                  :style="{ height: `${(Number(d.spend) || 0) / dailyMaxSpend * 100}%`, minHeight: (Number(d.spend) || 0) > 0 ? '2px' : '0' }"
                  :title="`${d.day}: ${fmtMoney(d.spend, campaign?.currency)} | ${d.meta_leads || 0} leads Meta`"></div>
              </div>
            </div>

            <!-- Leads bars (dual: Meta + Office sobrepostas) -->
            <div class="text-[10px] uppercase tracking-wider text-ink-subtle mb-1">Leads/dia <span class="text-emerald-600 dark:text-emerald-300">●</span> Meta · <span class="text-amber-600 dark:text-amber-300">●</span> Office</div>
            <div class="flex items-end gap-0.5 h-24 mb-2">
              <div v-for="(d, i) in daily" :key="`l-${i}`" class="flex-1 flex items-end gap-px group">
                <div class="flex-1 bg-emerald-500/40 rounded-t group-hover:bg-emerald-500/70 transition-colors"
                  :style="{ height: `${(Number(d.meta_leads) || 0) / dailyMaxLeads * 100}%`, minHeight: (Number(d.meta_leads) || 0) > 0 ? '2px' : '0' }"
                  :title="`${d.day}: Meta ${d.meta_leads || 0}`"></div>
                <div class="flex-1 bg-amber-500/40 rounded-t group-hover:bg-amber-500/70 transition-colors"
                  :style="{ height: `${(Number(d.office_leads) || 0) / dailyMaxLeads * 100}%`, minHeight: (Number(d.office_leads) || 0) > 0 ? '2px' : '0' }"
                  :title="`${d.day}: Office ${d.office_leads || 0}`"></div>
              </div>
            </div>

            <div class="flex justify-between text-[9px] text-ink-subtle">
              <span v-if="daily.length">{{ daily[0].day }}</span>
              <span v-if="daily.length > 1">{{ daily[daily.length - 1].day }}</span>
            </div>
          </div>
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
              Sincronize os Forms Meta em <span class="font-mono">/marketing/formularios → Meta → Sincronizar</span> pra puxar as perguntas.
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

          <!-- Link p/ tela completa -->
          <div class="text-[11px] text-ink-subtle pt-2 border-t border-line/60">
            Ver/editar mapping completo deste form em
            <RouterLink to="/marketing/formularios" class="text-accent underline">/marketing/formularios → Meta</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
