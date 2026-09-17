<script setup>
// Detalhe de uma campanha Meta: KPIs, vínculo CV, estrutura (conjuntos e
// anúncios), leads, série diária e gestão interna (notes, priority, archived).
//
// Modal `screen` no molde do BuildingModal: cabeçalho fixo, seções numa barra
// sticky, KPIs em StatRow, cada bloco num Panel, listas em DataTable. Só
// primitivos de components/UI - nada de tabela ou checkbox à mão.

import { ref, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useCampaignsStore } from '@/stores/Marketing/Campaigns/campaignsStore';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Modal from '@/components/UI/Modal.vue';
import Panel from '@/components/UI/Panel.vue';
import StatRow from '@/components/UI/StatRow.vue';
import MetricInline from '@/components/UI/MetricInline.vue';
import DataTable from '@/components/UI/DataTable.vue';
import Badge from '@/components/UI/Badge.vue';
import Switch from '@/components/UI/Switch.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Collapsible from '@/components/UI/Collapsible.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue';
import { fieldBase, labelBase } from '@/components/UI/_classes.js';
import EnterpriseMultiSelect from '@/components/Marketing/EnterpriseMultiSelect.vue';
import LeadStatusBadge from '@/views/Office/Marketing/Captacao/components/LeadStatusBadge.vue';
import MetaFormMappingModal from '@/views/Office/Marketing/Formularios/components/MetaFormMappingModal.vue';
import CreativeLightbox from './CreativeLightbox.vue';
import CampaignDailyChart from './CampaignDailyChart.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    campaignId: { type: String, default: null },
    // Período do relatório - recorta o gráfico dia-a-dia e a lista de leads.
    // Sem período (ex.: aberto pela Central de Vínculos) → janela padrão de 30d
    // e leads mais recentes (comportamento legado).
    since: { type: String, default: null },
    until: { type: String, default: null },
});
const emit = defineEmits(['update:open', 'saved']);

const store = useCampaignsStore();
const toast = useToast();

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

// Represados DESTA campanha (ver `checarRepresados`, mais abaixo). Declarados
// AQUI, antes do watch, porque ele roda imediato - ou seja, ainda dentro do
// setup, no momento em que e registrado. Quando moravam depois dele, o reset
// tocava em `heldPreview` antes de a const existir e o modal caia com
// "Cannot access before initialization" toda vez que abria.
const heldPreview = ref(null);      // { scanned, recoverable, no_binding, no_contact }
const heldChecking = ref(false);

function close() { emit('update:open', false); }

watch([() => props.open, () => props.campaignId, () => props.since, () => props.until], async ([isOpen, id], [prevOpen, prevId]) => {
    // Reset SEMPRE que muda de campanha (ou fecha modal) - evita ver dados
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
    heldPreview.value = null;
    heldChecking.value = false;

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
    if (v == null) return '-';
    try {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(v));
    } catch { return `R$ ${v}`; }
}
function fmtInt(v) {
    if (v == null) return '-';
    return new Intl.NumberFormat('pt-BR').format(Number(v));
}
function fmtPct(v, digits = 2) {
    if (v == null) return '-';
    return `${Number(v).toFixed(digits)}%`;
}
function fmtDate(iso) {
    if (!iso) return '-';
    try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return '-'; }
}
function fmtRelative(iso) {
    if (!iso) return '-';
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

// Status da Meta em variante do Badge (cor de estado, não de série).
function statusVariant(s) {
    const up = String(s || '').toUpperCase();
    if (up.includes('ACTIVE'))  return 'success';
    if (up.includes('PAUSED'))  return 'warning';
    if (up.includes('DELETED')) return 'danger';
    return 'neutral';
}
const statusBadge = computed(() => {
    const s = String(campaign.value?.effective_status || campaign.value?.status || '').toUpperCase();
    return { label: s ? s.replace(/_/g, ' ') : '-', variant: statusVariant(s) };
});

const kpis = computed(() => {
    const c = campaign.value;
    if (!c) return null;
    // Leads da NOSSA base (inbound_leads sem spam) - a contagem da Meta inclui
    // pixel, que é agregado e sem identificação.
    const leads = Number(c.office_leads ?? c.lead_stats?.valid) || 0;
    const spend = Number(c.spend) || 0;
    const cac = c.cac != null ? Number(c.cac) : (leads > 0 ? spend / leads : null);
    const conversionRate = c.clicks > 0 ? (leads / c.clicks) * 100 : null;
    return {
        spend,
        leads,
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

// ── KPIs do período (StatRow no topo, a mesma linha em toda seção) ────────
const money = (v) => fmtMoney(v, campaign.value?.currency);
const kpiCards = computed(() => {
    const k = kpis.value;
    if (!k) return [];
    return [
        { key: 'spend',       label: 'Investido',     raw: k.spend,       format: money,  decimals: 2, icon: 'fas fa-coins',         tone: 'accent' },
        { key: 'leads',       label: 'Leads (base)',  raw: k.leads,       format: fmtInt,              icon: 'fas fa-users',         tone: 'pos' },
        { key: 'cac',         label: 'CAC',           raw: k.cac ?? 0,    format: money,  decimals: 2, icon: 'fas fa-hand-holding-dollar', tone: 'neutral', hint: k.cac == null ? 'sem lead' : 'por lead da base' },
        { key: 'impressions', label: 'Impressões',    raw: k.impressions, format: fmtInt,              icon: 'fas fa-eye',           tone: 'neutral' },
        { key: 'clicks',      label: 'Cliques',       raw: k.clicks,      format: fmtInt,              icon: 'fas fa-arrow-pointer', tone: 'neutral' },
        { key: 'ctr',         label: 'CTR',           value: fmtPct(k.ctr),                            icon: 'fas fa-percent',       tone: 'neutral' },
    ];
});

// Execução (Visão geral): tempo rodando, fim, ritmo. Texto porque é o que
// eles são - só o gasto conta.
const execItems = computed(() => {
    const c = campaign.value;
    if (!c) return [];
    const pace = pacingBadge(c.spend_pace);
    const fim = c.days_remaining != null
        ? { value: `${c.days_remaining} ${c.days_remaining === 1 ? 'dia' : 'dias'}`, tone: c.days_remaining === 0 ? 'neg' : c.days_remaining <= 3 ? 'warn' : '', hint: c.stop_time ? `até ${fmtDate(c.stop_time)}` : '' }
        : { value: 'em andamento', tone: 'pos', hint: 'sem data de fim' };
    return [
        { label: 'Gasto total', raw: Number(c.spend) || 0, format: money, decimals: 2, tone: 'accent', hint: c.daily_avg_spend != null ? `~${money(c.daily_avg_spend)}/dia` : '' },
        { label: 'Rodando há', value: c.days_running != null ? `${c.days_running} ${c.days_running === 1 ? 'dia' : 'dias'}` : '-', hint: c.start_time ? `desde ${fmtDate(c.start_time)}` : '' },
        { label: 'Encerra em', ...fim },
        pace
            ? { label: 'Ritmo de gasto', value: pace.label, tone: pace.tone, hint: c.daily_budget ? `orçamento ${money(c.daily_budget)}/dia` : '' }
            : { label: 'Ritmo de gasto', value: 'sem orçamento diário', hint: c.lifetime_budget ? `total ${money(c.lifetime_budget)}` : '' },
    ];
});

// Funil: barra proporcional ao topo (impressões). Cliques e leads são uma
// fração ínfima, então a largura mínima garante que a barra exista.
const funnelRows = computed(() => {
    const k = kpis.value;
    if (!k) return [];
    const pct = (n) => k.impressions > 0 ? Math.max(1.5, (n / k.impressions) * 100) + '%' : '0%';
    return [
        { key: 'impr',   label: 'Impressões', value: k.impressions, width: '100%',       cls: 'bg-series-1-soft' },
        { key: 'clicks', label: 'Cliques',    value: k.clicks,      width: pct(k.clicks), cls: 'bg-series-1-soft', hint: k.ctr ? `(${fmtPct(k.ctr)})` : '' },
        { key: 'leads',  label: 'Leads',      value: k.leads,       width: pct(k.leads),  cls: 'bg-data-pos/40', hint: k.conversionRate != null ? `(${fmtPct(k.conversionRate)} dos cliques)` : '' },
    ];
});

const identificacao = computed(() => {
    const c = campaign.value;
    if (!c) return [];
    return [
        { label: 'Objetivo', value: c.objective || '-', mono: true },
        { label: 'Conta de anúncio', value: c.account_name || '-' },
        { label: 'Mídia (CV)', value: efetivo.value?.midia_slug || 'sem vínculo', mono: true, hint: herdaDaConta.value ? '(da conta)' : '' },
        { label: 'Tipo de compra', value: c.buying_type || '-', mono: true },
        { label: 'Última sync', value: fmtRelative(c.last_synced_at) },
    ];
});

// Opções dos seletores (o Select só aceita { value, label }).
const ORIGEM_DEFAULT = '__padrao__';
const origemOptions = computed(() => [
    { value: ORIGEM_DEFAULT, label: `Padrão (${efetivo.value?.cv_origem || 'FB'})` },
    { value: 'FB', label: 'FB (Facebook)' },
    { value: 'IG', label: 'IG (Instagram)' },
]);
const cvOrigemSel = computed({
    get: () => vinculo.value.cv_origem || ORIGEM_DEFAULT,
    set: (v) => { vinculo.value.cv_origem = v === ORIGEM_DEFAULT ? '' : v; },
});
const priorityOptions = [
    { value: 'low', label: 'Baixa' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'Alta' },
];
const adsStatusOptions = [
    { value: 'ALL', label: 'Todos' }, { value: 'ACTIVE', label: 'Ativos' },
    { value: 'PAUSED', label: 'Pausados' }, { value: 'OTHER', label: 'Outros' },
];
const adsetSortOptions = [
    { value: 'spend', label: 'Maior gasto' }, { value: 'leads', label: 'Mais leads' },
    { value: 'name', label: 'Nome A-Z' }, { value: 'recent', label: 'Mais recentes' },
];

// Colunas das listas (DataTable: prioridade decide a ordem no celular).
const LEADS_COLUMNS = [
    { key: 'nome',         label: 'Contato', priority: 1, sortable: true, width: '32%' },
    { key: 'status',       label: 'Status',  priority: 1, sortable: true, width: '11rem' },
    { key: 'created_at',   label: 'Quando',  priority: 2, sortable: true, width: '8rem' },
    { key: 'midia_slug',   label: 'Mídia',   priority: 2, sortable: true },
    { key: 'meta_form_id', label: 'Form',    priority: 3 },
];
const DAILY_COLUMNS = [
    { key: 'day',         label: 'Dia',      priority: 1, sortable: true, format: (v) => String(v || '').slice(0, 10).split('-').reverse().join('/') },
    { key: 'spend',       label: 'Gasto',    priority: 1, sortable: true, numeric: true, format: (v) => money(v) },
    { key: 'office_leads',label: 'Leads',    priority: 1, sortable: true, numeric: true, format: fmtInt },
    { key: 'impressions', label: 'Impr.',    priority: 2, sortable: true, numeric: true, format: fmtInt },
    { key: 'clicks',      label: 'Cliques',  priority: 2, sortable: true, numeric: true, format: fmtInt },
];
const dailyRows = computed(() => daily.value.map(d => ({
    ...d, spend: Number(d.spend) || 0, office_leads: Number(d.office_leads) || 0,
    impressions: Number(d.impressions) || 0, clicks: Number(d.clicks) || 0,
})));

const dailyTotals = computed(() => {
    const acc = { spend: 0, leads: 0, clicks: 0, impressions: 0 };
    for (const d of daily.value) {
        acc.spend       += Number(d.spend)        || 0;
        acc.leads       += Number(d.office_leads) || 0;
        acc.clicks      += Number(d.clicks)      || 0;
        acc.impressions += Number(d.impressions) || 0;
    }
    return acc;
});

const dailyTotalsItems = computed(() => [
    { label: 'Gasto no período', raw: dailyTotals.value.spend, format: money, decimals: 2, tone: 'accent' },
    { label: 'Leads na base',    raw: dailyTotals.value.leads, format: fmtInt, tone: 'pos' },
    { label: 'Impressões',       raw: dailyTotals.value.impressions, format: fmtInt },
    { label: 'Cliques',          raw: dailyTotals.value.clicks, format: fmtInt },
]);

async function saveInternal() {
    const updated = await store.updateInternal(campaign.value.id, {
        notes: notes.value.trim() || null,
        priority: priority.value || 'normal',
        archived: archived.value,
    });
    if (updated) {
        campaign.value = { ...campaign.value, ...updated };
        emit('saved', updated);
        toast.success('Salvo.');
    }
}

const sections = [
    { key: 'overview',  label: 'Visão geral',  icon: 'fas fa-chart-pie',      hint: 'Execução, funil e identificação' },
    { key: 'vinculo',   label: 'Vínculo CV',   icon: 'fas fa-link',           hint: 'Para onde o lead vai no CV' },
    { key: 'structure', label: 'Estrutura',    icon: 'fas fa-sitemap',        hint: 'Conjuntos e anúncios' },
    { key: 'leads',     label: 'Leads',        icon: 'fas fa-users',          hint: 'Quem chegou por esta campanha' },
    { key: 'daily',     label: 'Dia-a-dia',    icon: 'fas fa-chart-column',   hint: 'Investimento e leads por dia' },
    { key: 'gestao',    label: 'Gestão',       icon: 'fas fa-clipboard-list', hint: 'Notas, prioridade e arquivo' },
];

// ── Vínculo CV (mapping da campanha) ───────────────────────────────────────
const vinculo = ref({
    bound_empreendimentos: [], midia_slug: '', cv_origem: '',
    tags_str: '', mapping_active: true, cv_skip: false,
    default_utm_source: '', default_utm_medium: '', default_utm_campaign: '',
    default_utm_content: '', default_utm_term: '',
    cv_extra_json: '',
});
const vinculoSaving = ref(false);
const vinculoError = ref(null);

// ── Represados DESTA campanha ──────────────────────────────────────────────
// Vincular a campanha só vale pro PRÓXIMO lead - os que chegaram antes ficaram
// em `held` e continuavam parados. Aqui, no mesmo lugar em que a pessoa vincula,
// dá pra soltar os que já estão presos. (`heldPreview` e `heldChecking` estão
// declarados antes do watch de abertura, que os zera.)
const heldSending = ref(false);
const pedindoEnvioHeld = ref(false);

async function checarRepresados() {
    const id = campaign.value?.id;
    if (!id) return;
    heldChecking.value = true;
    try {
        const d = await store.previewRecoverableForCampaign(id, { limit: 1000 });
        // Guarda contra race: só aplica se a campanha visível ainda for a mesma.
        if (campaign.value?.id === id) heldPreview.value = d;
    } finally {
        heldChecking.value = false;
    }
}

async function enviarRepresados() {
    pedindoEnvioHeld.value = false;
    const id = campaign.value?.id;
    if (!id) return;
    heldSending.value = true;
    try {
        const d = await store.dispatchRecoverable({ campaignIds: [id], limit: 1000 });
        if (!d) {
            toast.error(store.error || 'Não foi possível enviar os represados.');
        } else if (d.failed) {
            toast.warning(`${d.delivered} entregue(s), ${d.failed} falha(s) no envio ao CV.`);
        } else if (d.delivered) {
            toast.success(`${d.delivered} lead(s) represado(s) entregue(s) ao CV.`);
        } else {
            toast.info('Nenhum lead saiu: os represados ainda não têm vínculo resolvível.');
        }
        emit('saved', campaign.value);
        await checarRepresados();
    } finally {
        heldSending.value = false;
    }
}

// A contagem é uma varredura no represado - só roda quando a aba de vínculo
// abre (e depois de salvar), não em todo detalhe de campanha aberto.
watch([() => activeSection.value, () => campaign.value?.id], ([sec, id]) => {
    if (sec === 'vinculo' && id && !heldPreview.value && !heldChecking.value) checarRepresados();
});

watch(campaign, (c) => {
    if (!c) return;
    vinculo.value = {
        bound_empreendimentos: Array.isArray(c.bound_empreendimentos) ? [...c.bound_empreendimentos] : [],
        midia_slug: c.midia_slug || '',
        cv_origem: c.cv_origem || '',
        tags_str: Array.isArray(c.tags) ? c.tags.join(', ') : '',
        mapping_active: c.mapping_active !== false,
        cv_skip: c.cv_skip === true,
        default_utm_source:   c.default_utm_source   || '',
        default_utm_medium:   c.default_utm_medium   || '',
        default_utm_campaign: c.default_utm_campaign || '',
        default_utm_content:  c.default_utm_content  || '',
        default_utm_term:     c.default_utm_term     || '',
        cv_extra_json: c.cv_extra_fields ? JSON.stringify(c.cv_extra_fields, null, 2) : '',
    };
    vinculoError.value = null;
});

// Vínculo efetivo (2026-09-16): o próprio da campanha ou, sem ele, o PADRÃO
// DA CONTA de anúncio. `effective_binding` vem do backend com a mesma regra
// da captura, então o que se mostra aqui é o que o lead vai receber.
const efetivo = computed(() => campaign.value?.effective_binding || null);
const herdaDaConta = computed(() => efetivo.value?.source === 'conta');
const contaCobre = computed(() => herdaDaConta.value);
const temVinculoProprio = computed(() =>
    vinculo.value.bound_empreendimentos.length > 0 || !!vinculo.value.midia_slug?.trim());
// Vai rotear se: ativo E (vínculo próprio OU a conta cobre).
const willRoute = computed(() => vinculo.value.mapping_active && !vinculo.value.cv_skip && (temVinculoProprio.value || contaCobre.value));
// Campanha externa: lead fica no Office como "Fora do CV", sem represar.
const foraDoCv = computed(() => vinculo.value.mapping_active && vinculo.value.cv_skip);

async function saveVinculo() {
    vinculoError.value = null;
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
            cv_origem: vinculo.value.cv_origem || null,
            tags: tagsArr.length ? tagsArr : null,
            mapping_active: vinculo.value.mapping_active,
            cv_skip: vinculo.value.cv_skip,
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
            // O vínculo mudou: reconta o que dá pra soltar agora.
            await checarRepresados();
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
// campanha muda. Os arrays já foram resetados pelo watch principal - aqui só
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
    if (pace === 'on_track') return { label: 'No ritmo',  tone: 'pos' };
    if (pace === 'fast')     return { label: 'Acelerado', tone: 'warn' };
    if (pace === 'slow')     return { label: 'Lento',     tone: 'accent' };
    return null;
}

function isVideoAd(ad) {
    return !!(ad?.creative_video_id || ad?.creative_video_url ||
              String(ad?.creative_object_type || '').toUpperCase().includes('VIDEO'));
}

function adStatusBadge(s) {
    const status = String(s || '').toUpperCase();
    if (status.includes('ACTIVE'))   return { label: 'Ativo',     variant: 'success' };
    if (status.includes('PAUSED'))   return { label: 'Pausado',   variant: 'warning' };
    if (status.includes('DELETED'))  return { label: 'Excluído',  variant: 'danger' };
    if (status.includes('ARCHIVED')) return { label: 'Arquivado', variant: 'neutral' };
    return { label: status || '-', variant: 'neutral' };
}

// Métricas inline do conjunto (cabeçalho) e do anúncio (cartão).
function adsetMetrics(group) {
    return [
        { label: 'Gasto',   value: money(group.totals.spend),        cls: 'text-accent' },
        { label: 'Leads',   value: fmtInt(group.totals.leads),       cls: 'text-data-pos' },
        { label: 'Impr.',   value: fmtInt(group.totals.impressions), cls: 'text-ink' },
        { label: 'Cliques', value: fmtInt(group.totals.clicks),      cls: 'text-ink' },
    ];
}
function adMetrics(ad) {
    return [
        { label: 'Gasto', value: money(ad.spend),         cls: 'text-accent' },
        { label: 'Leads', value: fmtInt(ad.office_leads), cls: 'text-data-pos' },
        { label: 'CTR',   value: fmtPct(ad.ctr),          cls: 'text-ink' },
        { label: 'CPC',   value: money(ad.cpc),           cls: 'text-ink' },
    ];
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
        acc.leads += Number(a.office_leads) || 0;
        acc.impressions += Number(a.impressions) || 0;
        acc.clicks += Number(a.clicks) || 0;
        if (a.lead_form_id) acc.withForm += 1;
    }
    return acc;
});
const adsTotalsItems = computed(() => [
    { label: 'Anúncios',    raw: adsTotals.value.count, format: fmtInt, hint: `${adsTotals.value.withForm} com formulário` },
    { label: 'Gasto',       raw: adsTotals.value.spend, format: money, decimals: 2, tone: 'accent' },
    { label: 'Leads (base)',raw: adsTotals.value.leads, format: fmtInt, tone: 'pos' },
    { label: 'Impressões',  raw: adsTotals.value.impressions, format: fmtInt },
    { label: 'Cliques',     raw: adsTotals.value.clicks, format: fmtInt },
]);

// ── Estrutura hierárquica: Conjuntos → Ads ───────────────────────────────
// Agrupa os ads filtrados sob cada adset; mantém também um "bucket" sintético
// pra ads sem adset_id (caso raro - Meta retorna isso). Aplica sort por adset.
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
        // de status) - pra spend/leads/impressões/cliques o adset.* original
        // continua disponível como "totalDoAdSet".
        const filteredTotals = adsList.reduce((acc, a) => ({
            spend: acc.spend + (Number(a.spend) || 0),
            leads: acc.leads + (Number(a.office_leads) || 0),
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
            leads: acc.leads + (Number(a.office_leads) || 0),
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
  <div>
  <!-- `screen`: a campanha é uma PÁGINA (como o empreendimento em /crm/buildings).
       Fechar mora no canto do Modal; as seções ficam numa barra sticky. -->
  <Modal :open="open" size="screen" :padded="false" @close="close">
    <template #header>
      <div class="flex items-center gap-3 min-w-0">
        <div class="shrink-0 h-9 w-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
          <i class="fas fa-bullseye"></i>
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink truncate">{{ campaign?.name || 'Campanha' }}</h2>
          <p v-if="campaign" class="text-xs text-ink-muted mt-0.5 truncate">
            <span class="font-mono">#{{ campaign.id }}</span>
            <span v-if="campaign.account_name"> · {{ campaign.account_name }}</span>
            <span v-if="campaign.objective"> · {{ campaign.objective }}</span>
            <span v-if="campaign.last_synced_at"> · sync {{ fmtRelative(campaign.last_synced_at) }}</span>
          </p>
        </div>
        <Badge v-if="campaign" :variant="statusBadge.variant" size="sm" dot class="ml-auto shrink-0">
          {{ statusBadge.label }}
        </Badge>
      </div>
    </template>

    <div class="h-full overflow-y-auto">

      <!-- Seções: sticky no scroll único, todas à vista. -->
      <nav class="sticky top-0 z-30 border-b border-line bg-surface" role="tablist" aria-label="Seções da campanha">
        <div class="px-2 sm:px-4 grid grid-cols-3 sm:flex sm:items-stretch">
          <button v-for="s in sections" :key="s.key" type="button" role="tab"
            :aria-selected="activeSection === s.key" :title="s.hint"
            @click="activeSection = s.key"
            class="relative flex items-center justify-center sm:justify-start gap-2 px-2 sm:px-4 py-3 min-h-[48px] min-w-0 transition-colors duration-120 focus-ring rounded-md sm:flex-1 sm:basis-0"
            :class="activeSection === s.key ? 'text-accent' : 'text-ink-muted hover:text-ink'">
            <i :class="s.icon" class="text-sm w-4 text-center shrink-0"></i>
            <span class="text-sm font-semibold leading-tight truncate">{{ s.label }}</span>
            <span class="absolute left-2 right-2 bottom-0 h-0.5 rounded-t"
              :class="activeSection === s.key ? 'bg-accent' : 'bg-transparent'"></span>
          </button>
        </div>
      </nav>

      <div class="p-4 sm:p-6 space-y-4">

        <!-- Carga -->
        <template v-if="loading">
          <StatRow :items="[]" :loading="true" :cols="{ sm: 2, md: 3, lg: 6 }" size="sm" />
          <Panel :loading="true" loading-variant="chart" />
        </template>

        <!-- KPIs do período: a mesma linha em toda seção, para o número não sumir ao trocar de aba -->
        <StatRow v-else-if="kpiCards.length" :items="kpiCards" :cols="{ sm: 2, md: 3, lg: 6 }" size="sm" />

        <!-- ── Visão geral ───────────────────────────────────────────────── -->
        <template v-if="!loading && activeSection === 'overview' && campaign">

          <Panel title="Execução" icon="fas fa-gauge-high"
            :subtitle="campaign.insights_since ? `Insights de ${fmtDate(campaign.insights_since)} a ${fmtDate(campaign.insights_until)}` : ''">
            <MetricInline :items="execItems" />

            <!-- Consumo do orçamento total -->
            <div v-if="campaign.lifetime_budget && campaign.budget_consumed_pct != null" class="mt-4 pt-3 border-t border-line">
              <div class="flex justify-between text-micro text-ink-subtle mb-1">
                <span>Consumo do orçamento total</span>
                <span class="metric">{{ campaign.budget_consumed_pct }}% · {{ fmtMoney(campaign.spend, campaign.currency) }} / {{ fmtMoney(campaign.lifetime_budget, campaign.currency) }}</span>
              </div>
              <div class="w-full h-2 rounded-full bg-surface-sunken overflow-hidden">
                <div class="h-full transition-all duration-420 ease-out-expo"
                  :class="campaign.budget_consumed_pct >= 95 ? 'bg-data-neg' : campaign.budget_consumed_pct >= 80 ? 'bg-data-warn' : 'bg-accent'"
                  :style="{ width: Math.min(100, campaign.budget_consumed_pct) + '%' }"></div>
              </div>
            </div>

            <template v-if="campaign.projected_total_spend != null && campaign.days_total" #footer>
              <p class="text-micro text-ink-subtle flex items-center gap-1.5">
                <i class="fas fa-chart-line text-accent"></i>
                Projeção no ritmo atual: <b class="text-ink">{{ fmtMoney(campaign.projected_total_spend, campaign.currency) }}</b> em {{ campaign.days_total }} dias
              </p>
            </template>
          </Panel>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Funil de conversão" icon="fas fa-filter" class="lg:col-span-2"
              subtitle="Impressões que viraram clique e cliques que viraram lead na nossa base">
              <div class="space-y-2">
                <div v-for="st in funnelRows" :key="st.key" class="flex items-center gap-3">
                  <span class="text-xs text-ink-muted w-24 shrink-0">{{ st.label }}</span>
                  <div class="flex-1 h-6 rounded-md bg-surface-sunken relative overflow-hidden">
                    <div class="h-full transition-all duration-420 ease-out-expo" :class="st.cls" :style="{ width: st.width }"></div>
                    <span class="absolute inset-0 flex items-center px-2 text-xs text-ink">
                      <b class="tabular-nums">{{ fmtInt(st.value) }}</b>
                      <span v-if="st.hint" class="text-ink-subtle ml-2">{{ st.hint }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Identificação" icon="fas fa-id-card">
              <dl class="space-y-2.5">
                <div v-for="f in identificacao" :key="f.label">
                  <dt class="text-micro uppercase tracking-wider text-ink-subtle">{{ f.label }}</dt>
                  <dd class="text-sm text-ink break-words" :class="f.mono ? 'font-mono' : ''">{{ f.value }}<span v-if="f.hint" class="text-ink-subtle font-sans"> {{ f.hint }}</span></dd>
                </div>
              </dl>
            </Panel>
          </div>
        </template>

        <!-- ── Vínculo CV ────────────────────────────────────────────────── -->
        <template v-if="!loading && activeSection === 'vinculo' && campaign">

          <!-- Herdado da conta: é o caso normal, e a tela diz o que vale hoje -->
          <Panel v-if="herdaDaConta" title="Herdando o vínculo da conta" icon="fas fa-building-user"
            :subtitle="campaign.account_name">
            <p class="text-sm text-ink">
              Empreendimento(s) <span class="font-mono">{{ (efetivo.bound_empreendimentos || []).join(', ') || 'nenhum' }}</span>,
              mídia "{{ efetivo.midia_slug }}", origem {{ efetivo.cv_origem }}.
              Nada a fazer, a menos que esta campanha seja de outro produto.
            </p>
          </Panel>

          <Panel title="Vínculo desta campanha" icon="fas fa-link"
            subtitle="O destino do lead vem da conta de anúncio (aba Vínculos CV). Preencha aqui só quando esta campanha for exceção: outro empreendimento, mídia ou origem.">
            <div class="space-y-5">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="rounded-lg border border-line bg-surface-sunken/40 px-3 py-3">
                  <Switch v-model="vinculo.mapping_active" label="Roteamento automático ativo"
                    description="Ativo: o lead entra roteado com o vínculo próprio ou o da conta. Desativado: vira represado para roteamento manual." />
                </div>
                <div class="rounded-lg border border-line bg-surface-sunken/40 px-3 py-3">
                  <Switch v-model="vinculo.cv_skip" label="Campanha fora do CV (não envia)"
                    description="Lead fica no Office como Fora do CV: não represa, não cobra vínculo e não dispara alerta." />
                </div>
              </div>

              <div>
                <label :class="labelBase">Empreendimentos vinculados</label>
                <p class="text-xs text-ink-muted mb-2">Vazio = herda o empreendimento da conta. Preencha só quando esta campanha for de outro produto.</p>
                <EnterpriseMultiSelect v-model="vinculo.bound_empreendimentos" />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input v-model="vinculo.midia_slug" label="Mídia (CV)" class="sm:col-span-2"
                  :placeholder="efetivo?.midia_slug || 'padrão de Configurações'"
                  hint="Vazio = padrão da conta ou de Configurações." />
                <Select v-model="cvOrigemSel" label="Origem CV" :options="origemOptions" placeholder="" />
              </div>

              <Input v-model="vinculo.tags_str" label="Tags" placeholder="lancamento, vip" hint="Separadas por vírgula." />

              <Collapsible title="UTMs default" icon="fas fa-tag" hint="opcional - aplicados quando o payload não traz">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Input v-model="vinculo.default_utm_source"   label="utm_source"   size="sm" />
                  <Input v-model="vinculo.default_utm_medium"   label="utm_medium"   size="sm" />
                  <Input v-model="vinculo.default_utm_campaign" label="utm_campaign" size="sm" />
                  <Input v-model="vinculo.default_utm_content"  label="utm_content"  size="sm" />
                  <Input v-model="vinculo.default_utm_term"     label="utm_term"     size="sm" class="sm:col-span-2" />
                </div>
              </Collapsible>

              <Collapsible title="Campos extras pro CV" icon="fas fa-code" hint="JSON mesclado em extra_fields">
                <textarea v-model="vinculo.cv_extra_json" rows="5" placeholder='{ "corretor_id": 42 }'
                  :class="[fieldBase, 'rounded-lg px-3 py-2 text-xs font-mono resize-y mt-2']" />
              </Collapsible>

              <!-- Preview do próximo lead -->
              <div class="rounded-lg border px-3 py-2.5 text-sm font-medium flex items-center gap-2"
                :class="willRoute ? 'border-data-pos/30 bg-data-pos/5 text-data-pos' : (foraDoCv ? 'border-line bg-surface-sunken/40 text-ink-muted' : 'border-data-warn/30 bg-data-warn/5 text-data-warn')">
                <i :class="willRoute ? 'fas fa-bolt' : (foraDoCv ? 'fas fa-arrow-right-from-bracket' : 'fas fa-hand')"></i>
                <template v-if="willRoute">Próximo lead desta campanha entra roteado{{ !temVinculoProprio && contaCobre ? ' com o vínculo da conta' : '' }}.</template>
                <template v-else-if="foraDoCv">Próximo lead fica no Office como Fora do CV, sem ir ao CRM.</template>
                <template v-else>Próximo lead fica represado, aguardando vínculo.</template>
              </div>

              <div v-if="vinculoError" class="rounded-lg border border-data-neg/20 bg-data-neg/10 px-3 py-2 text-sm text-data-neg">
                <i class="fas fa-circle-exclamation mr-1.5"></i>{{ vinculoError }}
              </div>
            </div>

            <template #footer>
              <div class="flex justify-end">
                <Button variant="primary" icon="fas fa-floppy-disk" :loading="vinculoSaving" @click="saveVinculo">Salvar vínculo</Button>
              </div>
            </template>
          </Panel>

          <!-- Leads que JÁ chegaram represados (o vínculo acima não os solta sozinho) -->
          <Panel title="Represados desta campanha" icon="fas fa-hand" :loading="heldChecking" loading-variant="row"
            :empty="!heldChecking && (!heldPreview || !heldPreview.scanned)" empty-icon="fas fa-circle-check"
            empty-title="Nenhum lead represado" empty-text="Vincular vale para o próximo lead; os anteriores, se existissem, apareceriam aqui.">
            <div v-if="heldPreview && heldPreview.scanned > 0" class="flex items-start gap-3 flex-wrap">
              <div class="flex-1 min-w-[200px]">
                <div class="text-sm font-medium text-ink">{{ fmtInt(heldPreview.scanned) }} lead(s) chegaram represados</div>
                <p class="text-xs text-ink-muted mt-0.5">
                  <template v-if="heldPreview.recoverable"><b class="text-ink">{{ fmtInt(heldPreview.recoverable) }}</b> saem agora com o vínculo salvo. Vincular sozinho só vale para o próximo lead; estes precisam ser enviados.</template>
                  <template v-else>Nenhum sai ainda: salve um vínculo com o roteamento ativo e verifique de novo.</template>
                  <template v-if="heldPreview.no_contact"> · {{ fmtInt(heldPreview.no_contact) }} sem e-mail/telefone (não vão)</template>
                </p>
              </div>
              <Button v-if="heldPreview.recoverable" icon="fas fa-paper-plane" :loading="heldSending" :disabled="heldSending" @click="pedindoEnvioHeld = true">
                Enviar {{ fmtInt(heldPreview.recoverable) }} ao CV
              </Button>
              <Button v-else variant="secondary" icon="fas fa-arrows-rotate" :loading="heldChecking" @click="checarRepresados">Verificar de novo</Button>
            </div>
          </Panel>
        </template>

        <!-- ── Estrutura (Conjuntos → Anúncios) ──────────────────────────── -->
        <template v-if="!loading && activeSection === 'structure'">
          <Panel title="Conjuntos e anúncios" icon="fas fa-sitemap"
            :subtitle="`${adsets.length} conjunto(s) · ${ads.length} anúncio(s) - hierarquia da Meta`"
            :loading="adsLoading || adsetsLoading" loading-variant="row"
            :empty="!adsLoading && !adsetsLoading && !ads.length && !adsets.length" empty-icon="fas fa-sitemap"
            empty-title="Sem conjuntos ou anúncios sincronizados" empty-text="Sincronize com a Meta para puxar a hierarquia.">
            <template #actions>
              <div class="flex items-center gap-2 flex-wrap justify-end">
                <SegmentedControl v-model="adsStatusFilter" :options="adsStatusOptions" size="sm" />
                <Select v-model="adsetSortBy" :options="adsetSortOptions" size="sm" placeholder="" class="w-40" />
                <IconButton icon="fas fa-expand" variant="ghost" size="sm" v-tippy="'Expandir todos'" @click="expandAllAdsets" />
                <IconButton icon="fas fa-compress" variant="ghost" size="sm" v-tippy="'Recolher todos'" @click="collapseAllAdsets" />
                <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate" :loading="adsLoading || adsetsLoading" @click="loadStructure" v-tippy="'Recarrega do Office, sem chamar a Meta'">
                  <span class="hidden sm:inline">Atualizar</span>
                </Button>
                <Button variant="primary" size="sm" icon="fab fa-meta" :loading="adsSyncing" @click="syncAds" v-tippy="'Refaz a busca na Meta (ads + conjuntos)'">
                  <span class="hidden sm:inline">Sincronizar com Meta</span>
                </Button>
              </div>
            </template>
            <template #emptyActions>
              <Button variant="primary" size="sm" icon="fab fa-meta" :loading="adsSyncing" @click="syncAds">Sincronizar com Meta</Button>
            </template>

            <div v-if="adsLastSync" class="rounded-lg border border-data-pos/20 bg-data-pos/5 px-3 py-2 text-xs text-data-pos mb-3">
              <i class="fas fa-circle-check mr-1"></i>
              Sincronizado: <b>{{ adsLastSync.ads_total }}</b> ads ({{ adsLastSync.ads_new }} novos, {{ adsLastSync.ads_updated }} atualizados)<template v-if="adsLastSync.adsets_total"> · <b>{{ adsLastSync.adsets_total }}</b> conjuntos ({{ adsLastSync.adsets_new }} novos)</template>
            </div>

            <MetricInline v-if="ads.length" :items="adsTotalsItems" class="mb-4" />

            <div class="space-y-2">
              <div v-for="group in adsetsWithAds" :key="group.adset.id" class="rounded-xl border border-line bg-surface-raised overflow-hidden">
                <button type="button" @click="toggleAdsetExpanded(group.adset.id)"
                  class="w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-surface-sunken/60 transition-colors duration-120 focus-ring min-h-[48px]">
                  <i class="fas fa-chevron-right text-micro text-ink-subtle mt-1.5 transition-transform duration-200 shrink-0"
                    :class="expandedAdsets.has(group.adset.id) ? 'rotate-90' : ''"></i>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-sm font-medium text-ink truncate">{{ group.adset.name || '(sem nome)' }}</span>
                      <Badge v-if="group.adset.id !== '__orphans__' && (group.adset.effective_status || group.adset.status)"
                        :variant="adStatusBadge(group.adset.effective_status || group.adset.status).variant" size="sm">
                        {{ adStatusBadge(group.adset.effective_status || group.adset.status).label }}
                      </Badge>
                      <Badge variant="neutral" size="sm">{{ group.adsCount }} {{ group.adsCount === 1 ? 'anúncio' : 'anúncios' }}</Badge>
                    </div>
                    <div class="text-micro font-mono text-ink-subtle truncate mt-0.5">
                      <template v-if="group.adset.id !== '__orphans__'">#{{ group.adset.id }}</template>
                      <span v-if="group.adset.optimization_goal"> · {{ group.adset.optimization_goal }}</span>
                      <span v-if="fmtBudget(group.adset)"> · {{ fmtBudget(group.adset) }}</span>
                      <span v-if="group.adset.start_time"> · {{ fmtDate(group.adset.start_time) }}<template v-if="group.adset.end_time"> a {{ fmtDate(group.adset.end_time) }}</template></span>
                    </div>
                  </div>
                  <div class="hidden sm:grid grid-cols-4 gap-4 shrink-0 text-right">
                    <div v-for="m in adsetMetrics(group)" :key="m.label">
                      <div class="text-micro uppercase tracking-wider text-ink-subtle">{{ m.label }}</div>
                      <div class="text-sm font-semibold tabular-nums" :class="m.cls">{{ m.value }}</div>
                    </div>
                  </div>
                </button>

                <div v-if="expandedAdsets.has(group.adset.id)" class="border-t border-line bg-surface-sunken/30 p-3">
                  <p v-if="!group.ads.length" class="text-center py-6 text-xs text-ink-subtle">Nenhum anúncio neste conjunto bate com o filtro atual.</p>
                  <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <article v-for="ad in group.ads" :key="ad.id"
                      class="rounded-xl border border-line bg-surface-raised overflow-hidden flex flex-col shadow-soft hover:shadow-elevated transition-shadow duration-200">
                      <button type="button" @click="openLightbox(ad)"
                        class="relative aspect-square bg-surface-sunken flex items-center justify-center overflow-hidden group focus-ring"
                        :title="isVideoAd(ad) ? 'Reproduzir vídeo' : 'Ampliar imagem'">
                        <img v-if="ad.creative_image_url || ad.creative_thumbnail" :src="ad.creative_image_url || ad.creative_thumbnail"
                          class="w-full h-full object-contain transition-transform duration-200 group-hover:scale-[1.02]" :alt="ad.name" loading="lazy"
                          @error="$event.target.src = ad.creative_thumbnail || ''" />
                        <i v-else :class="isVideoAd(ad) ? 'fas fa-video' : 'fas fa-image'" class="text-4xl text-ink-subtle"></i>
                        <div v-if="isVideoAd(ad)" class="absolute inset-0 flex items-center justify-center">
                          <span class="w-12 h-12 rounded-full bg-surface-raised/90 border border-line flex items-center justify-center shadow-elevated transition-transform duration-200 group-hover:scale-110">
                            <i class="fas fa-play text-accent ml-0.5"></i>
                          </span>
                        </div>
                        <Badge :variant="adStatusBadge(ad.effective_status || ad.status).variant" size="sm" class="absolute top-2 right-2">
                          {{ adStatusBadge(ad.effective_status || ad.status).label }}
                        </Badge>
                        <Badge v-if="ad.lead_form_id" variant="accent" size="sm" class="absolute top-2 left-2">Lead Ad</Badge>
                        <Badge v-if="ad.creative_object_type || isVideoAd(ad)" variant="neutral" size="sm" class="absolute bottom-2 left-2 font-mono">
                          {{ ad.creative_object_type || (isVideoAd(ad) ? 'VIDEO' : 'PHOTO') }}
                        </Badge>
                      </button>

                      <div class="p-3 flex-1 flex flex-col gap-1">
                        <div class="text-sm font-medium text-ink leading-tight truncate" :title="ad.name">{{ ad.name || '(sem nome)' }}</div>
                        <div class="text-micro font-mono text-ink-subtle truncate">#{{ ad.id }}</div>
                        <div v-if="ad.creative_title" class="mt-1 text-xs text-ink font-medium truncate" :title="ad.creative_title">"{{ ad.creative_title }}"</div>
                        <div v-if="ad.creative_body" class="text-xs text-ink-muted line-clamp-2">{{ ad.creative_body }}</div>

                        <div class="grid grid-cols-4 gap-2 mt-3 pt-2 border-t border-line">
                          <div v-for="m in adMetrics(ad)" :key="m.label">
                            <div class="text-micro uppercase tracking-wider text-ink-subtle">{{ m.label }}</div>
                            <div class="text-xs font-semibold tabular-nums" :class="m.cls">{{ m.value }}</div>
                          </div>
                        </div>

                        <div class="mt-2 flex flex-wrap items-center gap-1.5">
                          <a v-if="ad.creative_link_url" :href="ad.creative_link_url" target="_blank" rel="noopener"
                            class="inline-flex items-center gap-1 text-micro text-accent hover:underline truncate max-w-full focus-ring rounded" :title="ad.creative_link_url">
                            <i class="fas fa-arrow-up-right-from-square"></i>{{ ad.creative_link_url }}
                          </a>
                          <button v-if="ad.lead_form_id" type="button" @click.stop="openFormDetail(ad)"
                            :title="ad.lead_form?.name ? `Ver perguntas do form '${ad.lead_form.name}'` : `Form #${ad.lead_form_id} (não sincronizado)`"
                            class="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent-soft text-accent px-2 py-1 text-micro font-medium hover:bg-accent/20 transition-colors duration-120 max-w-full focus-ring">
                            <i class="fas fa-file-lines shrink-0"></i>
                            <span class="truncate">
                              <template v-if="ad.lead_form">{{ ad.lead_form.name || `Form #${ad.lead_form_id}` }}</template>
                              <template v-else>Form #{{ ad.lead_form_id }} (não sincronizado)</template>
                            </span>
                            <span v-if="ad.lead_form?.questions?.length" class="opacity-70 shrink-0">· {{ ad.lead_form.questions.length }}q</span>
                          </button>
                        </div>
                        <div class="mt-auto pt-2 text-micro text-ink-subtle"><i class="fas fa-clock mr-1"></i>sync {{ ad.last_synced_at ? fmtRelative(ad.last_synced_at) : '-' }}</div>
                      </div>
                    </article>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </template>

        <!-- ── Leads ─────────────────────────────────────────────────────── -->
        <template v-if="!loading && activeSection === 'leads'">
          <Panel title="Leads da campanha" icon="fas fa-users" :padded="false"
            :subtitle="since && until ? `Período ${scopeLabel}` : 'Os mais recentes (até 100)'">
            <DataTable :columns="LEADS_COLUMNS" :rows="leads" row-key="id" sort-by="created_at" sort-dir="desc"
              empty-icon="fas fa-inbox" empty-title="Nenhum lead"
              :empty-text="since && until ? 'Nenhum lead nesse período.' : 'Nenhum lead chegou por essa campanha ainda.'">
              <template #cell-created_at="{ value }"><span class="text-ink-muted">{{ fmtRelative(value) }}</span></template>
              <template #cell-nome="{ row }">
                <div class="text-ink">{{ row.nome || '-' }}</div>
                <div class="text-micro text-ink-subtle truncate">{{ row.email || row.telefone || '' }}</div>
              </template>
              <template #cell-midia_slug="{ value }"><span class="font-mono text-ink-muted">{{ value || '-' }}</span></template>
              <template #cell-meta_form_id="{ value }"><span class="font-mono text-ink-subtle">{{ value || '-' }}</span></template>
              <template #cell-status="{ value }"><LeadStatusBadge :status="value" size="sm" /></template>
            </DataTable>
          </Panel>
        </template>

        <!-- ── Dia-a-dia ─────────────────────────────────────────────────── -->
        <template v-if="!loading && activeSection === 'daily'">
          <Panel title="Totais do período" icon="fas fa-calendar-days"
            :subtitle="`${scopeLabel} - investimento da Meta e leads da nossa base`"
            :empty="!daily.length" empty-icon="fas fa-chart-column" empty-title="Sem série diária" empty-text="Nenhum dia com dados neste período.">
            <MetricInline :items="dailyTotalsItems" />
          </Panel>

          <!-- O gráfico já é um cartão próprio (mesmo da aba Campanhas). -->
          <CampaignDailyChart v-if="daily.length" :daily="daily" :currency="campaign?.currency || 'BRL'" />

          <Panel v-if="daily.length" title="Tabela por dia" icon="fas fa-table" :padded="false" :subtitle="`${daily.length} dia(s)`">
            <DataTable :columns="DAILY_COLUMNS" :rows="dailyRows" row-key="day" sort-by="day" sort-dir="desc" />
          </Panel>
        </template>

        <!-- ── Gestão interna ────────────────────────────────────────────── -->
        <template v-if="!loading && activeSection === 'gestao' && campaign">
          <Panel title="Gestão interna" icon="fas fa-clipboard-list" subtitle="Só no Office: nada vai para a Meta nem para o CV">
            <div class="space-y-4">
              <div>
                <label :class="labelBase">Notas internas</label>
                <textarea v-model="notes" rows="4" placeholder="Observações sobre esta campanha."
                  :class="[fieldBase, 'rounded-lg px-3 py-2 text-sm resize-y']" />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <Select v-model="priority" label="Prioridade" :options="priorityOptions" placeholder="" />
                <div class="rounded-lg border border-line bg-surface-sunken/40 px-3 py-3">
                  <Switch v-model="archived" label="Arquivar" description="Some da listagem padrão; continua sincronizando." />
                </div>
              </div>
            </div>
            <template #footer>
              <div class="flex justify-end">
                <Button variant="primary" icon="fas fa-floppy-disk" :loading="store.saving" @click="saveInternal">Salvar</Button>
              </div>
            </template>
          </Panel>
        </template>
      </div>
    </div>
  </Modal>

    <!-- Sub-modal: detalhes do Lead Form. `zIndex` acima do de cima, que é o
         que o primitivo pede para empilhar diálogo sobre diálogo. -->
    <Modal :open="formDetailOpen && !!formDetailData" size="lg" :z-index="10010"
      :title="formDetailData?.name || '(sem nome)'"
      :subtitle="formDetailData ? [`#${formDetailData.id}`, formDetailData.page_name, formDetailData.status, formDetailData.created_time ? `criado ${fmtDate(formDetailData.created_time)}` : ''].filter(Boolean).join(' · ') : ''"
      @close="closeFormDetail">
      <div v-if="formDetailData" class="space-y-4">
        <MetricInline :items="[
          { label: 'Mídia (Office)', value: formDetailData.midia_slug || '-' },
          { label: 'Roteamento', value: formDetailData.mapping_active && formDetailData.midia_slug ? 'Automático' : 'Manual (represa)', tone: formDetailData.mapping_active && formDetailData.midia_slug ? 'pos' : 'warn' },
          { label: 'Perguntas', value: formDetailData.questions?.length || 0 },
        ]" />

        <Panel title="Perguntas do formulário" icon="fas fa-list-check" :padded="false"
          :empty="!Array.isArray(formDetailData.questions) || !formDetailData.questions.length"
          empty-icon="fas fa-circle-info" empty-title="Perguntas ainda não sincronizadas"
          empty-text="Sincronize os formulários na aba Formulários da Central Meta.">
          <ol class="divide-y divide-line">
            <li v-for="(q, i) in formDetailData.questions" :key="i" class="flex items-start gap-3 px-4 py-2.5">
              <span class="text-micro font-mono text-ink-subtle pt-0.5">{{ String(i + 1).padStart(2, '0') }}</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm text-ink font-medium leading-tight">{{ q.label || q.key }}</div>
                <div class="text-micro text-ink-subtle font-mono mt-0.5">
                  <span v-if="q.type">{{ q.type }}</span><span v-if="q.key && q.key !== q.label"> · key: {{ q.key }}</span>
                </div>
              </div>
            </li>
          </ol>
        </Panel>

        <p class="text-micro text-ink-subtle"><i class="fas fa-circle-info mr-1"></i>O vínculo CV (empreendimento, mídia) vive na campanha. Aqui você só configura o mapeamento pergunta → campo CV.</p>
      </div>
      <template #footer>
        <Button variant="secondary" @click="closeFormDetail">Fechar</Button>
        <Button variant="primary" icon="fas fa-list-check" @click="openFormEditor">Editar mapeamento</Button>
      </template>
    </Modal>

    <!-- Editor completo (Estrutura & Mapeamento + Comparativo + Leads).
         Independente do sub-modal de preview - quando abre, o preview fecha. -->
    <MetaFormMappingModal v-if="formDetailData" v-model:open="formEditorOpen" :form="formDetailData" @saved="onFormEditorSaved" />

    <ConfirmDialog :open="pedindoEnvioHeld" tone="accent"
      :title="`Enviar ${heldPreview?.recoverable || 0} lead(s) represado(s) ao CV?`"
      :consequence="`Os ${heldPreview?.recoverable || 0} lead(s) represado(s) desta campanha são roteados e despachados ao CRM agora.`"
      hint="É upsert: lead que já existe no CV é atualizado, não duplicado."
      :confirm-label="`Enviar ${heldPreview?.recoverable || 0}`"
      :loading="heldSending"
      @confirm="enviarRepresados" @cancel="pedindoEnvioHeld = false" />

    <!-- Lightbox de criativo (imagem ou vídeo do ad) -->
    <CreativeLightbox v-if="lightboxData" v-model:open="lightboxOpen"
      :image-url="lightboxData.imageUrl" :video-url="lightboxData.videoUrl" :video-id="lightboxData.videoId"
      :video-permalink="lightboxData.videoPermalink" :title="lightboxData.title" :subtitle="lightboxData.subtitle" />
  </div>
</template>
