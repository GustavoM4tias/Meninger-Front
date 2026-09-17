<script setup>
// Central Meta › aba Vínculos CV.
// (Panel do hub /meta - sem PageContainer/PageHeader próprios.)
//
// Responde: tudo que deveria chegar ao CV está chegando? E onde vaza?
//   • Funil de entrega (recebidos → entregues / represados / falhas / aguardando)
//     com taxa de cobertura.
//   • Vínculo PADRÃO por conta de anúncio (2026-09-16): a conta é de um
//     empreendimento e toda campanha dela herda o destino. É aqui que se
//     vincula; a campanha só recebe vínculo próprio quando é exceção.
//   • Campanhas SEM vínculo represando leads → clique vincula (CampaignDetailModal).
//   • Campanhas ativas sem vínculo (preventivo) = nem próprio nem herdado.
//   • Backlog pronto pra disparar ao CV.

import { onMounted, ref, computed } from 'vue';
import { useToast } from 'vue-toastification';
import * as fmt from '@/utils/format';
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue';
import { useCampaignsStore } from '@/stores/Marketing/Campaigns/campaignsStore';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Panel from '@/components/UI/Panel.vue';
import StatRow from '@/components/UI/StatRow.vue';
import DataTable from '@/components/UI/DataTable.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import CampaignDetailModal from '../Campanhas/components/CampaignDetailModal.vue';
import AccountBindingModal from './components/AccountBindingModal.vue';

const store = useCampaignsStore();
const toast = useToast();

const detailOpen = ref(false);
const detailId = ref(null);
function openCampaign(id) {
    detailId.value = String(id);
    detailOpen.value = true;
}

async function reload() {
    await store.fetchBindingOverview();
}
onMounted(reload);

// ── Vínculo padrão por conta de anúncio ─────────────────────────────────────
const accountOpen = ref(false);
const accountSel = ref(null);
function openAccount(a) {
    accountSel.value = a;
    accountOpen.value = true;
}
const accounts = computed(() => ov.value?.accounts || []);
const bindingDefaults = computed(() => ov.value?.binding_defaults || null);
// Primeiro quem tem campanha de lead ativa sem nada que a resolva; depois quem
// tem campanha ativa; contas paradas por último.
const accountsOrdenadas = computed(() => [...accounts.value].sort((a, b) =>
    (b.lead_campaigns_unbound - a.lead_campaigns_unbound)
    || (b.lead_campaigns_active - a.lead_campaigns_active)
    || (b.leads_30d - a.leads_30d)));
const contasSemVinculo = computed(() => accounts.value.filter(a => a.lead_campaigns_unbound > 0).length);
function empresasDaConta(a) {
    return (a.empreendimentos || []).map(e => e.nome).join(', ');
}
function filasDaConta(a) {
    const emps = a.empreendimentos || [];
    if (!emps.length) return '';
    const semFila = emps.filter(e => !e.idfila).length;
    if (!semFila) return emps.map(e => e.fila_cidades?.length ? `${e.fila_nome} (${e.fila_cidades.join(', ')})` : e.fila_nome).filter(Boolean).join(', ');
    return semFila === emps.length ? 'sem fila' : `${semFila} sem fila`;
}
// Fila de outra praça: o lead que volta com interesse novo iria para corretor
// de outra cidade. É o erro que a tela precisa gritar, não esconder num tooltip.
function filaForaDaPraca(a) {
    return (a.empreendimentos || []).filter(e => e.fila_praca_divergente);
}

// ── Enviar represados recuperáveis ao CV ────────────────────────────────────
// Dois recortes: TUDO (botão do topo da seção) ou UMA campanha/formulário
// (botão da linha). O recorte por linha é o caso real: a pessoa acabou de
// vincular aquela campanha e quer soltar só os leads dela.
const sending = ref(false);
const sendingKey = ref(null);        // 'all' | 'campaign:<id>' | 'form:<id>'
const sendResult = ref(null);

/* Enviar represado despacha lead de verdade ao CRM. O `confirm` do navegador
   nao deixava claro QUANTOS saem de uma vez. */
const pedindoEnvio = ref(false);
const alvoEnvio = ref(null);         // { key, label, total, campaignIds, formIds }

function enviarTodos() {
    const total = summary.value.leads_recoverable || 0;
    if (!total) return;
    alvoEnvio.value = { key: 'all', label: 'de todas as campanhas já vinculadas', total, campaignIds: [], formIds: [] };
    pedindoEnvio.value = true;
}

function enviarCampanha(c) {
    if (!c?.resolvable_count) return;
    alvoEnvio.value = {
        key: `campaign:${c.campaign_id}`,
        label: `da campanha "${c.name || '#' + c.campaign_id}"`,
        total: c.resolvable_count,
        campaignIds: [c.campaign_id],
        formIds: [],
    };
    pedindoEnvio.value = true;
}

function enviarFormulario(f) {
    if (!f?.held_count) return;
    alvoEnvio.value = {
        key: `form:${f.form_id}`,
        label: `do formulário "${f.name || '#' + f.form_id}"`,
        total: f.held_count,
        campaignIds: [],
        formIds: [f.form_id],
    };
    pedindoEnvio.value = true;
}

async function enviarConfirmado() {
    const alvo = alvoEnvio.value;
    if (!alvo) return;
    pedindoEnvio.value = false;
    sending.value = true;
    sendingKey.value = alvo.key;
    sendResult.value = null;
    try {
        const d = await store.dispatchRecoverable({
            preview: false,
            limit: 1000,
            campaignIds: alvo.campaignIds,
            formIds: alvo.formIds,
        });
        sendResult.value = d;
        if (!d) {
            toast.error(store.error || 'Não foi possível enviar os represados.');
        } else if (d.failed) {
            toast.warning(`${d.delivered} entregue(s), ${d.failed} falha(s) no envio ao CV.`);
        } else if (d.delivered) {
            toast.success(`${d.delivered} lead(s) represado(s) entregue(s) ao CV.`);
        } else {
            toast.info('Nenhum lead saiu: os represados ainda não têm vínculo resolvível.');
        }
    } finally {
        sending.value = false;
        sendingKey.value = null;
        alvoEnvio.value = null;
    }
}

// ── Reenviar entregues com destino divergente do vínculo atual ──────────────
// "Vinculei errado e os leads já foram": corrige-se o vínculo na campanha e
// esta ação reenvia os entregues com o destino novo (upsert no CV). O
// interesse antigo permanece lá - só o painel do CV remove interesse.
const resending = ref(false);
const resendingKey = ref(null);
const resendResult = ref(null);
const pedindoReenvio = ref(false);
const alvoReenvio = ref(null);       // { key, label, total, campaignIds, formIds }

function reenviar(m) {
    if (!m?.lead_count) return;
    const isForm = m.kind === 'form';
    alvoReenvio.value = {
        key: isForm ? `form:${m.form_id}` : `campaign:${m.campaign_id}`,
        label: isForm ? `do formulário "${m.name || '#' + m.form_id}"` : `da campanha "${m.name || '#' + m.campaign_id}"`,
        destino: (m.target_emp_names || []).join(', '),
        total: m.lead_count,
        campaignIds: isForm ? [] : [m.campaign_id],
        formIds: isForm ? [m.form_id] : [],
    };
    pedindoReenvio.value = true;
}

async function reenviarConfirmado() {
    const alvo = alvoReenvio.value;
    if (!alvo) return;
    pedindoReenvio.value = false;
    resending.value = true;
    resendingKey.value = alvo.key;
    resendResult.value = null;
    try {
        const d = await store.redispatchDelivered({
            preview: false,
            limit: 1000,
            campaignIds: alvo.campaignIds,
            formIds: alvo.formIds,
        });
        resendResult.value = d;
        if (!d) {
            toast.error(store.error || 'Não foi possível reenviar.');
        } else if (d.failed) {
            toast.warning(`${d.delivered} reenviado(s), ${d.failed} falha(s).`);
        } else if (d.delivered) {
            toast.success(`${d.delivered} lead(s) reenviado(s) ao CV com o destino atual.`);
        } else {
            toast.info('Nenhum lead reenviado: os destinos já batem com o vínculo atual.');
        }
    } finally {
        resending.value = false;
        resendingKey.value = null;
        alvoReenvio.value = null;
    }
}

const ov = computed(() => store.bindingOverview);
const funnel = computed(() => ov.value?.funnel || {});
const summary = computed(() => ov.value?.summary || {});
const held = computed(() => ov.value?.held || { campaigns: [], forms: [] });
const activeUnbound = computed(() => ov.value?.active_unbound_campaigns || []);
const fallbackInUse = computed(() => ov.value?.fallback_in_use || []);
// 'no_campaign' (default): campanha sem vínculo REPRESA os leads.
// 'always' (toggle em Configurações): o form cobre e o lead SAI - destino pode
// estar errado. Os textos da tela dizem a consequência do modo vigente.
const formCobre = computed(() => ov.value?.form_fallback_scope === 'always');
const mismatched = computed(() => ov.value?.mismatched_delivered || []);
const mismatchedLeads = computed(() => summary.value.mismatched_delivered_leads || 0);
const backlog = computed(() => ov.value?.backlog || null);

/* Vazio é '0', não '-': aqui a ausência de represado significa zero mesmo. */
const fmtInt = (v) => fmt.fmtInt(v, '0');

// Por que essa campanha represa. Mesma frase na tabela e no cartão do celular.
function motivoBloqueio(c) {
    if (c.not_synced) return 'campanha não sincronizada';
    if (c.mapping_active === false) return 'vínculo desativado';
    return 'sem vínculo (nem próprio, nem da conta)';
}

// Bloqueadas = ainda seguram lead que NENHUM vínculo resolve hoje (nem o da
// campanha nem o do formulário). Recuperáveis = já dá pra soltar agora.
const campanhasBloqueadas = computed(() => held.value.campaigns.filter(c => c.blocked_count > 0));
const campanhasRecuperaveis = computed(() => held.value.campaigns.filter(c => c.resolvable_count > 0));
const formsRecuperaveis = computed(() => (held.value.forms || []).filter(f => f.is_bound && f.held_count > 0));
const temRecuperavel = computed(() => campanhasRecuperaveis.value.length > 0 || formsRecuperaveis.value.length > 0);

// Saúde geral: verde se cobertura alta e sem risco; âmbar/vermelho conforme.
const healthTone = computed(() => {
    const s = summary.value;
    if (s.leads_at_risk > 0 || s.unbound_campaigns_with_leads > 0) return 'danger';
    // Lead entregue no CV com destino DIFERENTE do vínculo atual: está no
    // empreendimento errado lá dentro - reenviar corrige.
    if (mismatchedLeads.value > 0) return 'danger';
    // Lead ENTREGUE mas com destino decidido pelo formulário, não pela campanha:
    // pode estar indo pro empreendimento errado (incidente Esmeralda×Três Marias).
    if (fallbackInUse.value.length > 0) return 'warn';
    // Vínculo resolvido mas lead ainda parado: não é "tudo certo" - falta enviar.
    if (s.leads_recoverable > 0) return 'warn';
    if (s.active_unbound_campaigns > 0 || s.unbound_accounts > 0) return 'warn';
    if (funnel.value.coverage_pct != null && funnel.value.coverage_pct < 90) return 'warn';
    return 'ok';
});

const healthCopy = computed(() => {
    const s = summary.value;
    if (healthTone.value === 'danger') {
        if (!(s.leads_at_risk > 0 || s.unbound_campaigns_with_leads > 0) && mismatchedLeads.value > 0) {
            return {
                title: `${fmtInt(mismatchedLeads.value)} lead(s) no CV com destino diferente do vínculo atual`,
                desc: 'O vínculo foi corrigido depois desses leads terem sido entregues - eles estão no empreendimento antigo lá no CV. Reenvie-os abaixo para aplicar o destino certo.',
            };
        }
        return {
            title: `${fmtInt(s.leads_at_risk)} lead(s) represado(s) por falta de vínculo`,
            desc: `${s.unbound_campaigns_with_leads} campanha(s) sem vínculo estão segurando leads que não chegam ao CV. Vincule-as abaixo.`
                + (s.leads_recoverable > 0 ? ` Outros ${fmtInt(s.leads_recoverable)} lead(s) já têm vínculo e só falta enviar.` : ''),
        };
    }
    if (healthTone.value === 'warn') {
        if (fallbackInUse.value.length > 0) {
            return {
                title: `${fallbackInUse.value.length} campanha(s) entregando pelo vínculo do formulário`,
                desc: 'Os leads estão chegando ao CV, mas o destino vem do formulário, não da campanha. '
                    + 'Confira abaixo se o empreendimento aplicado é o certo e vincule a campanha.',
            };
        }
        if (s.leads_recoverable > 0) {
            return {
                title: `${fmtInt(s.leads_recoverable)} lead(s) represado(s) prontos pra enviar`,
                desc: 'O vínculo já resolve esses leads, mas eles ficaram presos de antes. Envie-os ao CV abaixo.',
            };
        }
        if (s.unbound_accounts > 0) {
            return {
                title: `${s.unbound_accounts} conta(s) de anúncio com campanha de lead sem vínculo`,
                desc: 'Vincule a conta ao empreendimento dela (uma vez) e toda campanha da conta, inclusive as futuras, passa a rotear. '
                    + (formCobre.value
                        ? 'Até lá os próximos leads sairão pelo vínculo do FORMULÁRIO e o destino pode ir errado.'
                        : 'Até lá os próximos leads ficarão represados.'),
            };
        }
        return {
            title: 'Atenção preventiva',
            desc: s.active_unbound_campaigns > 0
                ? `${s.active_unbound_campaigns} campanha(s) ativa(s) sem vínculo - ` + (formCobre.value
                    ? 'os próximos leads sairão pelo vínculo do FORMULÁRIO e o destino pode ir errado.'
                    : 'os próximos leads ficarão represados até vincular.')
                : 'Cobertura de entrega abaixo de 90% no período.',
        };
    }
    return {
        title: 'Tudo vinculado',
        desc: 'Nenhuma campanha sem vínculo represando leads. Os leads captados estão chegando ao CV. Campanha nova herda o vínculo da conta.',
    };
});

const toneClasses = {
    ok:     { wrap: 'border-data-pos/30 bg-data-pos/5', icon: 'fas fa-circle-check text-data-pos', ring: 'text-data-pos' },
    warn:   { wrap: 'border-data-warn/30 bg-data-warn/5',     icon: 'fas fa-triangle-exclamation text-data-warn', ring: 'text-data-warn' },
    danger: { wrap: 'border-data-neg/30 bg-data-neg/5',         icon: 'fas fa-circle-exclamation text-data-neg', ring: 'text-data-neg' },
};

// KPIs do funil (StatRow; ausência de represado é zero mesmo, não "-").
const funnelCards = computed(() => {
    const f = funnel.value;
    return [
        { key: 'delivered', label: 'Entregues ao CV', raw: f.delivered || 0, format: fmtInt, icon: 'fas fa-circle-check',   tone: 'pos' },
        { key: 'held',      label: 'Represados',      raw: f.held || 0,      format: fmtInt, icon: 'fas fa-hand',           tone: f.held ? 'neg' : 'neutral' },
        { key: 'pending',   label: 'Aguardando envio',raw: f.pending || 0,   format: fmtInt, icon: 'fas fa-hourglass-half', tone: 'accent' },
        { key: 'failed',    label: 'Falhas',          raw: f.failed || 0,    format: fmtInt, icon: 'fas fa-circle-xmark',   tone: f.failed ? 'warn' : 'neutral' },
    ];
});

function statusBadge(s) {
    const up = String(s || '').toUpperCase();
    if (up.includes('ACTIVE'))   return { label: 'Ativa',     variant: 'success' };
    if (up.includes('PAUSED'))   return { label: 'Pausada',   variant: 'warning' };
    if (up.includes('ARCHIVED')) return { label: 'Arquivada', variant: 'neutral' };
    if (up.includes('DELETED'))  return { label: 'Excluída',  variant: 'danger' };
    return { label: up || '-', variant: 'neutral' };
}

// ── Colunas das listas (DataTable) ──────────────────────────────────────────
// Prioridade decide a ordem no celular: 1 = título do card, 2 = corpo, 3 = "Ver detalhes".
const ACCOUNT_COLUMNS = [
    { key: 'account_name',          label: 'Conta',                    priority: 1 },
    { key: 'destino',               label: 'Destino padrão',           priority: 1, truncate: false },
    { key: 'midia_slug',            label: 'Mídia',                    priority: 3 },
    { key: 'lead_campaigns_active', label: 'Campanhas de lead ativas', priority: 2, numeric: true },
    { key: 'leads_30d',             label: 'Leads 30d',                priority: 2, numeric: true, format: fmtInt },
];
const BLOCKED_COLUMNS = [
    { key: 'name',             label: 'Campanha',        priority: 1, sortable: true },
    { key: 'account_name',     label: 'Conta',           priority: 2, sortable: true },
    { key: 'effective_status', label: 'Status',          priority: 2 },
    { key: 'motivo',           label: 'Motivo',          priority: 3, truncate: false },
    { key: 'blocked_count',    label: 'Leads represados',priority: 1, numeric: true, sortable: true },
];
const MISMATCH_COLUMNS = [
    { key: 'name',       label: 'Campanha / formulário', priority: 1, sortable: true },
    { key: 'destino',    label: 'Vínculo atual',         priority: 1, truncate: false },
    { key: 'lead_count', label: 'Leads com destino antigo', priority: 1, numeric: true, sortable: true, format: fmtInt },
];
const FALLBACK_COLUMNS = [
    { key: 'name',       label: 'Campanha',           priority: 1, sortable: true },
    { key: 'destino',    label: 'Indo para',          priority: 1, truncate: false },
    { key: 'lead_count', label: 'Leads no período',   priority: 1, numeric: true, sortable: true, format: fmtInt },
];
const RECOVER_COLUMNS = [
    { key: 'name',  label: 'Campanha / formulário', priority: 1, sortable: true },
    { key: 'count', label: 'Leads',                 priority: 1, numeric: true, sortable: true, format: fmtInt },
];
const UNBOUND_COLUMNS = [
    { key: 'name',   label: 'Campanha', priority: 1, sortable: true },
    { key: 'reason', label: 'Motivo',   priority: 2, truncate: false },
];
const FORMS_COLUMNS = [
    { key: 'name',       label: 'Formulário',        priority: 1, sortable: true },
    { key: 'held_count', label: 'Leads represados',  priority: 1, numeric: true, sortable: true, format: fmtInt },
];

// Linhas com chave própria (a tabela precisa de um id por linha).
const mismatchedRows = computed(() => mismatched.value.map(m => ({
    ...m, _key: m.kind === 'form' ? `form:${m.form_id}` : `campaign:${m.campaign_id}`,
})));
const fallbackRows = computed(() => fallbackInUse.value.map(c => ({ ...c, _key: `fb:${c.campaign_id}:${c.form_id}` })));
const recuperaveisRows = computed(() => [
    ...campanhasRecuperaveis.value.map(c => ({
        ...c, kind: 'campaign', _key: `campaign:${c.campaign_id}`, count: c.resolvable_count,
        origem: c.resolvable_via_form ? 'vínculo do formulário' : (c.account_name || ''),
    })),
    ...formsRecuperaveis.value.map(f => ({
        ...f, kind: 'form', _key: `form:${f.form_id}`, count: f.held_count, origem: 'formulário - lead sem campanha',
    })),
]);
const formsSemVinculo = computed(() => (held.value.forms || []).filter(f => !f.is_bound));
</script>

<template>
  <div>
      <!-- Toolbar da aba (o header vive no hub Central Meta) -->
      <div class="flex items-center justify-end gap-2 mb-3">
          <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate" :loading="store.loadingBinding" @click="reload">
            <span class="hidden sm:inline">Atualizar</span>
          </Button>
      </div>

      <!-- Carga inicial -->
      <div v-if="store.loadingBinding && !ov" class="space-y-4">
        <Skeleton variant="card" />
        <StatRow :items="[]" :loading="true" :cols="{ sm: 2, md: 4, lg: 4 }" />
        <Panel :loading="true" loading-variant="table" />
      </div>

      <template v-else-if="ov">
        <!-- ══ Painel de saúde ══════════════════════════════════════════════ -->
        <div :class="['rounded-xl border p-4 mb-4 flex items-start gap-3.5', toneClasses[healthTone].wrap]">
          <i :class="[toneClasses[healthTone].icon, 'text-2xl mt-0.5']"></i>
          <div class="flex-1 min-w-0">
            <div class="text-base font-semibold text-ink">{{ healthCopy.title }}</div>
            <div class="text-sm text-ink-muted mt-0.5">{{ healthCopy.desc }}</div>
          </div>
          <!-- Cobertura -->
          <div v-if="funnel.coverage_pct != null" class="text-center shrink-0 pl-3">
            <div :class="['text-metric metric leading-none', toneClasses[healthTone].ring]">
              {{ funnel.coverage_pct }}<span class="text-lg">%</span>
            </div>
            <div class="text-micro uppercase tracking-wider font-mono text-ink-subtle mt-1">cobertura</div>
          </div>
        </div>

        <!-- ══ Funil de entrega (fluxo AO VIVO) ═════════════════════════════ -->
        <StatRow :items="funnelCards" :cols="{ sm: 2, md: 4, lg: 4 }" size="sm" />
        <p class="mt-2 mb-5 text-micro text-ink-subtle flex items-start gap-1.5">
          <i class="fas fa-circle-info mt-0.5"></i>
          <span>
            A <b>cobertura</b> mede só os leads que entraram pelo fluxo ao vivo (entregues ÷ ao vivo).
            <template v-if="funnel.historical">Há também <b>{{ fmtInt(funnel.historical) }}</b> lead(s) de <b>espelho histórico</b> (importados da Meta, a maioria já no CV desde antes do cutover); eles <b>não</b> entram na cobertura.</template>
            <template v-if="funnel.ignored"> <b>{{ fmtInt(funnel.ignored) }}</b> lead(s) marcados como fora do CV também ficam de fora.</template>
          </span>
        </p>

        <div class="space-y-5">

        <!-- ══ Vínculo padrão por conta de anúncio ══════════════════════════ -->
        <Panel title="Vínculo padrão por conta de anúncio" icon="fas fa-building-user" :padded="false"
          subtitle="A conta decide o destino; campanha nova herda, e só precisa de vínculo próprio quando é exceção"
          :empty="!accountsOrdenadas.length" empty-icon="fas fa-building-user"
          empty-title="Nenhuma conta de anúncio sincronizada" empty-text="Sincronize as campanhas na aba Campanhas.">
          <template v-if="contasSemVinculo" #actions>
            <Badge variant="warning" size="sm">{{ contasSemVinculo }} sem vínculo</Badge>
          </template>
          <DataTable :columns="ACCOUNT_COLUMNS" :rows="accountsOrdenadas" row-key="account_id" :sortable="false">
            <template #cell-account_name="{ row }">
              <div class="text-ink font-medium truncate" :title="row.account_name">{{ row.account_name || row.account_id }}</div>
              <div class="text-micro font-mono text-ink-subtle">{{ row.account_id }}</div>
            </template>
            <template #cell-destino="{ row }">
              <template v-if="row.is_bound">
                <div class="text-ink">{{ empresasDaConta(row) }}</div>
                <div class="text-micro text-ink-subtle">fila: {{ filasDaConta(row) || 'sem fila' }}</div>
                <div v-for="e in filaForaDaPraca(row)" :key="e.idempreendimento" class="text-micro text-data-neg">
                  <i class="fas fa-triangle-exclamation mr-1"></i>{{ e.nome }} ({{ e.cidade }}) está na fila de {{ e.fila_cidades.join(', ') }}
                </div>
              </template>
              <span v-else-if="row.fora_do_cv" class="text-ink-muted">fora do CV (conta externa)</span>
              <span v-else class="text-data-warn">{{ row.mapping_active ? 'sem vínculo' : 'desativado' }}</span>
            </template>
            <template #cell-midia_slug="{ row }">
              <span class="text-ink-muted">{{ row.midia_slug || `padrão (${bindingDefaults?.midia_slug || 'Facebook Ads'})` }}</span>
            </template>
            <template #cell-lead_campaigns_active="{ row }">
              <span class="tabular-nums" :class="row.lead_campaigns_unbound ? 'text-data-warn font-semibold' : 'text-ink'">{{ fmtInt(row.lead_campaigns_active) }}</span>
              <div class="text-micro text-ink-subtle">
                <span v-if="row.lead_campaigns_unbound" class="text-data-warn">{{ row.lead_campaigns_unbound }} sem vínculo</span>
                <span v-if="row.lead_campaigns_unbound && row.campaigns_own_binding"> · </span>
                <span v-if="row.campaigns_own_binding">{{ row.campaigns_own_binding }} próprio(s)</span>
              </div>
            </template>
            <template #actions="{ row }">
              <Button :variant="row.is_bound || row.fora_do_cv ? 'secondary' : 'primary'" size="sm" icon="fas fa-link" @click.stop="openAccount(row)">
                {{ row.is_bound || row.fora_do_cv ? 'Editar' : 'Vincular' }}
              </Button>
            </template>
          </DataTable>
        </Panel>

        <!-- ══ Campanhas sem vínculo represando leads (ação) ════════════════ -->
        <Panel title="Campanhas sem vínculo represando leads" icon="fas fa-triangle-exclamation" :padded="false"
          :empty="!campanhasBloqueadas.length" empty-icon="fas fa-circle-check"
          empty-title="Nenhuma campanha represando leads" empty-text="Todo lead captado tem para onde ir.">
          <template v-if="campanhasBloqueadas.length" #actions>
            <Badge variant="danger" size="sm">{{ campanhasBloqueadas.length }}</Badge>
          </template>
          <DataTable :columns="BLOCKED_COLUMNS" :rows="campanhasBloqueadas" row-key="campaign_id" sort-by="blocked_count" sort-dir="desc">
            <template #cell-name="{ row }">
              <button v-if="!row.not_synced" type="button" @click="openCampaign(row.campaign_id)"
                class="text-ink font-medium leading-tight truncate max-w-full text-left hover:text-accent hover:underline block focus-ring rounded"
                :title="`Abrir campanha ${row.name || row.campaign_id}`">{{ row.name || '(não sincronizada)' }}</button>
              <div v-else class="text-ink font-medium leading-tight truncate">{{ row.name || '(não sincronizada)' }}</div>
              <div class="text-micro font-mono text-ink-subtle">#{{ row.campaign_id }}</div>
            </template>
            <template #cell-effective_status="{ row }">
              <Badge v-if="!row.not_synced" :variant="statusBadge(row.effective_status).variant" size="sm">{{ statusBadge(row.effective_status).label }}</Badge>
              <span v-else class="text-micro text-ink-subtle italic">fora do cache</span>
            </template>
            <template #cell-motivo="{ row }"><span class="text-ink-muted">{{ motivoBloqueio(row) }}</span></template>
            <template #cell-blocked_count="{ row }">
              <span class="font-semibold text-data-neg tabular-nums">{{ fmtInt(row.blocked_count) }}</span>
              <div v-if="row.resolvable_count" class="text-micro text-ink-subtle">+ {{ fmtInt(row.resolvable_count) }} já recuperável</div>
            </template>
            <template #actions="{ row }">
              <Button v-if="!row.not_synced" variant="primary" size="sm" icon="fas fa-link" @click.stop="openCampaign(row.campaign_id)">Vincular</Button>
              <span v-else class="text-micro text-ink-subtle italic">sincronize as campanhas</span>
            </template>
          </DataTable>
        </Panel>

        <!-- ══ Entregues com destino DIFERENTE do vínculo atual (corrigir no CV) ══ -->
        <Panel v-if="mismatched.length" title="Entregues com destino diferente do vínculo atual" icon="fas fa-arrows-rotate" :padded="false"
          subtitle="Últimos 90 dias - reenviar aplica o destino certo no CV (upsert: registra nova conversão e re-enfileira; o interesse antigo permanece, remoção só pelo painel do CV)">
          <div v-if="resendResult" class="mx-4 mt-3 rounded-lg border px-3 py-2.5 text-sm"
            :class="resendResult.failed ? 'border-data-warn/30 bg-data-warn/5 text-data-warn' : 'border-data-pos/20 bg-data-pos/5 text-data-pos'">
            <i :class="resendResult.failed ? 'fas fa-triangle-exclamation' : 'fas fa-circle-check'" class="mr-1.5"></i>
            <b>{{ fmtInt(resendResult.delivered) }}</b> reenviado(s) com o destino atual
            <template v-if="resendResult.unchanged"> · {{ fmtInt(resendResult.unchanged) }} já batiam</template>
            <template v-if="resendResult.no_binding"> · {{ fmtInt(resendResult.no_binding) }} sem vínculo resolvível</template>
            <template v-if="resendResult.failed"> · {{ fmtInt(resendResult.failed) }} falha(s)</template>
            <template v-if="resendResult.reached_limit"> · atingiu o lote - clique de novo para continuar</template>
          </div>
          <DataTable :columns="MISMATCH_COLUMNS" :rows="mismatchedRows" row-key="_key" sort-by="lead_count" sort-dir="desc">
            <template #cell-name="{ row }">
              <button v-if="row.kind === 'campaign'" type="button" @click="openCampaign(row.campaign_id)"
                class="text-ink font-medium leading-tight text-left hover:text-accent hover:underline truncate max-w-full block focus-ring rounded"
                :title="`Abrir campanha ${row.name || row.campaign_id}`">{{ row.name || `#${row.campaign_id}` }}</button>
              <span v-else class="text-ink font-medium leading-tight block truncate" :title="row.name">{{ row.name || `#${row.form_id}` }}</span>
              <div class="text-micro text-ink-subtle">{{ row.kind === 'form' ? 'formulário - leads sem campanha' : (row.account_name || '') }}</div>
            </template>
            <template #cell-destino="{ row }"><b class="text-ink">{{ (row.target_emp_names || []).join(', ') || '-' }}</b></template>
            <template #actions="{ row }">
              <Button variant="primary" size="sm" icon="fas fa-paper-plane" :disabled="resending"
                :loading="resending && resendingKey === row._key" @click.stop="reenviar(row)">
                Reenviar {{ fmtInt(row.lead_count) }}
              </Button>
            </template>
          </DataTable>
        </Panel>

        <!-- ══ Entregando pelo vínculo do FORMULÁRIO (destino pode estar errado) ══ -->
        <Panel v-if="fallbackInUse.length" title="Campanhas entregando pelo vínculo do formulário" icon="fas fa-diamond-turn-right" :padded="false"
          subtitle="Últimos 30 dias - o formulário é da página e atende produtos diferentes; com o vínculo na campanha o destino fica explícito e este aviso some">
          <DataTable :columns="FALLBACK_COLUMNS" :rows="fallbackRows" row-key="_key" sort-by="lead_count" sort-dir="desc">
            <template #cell-name="{ row }">
              <button type="button" @click="openCampaign(row.campaign_id)"
                class="text-ink font-medium leading-tight text-left hover:text-accent hover:underline truncate max-w-full block focus-ring rounded"
                :title="`Abrir campanha ${row.name || row.campaign_id}`">{{ row.name || `#${row.campaign_id}` }}</button>
              <div class="text-micro text-ink-subtle truncate">{{ row.account_name || '-' }} · form "{{ row.form_name || row.form_id }}"</div>
            </template>
            <template #cell-destino="{ row }"><b class="text-data-warn">{{ (row.form_emp_names || []).join(', ') || 'sem empreendimento' }}</b></template>
            <template #actions="{ row }">
              <Button variant="primary" size="sm" icon="fas fa-link" @click.stop="openCampaign(row.campaign_id)">Vincular</Button>
            </template>
          </DataTable>
        </Panel>

        <!-- ══ Represados recuperáveis (vínculo já resolve) ═════════════════ -->
        <Panel v-if="temRecuperavel" title="Represados recuperáveis" icon="fas fa-rotate-right" :padded="false"
          subtitle="O vínculo já resolve - falta enviar ao CV">
          <template #actions>
            <Button size="sm" icon="fas fa-paper-plane" :loading="sending && sendingKey === 'all'"
              :disabled="sending || !summary.leads_recoverable" @click="enviarTodos">
              Enviar todos ({{ fmtInt(summary.leads_recoverable) }})
            </Button>
          </template>
          <div v-if="sendResult" class="mx-4 mt-3 rounded-lg border px-3 py-2.5 text-sm"
            :class="sendResult.failed ? 'border-data-warn/30 bg-data-warn/5 text-data-warn' : 'border-data-pos/20 bg-data-pos/5 text-data-pos'">
            <i :class="sendResult.failed ? 'fas fa-triangle-exclamation' : 'fas fa-circle-check'" class="mr-1.5"></i>
            <b>{{ fmtInt(sendResult.delivered) }}</b> entregue(s) ao CV, <b>{{ fmtInt(sendResult.recoverable) }}</b> recuperado(s)
            <template v-if="sendResult.no_binding"> · {{ fmtInt(sendResult.no_binding) }} ainda sem vínculo</template>
            <template v-if="sendResult.failed"> · {{ fmtInt(sendResult.failed) }} falha(s)</template>
            <template v-if="sendResult.reached_limit"> · atingiu o lote - clique de novo para continuar</template>
          </div>
          <DataTable :columns="RECOVER_COLUMNS" :rows="recuperaveisRows" row-key="_key" sort-by="count" sort-dir="desc">
            <template #cell-name="{ row }">
              <button v-if="row.kind === 'campaign'" type="button" @click="openCampaign(row.campaign_id)"
                class="text-ink font-medium leading-tight text-left hover:text-accent hover:underline truncate max-w-full block focus-ring rounded"
                :title="`Abrir campanha ${row.name || row.campaign_id}`">{{ row.name || `#${row.campaign_id}` }}</button>
              <span v-else class="text-ink font-medium block truncate" :title="row.name">{{ row.name || `#${row.form_id}` }}</span>
              <div class="text-micro text-ink-subtle">{{ row.origem }}</div>
            </template>
            <template #actions="{ row }">
              <Button variant="primary" size="sm" icon="fas fa-paper-plane" :disabled="sending"
                :loading="sending && sendingKey === row._key"
                @click.stop="row.kind === 'campaign' ? enviarCampanha(row) : enviarFormulario(row)">
                Enviar {{ fmtInt(row.count) }}
              </Button>
              <RouterLink v-if="row.kind === 'campaign'" to="/meta?tab=captacao" class="ml-2 text-micro text-accent hover:underline whitespace-nowrap">ver na inbox</RouterLink>
            </template>
          </DataTable>
        </Panel>

        <!-- ══ Campanhas ativas sem vínculo (preventivo) ════════════════════ -->
        <Panel v-if="activeUnbound.length" title="Campanhas ativas sem vínculo (preventivo)" icon="fas fa-shield-halved" :padded="false"
          :subtitle="formCobre ? 'Os próximos leads sairão pelo vínculo do formulário - o destino pode ir errado' : 'Os próximos leads ficarão represados até vincular'">
          <DataTable :columns="UNBOUND_COLUMNS" :rows="activeUnbound" row-key="campaign_id">
            <template #cell-name="{ row }">
              <button type="button" @click="openCampaign(row.campaign_id)"
                class="text-ink font-medium leading-tight text-left hover:text-accent hover:underline truncate max-w-full block focus-ring rounded"
                :title="`Abrir campanha ${row.name || row.campaign_id}`">{{ row.name || `#${row.campaign_id}` }}</button>
              <div class="text-micro font-mono text-ink-subtle">{{ row.account_name || '-' }}</div>
            </template>
            <template #cell-reason="{ row }">
              <span class="text-ink-muted">{{ row.reason === 'mapping_desativado' ? 'vínculo desativado' : 'sem vínculo próprio e a conta não tem padrão' }}</span>
            </template>
            <template #actions="{ row }">
              <Button variant="secondary" size="sm" icon="fas fa-link" @click.stop="openCampaign(row.campaign_id)">Vincular</Button>
            </template>
          </DataTable>
        </Panel>

        <!-- ══ Backlog pronto para enviar ═══════════════════════════════════ -->
        <Panel v-if="backlog && (backlog.historical_total > 0 || backlog.routed_pending > 0)" title="Backlog pronto para enviar ao CV" icon="fas fa-paper-plane">
          <template #actions>
            <RouterLink to="/meta?tab=campanhas">
              <Button variant="secondary" size="sm" icon="fas fa-arrow-right">Disparar em Campanhas</Button>
            </RouterLink>
          </template>
          <p class="text-sm text-ink-muted">
            <b class="text-ink">{{ fmtInt(backlog.historical_total) }}</b> histórico(s)
            <template v-if="backlog.routed_pending"> · <b class="text-ink">{{ fmtInt(backlog.routed_pending) }}</b> na fila</template>
            aguardando disparo (desde {{ backlog.cutoff }}).
            <span v-if="backlog.shadow_mode" class="text-data-warn">Modo sombra ligado - desligue antes de disparar.</span>
          </p>
        </Panel>

        <!-- Forms sem vínculo (fallback) -->
        <Panel v-if="formsSemVinculo.length" title="Formulários sem vínculo (leads sem campanha)" icon="fas fa-list-check" :padded="false">
          <DataTable :columns="FORMS_COLUMNS" :rows="formsSemVinculo" row-key="form_id" sort-by="held_count" sort-dir="desc">
            <template #cell-name="{ row }"><span class="text-ink" :title="row.name">{{ row.name || `#${row.form_id}` }}</span></template>
            <template #actions>
              <RouterLink to="/meta?tab=formularios">
                <Button variant="secondary" size="sm" icon="fas fa-sliders">Configurar</Button>
              </RouterLink>
            </template>
          </DataTable>
        </Panel>

        </div>
      </template>

      <!-- Erro -->
      <EmptyState v-if="store.error && !ov" icon="fas fa-circle-exclamation" title="Não deu para ler os vínculos" :description="store.error">
        <template #actions>
          <Button variant="primary" size="sm" icon="fas fa-arrows-rotate" @click="reload">Tentar de novo</Button>
        </template>
      </EmptyState>

      <!-- Modal de campanha (vincular) -->
      <CampaignDetailModal v-model:open="detailOpen" :campaign-id="detailId" @saved="reload" />
      <!-- Modal da conta de anúncio (vínculo padrão) -->
      <AccountBindingModal v-model:open="accountOpen" :account="accountSel" :defaults="bindingDefaults" @saved="reload" />
  </div>

  <ConfirmDialog :open="pedindoReenvio" tone="accent"
    :title="`Reenviar ${alvoReenvio?.total || 0} lead(s) com o destino atual?`"
    :consequence="`Os ${alvoReenvio?.total || 0} lead(s) ${alvoReenvio?.label || ''} são reenviados ao CV agora com o destino ${alvoReenvio?.destino || 'do vínculo atual'} - nova conversão em cada lead, e o retorno automático re-enfileira quem está fora das etapas blindadas.`"
    hint="É upsert: nada duplica. O interesse antigo permanece no CV (remoção só pelo painel do CV)."
    :confirm-label="`Reenviar ${alvoReenvio?.total || 0}`"
    :loading="resending"
    @confirm="reenviarConfirmado" @cancel="pedindoReenvio = false" />

  <ConfirmDialog :open="pedindoEnvio" tone="accent"
    :title="`Enviar ${alvoEnvio?.total || 0} lead(s) represado(s) ao CV?`"
    :consequence="`Os ${alvoEnvio?.total || 0} lead(s) represado(s) ${alvoEnvio?.label || ''} são roteados e despachados ao CRM agora.`"
    hint="É upsert: lead que já existe no CV é atualizado, não duplicado."
    :confirm-label="`Enviar ${alvoEnvio?.total || 0}`"
    :loading="sending"
    @confirm="enviarConfirmado" @cancel="pedindoEnvio = false" />
</template>
