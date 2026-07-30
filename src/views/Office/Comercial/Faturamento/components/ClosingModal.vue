<script setup>
// Consolidação (fechamento mensal) do Faturamento — modal ADMIN dentro do
// próprio dashboard.
//
// Os números congelados são calculados pelo MESMO motor da tela
// (contractsStore) com TODAS as regras carregadas (composição de VGV,
// comissão, satélite de TR, ocultos) — por isso o modal garante o fetchAll
// das regras antes de calcular e, ao terminar, restaura os filtros que o
// usuário tinha no dashboard.
import { ref, computed, watch } from 'vue';
import dayjs from 'dayjs';
import API_URL from '@/config/apiUrl';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useHiddenEnterprisesStore } from '@/stores/Comercial/Contracts/hiddenEnterprisesStore';
import { useStageCommissionRulesStore } from '@/stores/Comercial/Contracts/stageCommissionRulesStore';
import { useEnterpriseValueRulesStore } from '@/stores/Comercial/Contracts/enterpriseValueRulesStore';
import { useTrSatelliteStore } from '@/stores/Comercial/Contracts/trSatelliteStore';

import Modal from '@/components/UI/Modal.vue';
import Surface from '@/components/UI/Surface.vue';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const props = defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(['close']);

const contractsStore = useContractsStore();
const hiddenStore = useHiddenEnterprisesStore();
const commissionRulesStore = useStageCommissionRulesStore();
const valueRulesStore = useEnterpriseValueRulesStore();
const trSatStore = useTrSatelliteStore();

const isAdmin = computed(() => {
  try { return localStorage.getItem('role') === 'admin'; } catch { return false; }
});

const loading = ref(false);
const closings = ref([]);
const expanded = ref(null);
const detail = ref(null);
const detailLoading = ref(false);
const savingPeriod = ref(null);
const checkingNow = ref(false);
const error = ref(null);

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const formatCurrency = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
const formatDateTime = (v) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—');

// Intl e não dayjs: o projeto não carrega o locale pt-br do dayjs, então
// `format('MMMM')` saía em inglês ("January de 2026").
const mesFmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const monthLabel = (period) => {
  const [y, m] = period.split('-').map(Number);
  const s = mesFmt.format(new Date(y, m - 1, 1));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// ── Período exibido ────────────────────────────────────────────────────────
// Antes a lista era fixa em 18 meses para trás, o que fazia aparecer um
// "fevereiro de 2025" sem explicação. Agora o admin escolhe o intervalo, e o
// padrão é o ano corrente inteiro. Só mês/ano: o fechamento é mensal, não
// existe recorte por dia.
const anoAtual = new Date().getFullYear();
const filtroDe = ref(`${anoAtual}-01`);
const filtroAte = ref(`${anoAtual}-12`);

const periodoInvalido = computed(() => filtroDe.value > filtroAte.value);

function resetPeriodo() {
  filtroDe.value = `${anoAtual}-01`;
  filtroAte.value = `${anoAtual}-12`;
}

const months = computed(() => {
  if (periodoInvalido.value) return [];
  const byPeriod = new Map(closings.value.map((c) => [c.period, c]));
  const atual = dayjs().format('YYYY-MM');
  const out = [];
  let cursor = dayjs(`${filtroAte.value}-01`);
  const limite = dayjs(`${filtroDe.value}-01`);
  // do mais recente para o mais antigo, teto de 60 meses por segurança
  for (let i = 0; i < 60 && !cursor.isBefore(limite, 'month'); i++) {
    const period = cursor.format('YYYY-MM');
    out.push({ period, closing: byPeriod.get(period) || null, isCurrent: period === atual });
    cursor = cursor.subtract(1, 'month');
  }
  return out;
});

const resumoPeriodo = computed(() => {
  const consolidados = months.value.filter((m) => m.closing).length;
  return { total: months.value.length, consolidados, abertos: months.value.length - consolidados };
});

async function loadClosings() {
  loading.value = true;
  error.value = null;
  try {
    const res = await fetch(`${API_URL}/sales-closings`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    const data = await res.json();
    closings.value = Array.isArray(data.results) ? data.results : [];
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function toggleExpand(period) {
  if (expanded.value === period) { expanded.value = null; detail.value = null; return; }
  expanded.value = period;
  detail.value = null;
  detailLoading.value = true;
  try {
    const res = await fetch(`${API_URL}/sales-closings/${period}`, { headers: authHeaders() });
    detail.value = res.ok ? await res.json() : null;
  } catch { detail.value = null; }
  finally { detailLoading.value = false; }
}

// ── Consolidar: mesmo motor do dashboard, regras garantidas ─────────────────
function buildLinesFromStore() {
  const sales = (contractsStore.uniqueSales || [])
    .filter((s) => (s.contracts || []).some((c) => !c._projection));
  return sales.map((s) => {
    const first = (s.contracts || []).find((c) => !c._projection) || {};
    return {
      contract_ids: (s.contracts || []).filter((c) => !c._projection).map((c) => c.contract_id),
      customer_id: s.customer_id ?? first.customer_id ?? null,
      customer_name: s.customer_name ?? first.customer_name ?? null,
      unit_name: s.unit_name ?? first.unit_name ?? null,
      enterprise_id: first.enterprise_id ?? null,
      enterprise_name: first.enterprise_name ?? null,
      company_id: first.company_id ?? null,
      company_name: first.company_name ?? null,
      date: s.financial_institution_date ?? first.financial_institution_date ?? null,
      value_net: Number(s.total_value_net) || 0,
      value_gross: Number(s.total_value_gross) || 0,
      distratada: contractsStore.saleIsDistrato(s),
    };
  });
}

function aggregateLines(lines, idKey, nameKey) {
  const map = new Map();
  for (const l of lines) {
    const key = `${l[idKey] ?? 'null'}`;
    const row = map.get(key) || { id: l[idKey] ?? null, name: l[nameKey] ?? '—', count: 0, vgv_net: 0, vgv_gross: 0 };
    row.count += 1;
    row.vgv_net += l.value_net;
    row.vgv_gross += l.value_gross;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.vgv_net - a.vgv_net);
}

// ── Confirmação em dois passos ─────────────────────────────────────────────
// Calcula primeiro e só então pergunta, mostrando o que vai ser gravado (e,
// na reconsolidação, o que será substituído). Substituir número oficial no
// escuro, por um window.confirm genérico, era pedir erro.
const pendente = ref(null);      // { period, lines, totals, isRedo, atual }
const confirmOpen = ref(false);
const gravando = ref(false);

async function handleConsolidate(period, isRedo) {
  savingPeriod.value = period;
  error.value = null;

  // Guarda o estado do dashboard para devolver exatamente como estava.
  const prevFilters = { ...contractsStore.filters };
  const prevGroups = [...contractsStore.selectedGroupIds];

  try {
    // As regras de dinheiro moram em stores próprias — sem elas o cálculo sai
    // errado (comissão/composição não aplicadas). fetchAll é cacheado.
    await Promise.all([
      valueRulesStore.fetchAll(),
      commissionRulesStore.fetchAll(),
      trSatStore.fetchAll(),
      hiddenStore.fetchAll(),
    ]);

    // Mês inteiro, sem filtro de empresa, sem projeções.
    contractsStore.setSelectedGroups([]);
    contractsStore.setFilters({
      startDate: `${period}-01`,
      endDate: dayjs(`${period}-01`).endOf('month').format('YYYY-MM-DD'),
      situation: 'Emitido',
      companyIds: [],
      enterpriseName: [],
    });
    await contractsStore.fetchContracts({ force: true });

    const lines = buildLinesFromStore();
    if (!lines.length) throw new Error('Nenhuma venda encontrada no mês — nada para consolidar.');

    const totals = {
      count: lines.length,
      vgv_net: lines.reduce((a, l) => a + l.value_net, 0),
      vgv_gross: lines.reduce((a, l) => a + l.value_gross, 0),
      distratadas: lines.filter((l) => l.distratada).length,
      by_enterprise: aggregateLines(lines, 'enterprise_id', 'enterprise_name'),
      by_company: aggregateLines(lines, 'company_id', 'company_name'),
    };

    // Trava de sanidade: o que vamos congelar TEM de ser idêntico ao que os
    // cartões do dashboard mostram. Já aconteceu de o cálculo rodar sem as
    // regras de comissão carregadas e gravar um VGV menor (R$ 71.722,28 a
    // menos em jan/2026, justo o uplift do Verona). Divergiu? Não grava.
    const ref = contractsStore.metrics;
    const drift = Math.abs((Number(ref.totalValueNet) || 0) - totals.vgv_net);
    if (ref.totalSales !== totals.count || drift > 0.01) {
      throw new Error(
        `Conferência falhou: o dashboard calcula ${ref.totalSales} venda(s) / ` +
        `${formatCurrency(ref.totalValueNet)} e o fechamento montou ${totals.count} / ` +
        `${formatCurrency(totals.vgv_net)}. Nada foi consolidado. Recarregue a tela e tente de novo.`
      );
    }

    // Nada é gravado aqui: mostramos o resultado e esperamos a confirmação.
    pendente.value = {
      period, lines, totals, isRedo,
      atual: closings.value.find((c) => c.period === period) || null,
    };
    confirmOpen.value = true;
  } catch (e) {
    error.value = e.message;
  } finally {
    savingPeriod.value = null;
    // Devolve o dashboard como o usuário deixou.
    contractsStore.setFilters(prevFilters);
    contractsStore.setSelectedGroups(prevGroups);
    await contractsStore.fetchContracts({ force: true });
  }
}

async function confirmarConsolidacao() {
  if (!pendente.value || gravando.value) return;
  const { period, lines, totals } = pendente.value;
  gravando.value = true;
  error.value = null;
  try {
    const res = await fetch(`${API_URL}/sales-closings/${period}/consolidate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ lines, totals }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Erro ${res.status}`);
    }
    confirmOpen.value = false;
    pendente.value = null;
    await loadClosings();
    if (expanded.value === period) { expanded.value = null; await toggleExpand(period); }
  } catch (e) {
    error.value = e.message;
  } finally {
    gravando.value = false;
  }
}

function cancelarConsolidacao() {
  confirmOpen.value = false;
  pendente.value = null;
}

// Diferença entre o que está congelado e o que será gravado (só na reconsolidação)
const delta = computed(() => {
  const p = pendente.value;
  if (!p?.atual?.totals) return null;
  const a = p.atual.totals, n = p.totals;
  return {
    count: (n.count || 0) - (a.count || 0),
    vgv: (n.vgv_net || 0) - (a.vgv_net || 0),
  };
});

async function handleCheckNow() {
  checkingNow.value = true;
  try {
    const res = await fetch(`${API_URL}/sales-closings/check-divergences/run`, {
      method: 'POST', headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    window.alert(`Vigilância executada: ${data.checked} mês(es) conferido(s), ${data.newDivergences} divergência(s) nova(s).`);
    await loadClosings();
    if (expanded.value) { const p = expanded.value; expanded.value = null; await toggleExpand(p); }
  } catch (e) {
    window.alert(e.message || 'Erro ao verificar divergências.');
  } finally {
    checkingNow.value = false;
  }
}

async function handleReview(div) {
  if (!window.confirm('Marcar esta divergência como revisada? Ela sai da lista de pendências (o consolidado não muda).')) return;
  try {
    const res = await fetch(`${API_URL}/sales-closings/divergences/${div.id}/review`, {
      method: 'POST', headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    if (detail.value) {
      detail.value.divergences = detail.value.divergences.map((d) =>
        d.id === div.id ? { ...d, status: 'reviewed' } : d);
    }
    await loadClosings();
  } catch (e) {
    window.alert(e.message || 'Erro ao revisar.');
  }
}

const KIND_LABEL = {
  contract_changed: 'Campo alterado',
  contract_added: 'Contrato entrou no mês',
  contract_removed: 'Contrato saiu do mês',
  rules_changed: 'Regras alteradas',
};
const FIELD_LABEL = {
  situation: 'Situação',
  financial_institution_date: 'Data da inst. financeira',
  cancellation_date: 'Data de cancelamento',
  enterprise_id: 'Empreendimento (id)',
  enterprise_name: 'Empreendimento',
  company_id: 'Empresa (id)',
  land_value: 'Valor do terreno',
  conditions_fingerprint: 'Condições de pagamento (valores)',
  customer_id: 'Cliente (id)',
  customer_name: 'Cliente',
  unit_name: 'Unidade',
  enterprise_value_rules: 'Composição de VGV',
  stage_commission_rules: 'Comissão',
  tr_satellite_enterprises: 'Satélite de TR',
  hidden_dashboard_enterprises: 'Empreendimentos ocultos',
  enterprise_erp_links: 'Vínculo CV ↔ Sienge',
};

const STATUS_LABEL = {
  reviewed: 'revisada',
  reconsolidated: 'reconsolidado',
  false_positive: 'falso positivo',
  self_resolved: 'normalizou sozinha',
};

// Histórico completo: versão vigente no topo + anteriores, com autor e valores.
// (`history` guarda só as substituídas; a atual mora nas colunas do fechamento.)
const versoes = computed(() => {
  const d = detail.value;
  if (!d) return [];
  const atual = {
    version: d.version,
    consolidated_at: d.consolidated_at,
    consolidated_by_name: d.consolidated_by_name,
    totals: d.totals,
    vigente: true,
  };
  const antigas = [...(d.history || [])]
    .map((h) => ({ ...h, vigente: false }))
    .sort((a, b) => (b.version || 0) - (a.version || 0));
  return [atual, ...antigas];
});

const openDivergences = computed(() =>
  (detail.value?.divergences || []).filter((d) => d.status === 'open'));
const reviewedDivergences = computed(() =>
  (detail.value?.divergences || []).filter((d) => d.status !== 'open'));

watch(() => props.open, async (isOpen) => {
  if (!isOpen) return;
  expanded.value = null;
  detail.value = null;
  await loadClosings();
});

const closeModal = () => emit('close');
</script>

<template>
  <Modal :open="open" size="xl" title="Consolidação de vendas"
    subtitle="Congele o resultado oficial de cada mês; mudanças posteriores viram divergências listadas aqui"
    @close="closeModal">

    <div class="space-y-3">

      <div class="rounded-xl border border-accent/30 bg-accent-soft p-3 text-xs text-ink-muted flex items-start gap-2">
        <i class="fas fa-circle-info text-accent mt-0.5 shrink-0"></i>
        <span>
          Consolidar congela os números do dashboard (mês inteiro, sem filtros) como
          <strong class="text-ink">fonte oficial</strong> — é o que a Eme responde. Todo dia o sistema
          confere os meses fechados: qualquer mudança nos dados de origem vira divergência aqui
          e notifica os admins, <strong class="text-ink">sem alterar o consolidado</strong>.
        </span>
      </div>

      <div v-if="error"
        class="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
        <i class="fas fa-circle-exclamation"></i>{{ error }}
      </div>

      <!-- Período exibido (mês/ano; o fechamento é mensal) -->
      <div class="rounded-xl border border-line bg-surface-sunken px-3 py-2.5 flex items-end gap-3 flex-wrap">
        <div>
          <label class="block text-[11px] font-medium text-ink-muted mb-1">
            <i class="far fa-calendar text-[10px] mr-1 text-ink-subtle"></i>De
          </label>
          <input v-model="filtroDe" type="month"
            class="rounded-lg border border-line bg-surface-raised px-2 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/40" />
        </div>
        <div>
          <label class="block text-[11px] font-medium text-ink-muted mb-1">Até</label>
          <input v-model="filtroAte" type="month"
            class="rounded-lg border border-line bg-surface-raised px-2 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/40" />
        </div>
        <Button variant="ghost" size="sm" icon="fas fa-rotate-left" @click="resetPeriodo">
          Ano atual
        </Button>
        <p v-if="periodoInvalido" class="text-[11px] text-red-500 ml-auto">
          O mês inicial está depois do final.
        </p>
        <p v-else class="text-[11px] text-ink-subtle ml-auto font-mono">
          {{ resumoPeriodo.total }} mês(es) ·
          <span class="text-emerald-600 dark:text-emerald-400">{{ resumoPeriodo.consolidados }} consolidado(s)</span> ·
          {{ resumoPeriodo.abertos }} aberto(s)
        </p>
      </div>

      <div v-if="loading" class="py-10 flex flex-col items-center gap-3 text-ink-muted">
        <Spinner size="lg" />
        <p class="text-sm">Carregando fechamentos...</p>
      </div>

      <EmptyState v-else-if="!months.length"
        size="sm" icon="far fa-calendar"
        title="Nenhum mês no período"
        description="Ajuste o intervalo acima para ver os meses." />

      <div v-else class="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
        <Surface v-for="m in months" :key="m.period" variant="raised" padding="none" class="overflow-hidden">

          <!-- Linha do mês -->
          <div class="px-3 sm:px-4 py-3 flex items-center gap-3 flex-wrap cursor-pointer hover:bg-surface-hover transition-colors"
            @click="m.closing ? toggleExpand(m.period) : null">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-ink capitalize flex items-center gap-2 flex-wrap">
                {{ monthLabel(m.period) }}
                <Badge v-if="m.isCurrent" variant="neutral" size="sm">mês corrente</Badge>
                <Badge v-if="m.closing" variant="success" size="sm">
                  <i class="fas fa-lock text-[9px]"></i>Consolidado v{{ m.closing.version }}
                </Badge>
                <Badge v-else variant="warning" size="sm">
                  <i class="fas fa-lock-open text-[9px]"></i>Aberto
                </Badge>
                <Badge v-if="m.closing?.open_divergences" variant="danger" size="sm"
                  v-tippy="'Mudanças detectadas nos dados de origem depois do fechamento'">
                  <i class="fas fa-triangle-exclamation text-[9px]"></i>
                  {{ m.closing.open_divergences }} divergência(s)
                </Badge>
              </p>
              <p v-if="m.closing" class="text-[11px] text-ink-muted font-mono mt-0.5">
                {{ m.closing.totals?.count ?? '—' }} venda(s) ·
                {{ formatCurrency(m.closing.totals?.vgv_net) }} ·
                fechado em {{ formatDateTime(m.closing.consolidated_at) }}
                <span v-if="m.closing.consolidated_by_name">por {{ m.closing.consolidated_by_name }}</span>
              </p>
              <p v-else class="text-[11px] text-ink-subtle mt-0.5">
                Sem fechamento — a Eme trata este mês como parcial.
              </p>
            </div>

            <div class="flex items-center gap-1.5 shrink-0" @click.stop>
              <Button v-if="isAdmin" size="sm"
                :variant="m.closing ? 'outline' : 'primary'"
                :icon="savingPeriod === m.period ? 'fas fa-circle-notch fa-spin' : (m.closing ? 'fas fa-rotate' : 'fas fa-lock')"
                :disabled="savingPeriod !== null"
                @click="handleConsolidate(m.period, !!m.closing)">
                {{ savingPeriod === m.period ? 'Calculando...' : (m.closing ? 'Reconsolidar' : 'Consolidar') }}
              </Button>
              <i v-if="m.closing" class="fas fa-chevron-down text-xs text-ink-subtle transition-transform ml-1"
                :class="{ 'rotate-180': expanded === m.period }" @click="toggleExpand(m.period)"></i>
            </div>
          </div>

          <!-- Detalhe do fechamento -->
          <div v-if="expanded === m.period" class="border-t border-line bg-surface-sunken/40">
            <div v-if="detailLoading" class="p-4 flex items-center gap-2 text-xs text-ink-muted">
              <Spinner size="sm" /> Carregando detalhe...
            </div>

            <div v-else-if="detail" class="p-3 sm:p-4 space-y-4">

              <!-- Totais por empreendimento -->
              <div>
                <h4 class="text-xs font-semibold text-ink mb-2">
                  <i class="fas fa-building text-[10px] mr-1 text-ink-subtle"></i>Por empreendimento (congelado)
                </h4>
                <div class="rounded-lg border border-line bg-surface-raised divide-y divide-line max-h-56 overflow-y-auto">
                  <div v-for="e in (detail.totals?.by_enterprise || [])" :key="`${e.id}`"
                    class="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                    <span class="min-w-0 truncate text-ink">
                      <span class="font-mono text-ink-subtle">{{ e.id }}</span> - {{ e.name }}
                    </span>
                    <span class="shrink-0 font-mono tabular-nums text-ink-muted">
                      {{ e.count }}v · <span class="text-emerald-600 dark:text-emerald-400 font-semibold">{{ formatCurrency(e.vgv_net) }}</span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Divergências -->
              <div>
                <h4 class="text-xs font-semibold text-ink mb-2 flex items-center gap-2">
                  <i class="fas fa-triangle-exclamation text-[10px] text-amber-500"></i>
                  Divergências detectadas depois do fechamento
                  <Badge v-if="openDivergences.length" variant="danger" size="sm">{{ openDivergences.length }} aberta(s)</Badge>
                </h4>

                <EmptyState v-if="!openDivergences.length && !reviewedDivergences.length"
                  size="sm" icon="fas fa-shield-check"
                  title="Nenhuma divergência"
                  description="Os dados de origem continuam idênticos ao momento do fechamento." />

                <ul v-else class="rounded-lg border border-line bg-surface-raised divide-y divide-line">
                  <li v-for="d in [...openDivergences, ...reviewedDivergences]" :key="d.id"
                    class="px-3 py-2.5 flex items-start justify-between gap-2"
                    :class="d.status === 'open' ? 'bg-red-500/5' : 'opacity-60'">
                    <div class="min-w-0 text-xs">
                      <p class="font-medium text-ink">
                        {{ KIND_LABEL[d.kind] || d.kind }}
                        <span v-if="d.contract_id" class="font-mono text-ink-subtle">· contrato {{ d.contract_id }}</span>
                        <span v-if="d.field" class="text-ink-muted">· {{ FIELD_LABEL[d.field] || d.field }}</span>
                      </p>
                      <p v-if="d.old_value != null || d.new_value != null" class="font-mono text-[11px] text-ink-muted mt-0.5">
                        {{ d.old_value ?? '—' }} <i class="fas fa-arrow-right text-[8px] mx-1"></i> {{ d.new_value ?? '—' }}
                      </p>
                      <p v-if="d.details?.customer_name || d.details?.unit_name" class="text-[11px] text-ink-subtle mt-0.5 truncate">
                        {{ d.details?.customer_name }} <span v-if="d.details?.unit_name">· {{ d.details.unit_name }}</span>
                        <span v-if="d.details?.enterprise_name">· {{ d.details.enterprise_name }}</span>
                      </p>
                      <p v-if="d.details?.why" class="text-[11px] text-ink-subtle mt-0.5">{{ d.details.why }}</p>
                      <p class="text-[10px] text-ink-subtle font-mono mt-0.5">detectada em {{ formatDateTime(d.detected_at) }}</p>
                    </div>
                    <Button v-if="isAdmin && d.status === 'open'" variant="ghost" size="sm" icon="fas fa-check"
                      class="shrink-0" v-tippy="'Marcar como revisada (não altera o consolidado)'"
                      @click="handleReview(d)" />
                    <Badge v-else-if="d.status !== 'open'" variant="neutral" size="sm" class="shrink-0">
                      {{ STATUS_LABEL[d.status] || d.status }}
                    </Badge>
                  </li>
                </ul>
              </div>

              <!-- Histórico de versões: quem consolidou, quando e com que números -->
              <div>
                <h4 class="text-xs font-semibold text-ink mb-2 flex items-center gap-2">
                  <i class="fas fa-clock-rotate-left text-[10px] text-ink-subtle"></i>
                  Histórico de versões
                  <Badge variant="neutral" size="sm">{{ versoes.length }}</Badge>
                </h4>
                <ul class="rounded-lg border border-line bg-surface-raised divide-y divide-line">
                  <li v-for="v in versoes" :key="v.version"
                    class="px-3 py-2.5 flex items-start justify-between gap-2"
                    :class="v.vigente ? 'bg-emerald-500/5' : ''">
                    <div class="min-w-0">
                      <p class="text-xs font-medium text-ink flex items-center gap-1.5 flex-wrap">
                        <span class="font-mono">v{{ v.version }}</span>
                        <Badge v-if="v.vigente" variant="success" size="sm">vigente</Badge>
                        <span v-else class="text-ink-subtle">substituída</span>
                      </p>
                      <p class="text-[11px] text-ink-muted font-mono mt-0.5">
                        {{ v.totals?.count ?? '—' }} venda(s) ·
                        <span class="text-emerald-600 dark:text-emerald-400 font-semibold">{{ formatCurrency(v.totals?.vgv_net) }}</span>
                        <span v-if="v.totals?.vgv_gross"> · VGV+DC {{ formatCurrency(v.totals.vgv_gross) }}</span>
                      </p>
                    </div>
                    <div class="text-right shrink-0">
                      <p class="text-[11px] text-ink">{{ v.consolidated_by_name || 'autor não registrado' }}</p>
                      <p class="text-[10px] text-ink-subtle font-mono">{{ formatDateTime(v.consolidated_at) }}</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Surface>
      </div>
    </div>

    <template #footer>
      <p class="text-[10px] text-ink-subtle leading-tight mr-auto hidden sm:block">
        A vigilância roda todo dia após o sync de contratos.<br>
        Reconsolidar versiona a anterior e resolve as divergências abertas.
      </p>
      <Button v-if="isAdmin" variant="outline" size="sm"
        :icon="checkingNow ? 'fas fa-circle-notch fa-spin' : 'fas fa-magnifying-glass-chart'"
        :disabled="checkingNow" @click="handleCheckNow">
        {{ checkingNow ? 'Verificando...' : 'Verificar divergências agora' }}
      </Button>
      <Button variant="ghost" @click="closeModal">Fechar</Button>
    </template>
  </Modal>

  <!-- Confirmação: mostra o que será gravado antes de substituir o oficial -->
  <Modal :open="confirmOpen" size="md" :z-index="10000"
    :title="pendente?.isRedo ? 'Substituir a consolidação?' : 'Consolidar o mês?'"
    :subtitle="pendente ? monthLabel(pendente.period) : ''"
    @close="cancelarConsolidacao">
    <div v-if="pendente" class="space-y-3">

      <div class="rounded-xl px-3 py-2.5 text-xs flex items-start gap-2"
        :class="pendente.isRedo
          ? 'border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          : 'border border-accent/30 bg-accent-soft text-ink-muted'">
        <i class="fas fa-triangle-exclamation mt-0.5 shrink-0"></i>
        <span v-if="pendente.isRedo">
          Os números oficiais de <strong>{{ monthLabel(pendente.period) }}</strong> serão
          <strong>substituídos</strong> pelos valores abaixo. A versão atual (v{{ pendente.atual?.version }})
          vai para o histórico e as divergências abertas são encerradas pelo novo snapshot.
        </span>
        <span v-else>
          Os valores abaixo serão <strong class="text-ink">congelados como oficiais</strong> e passam a ser
          a resposta da Eme para este mês.
        </span>
      </div>

      <!-- Comparativo -->
      <div class="rounded-lg border border-line overflow-hidden">
        <div v-if="pendente.isRedo && pendente.atual"
          class="px-3 py-2 bg-surface-sunken flex items-center justify-between gap-2 text-xs">
          <span class="text-ink-muted">Congelado hoje (v{{ pendente.atual.version }})</span>
          <span class="font-mono tabular-nums text-ink-muted">
            {{ pendente.atual.totals?.count ?? '—' }} venda(s) · {{ formatCurrency(pendente.atual.totals?.vgv_net) }}
          </span>
        </div>
        <div class="px-3 py-2 bg-surface-raised flex items-center justify-between gap-2 text-xs">
          <span class="text-ink font-medium">
            {{ pendente.isRedo ? `Vai gravar (v${(pendente.atual?.version || 0) + 1})` : 'Vai gravar (v1)' }}
          </span>
          <span class="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
            {{ pendente.totals.count }} venda(s) · {{ formatCurrency(pendente.totals.vgv_net) }}
          </span>
        </div>
        <div v-if="delta && (delta.count !== 0 || Math.abs(delta.vgv) > 0.01)"
          class="px-3 py-2 bg-surface-sunken border-t border-line flex items-center justify-between gap-2 text-xs">
          <span class="text-ink-muted">Diferença</span>
          <span class="font-mono tabular-nums font-semibold"
            :class="delta.vgv >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'">
            {{ delta.count >= 0 ? '+' : '' }}{{ delta.count }} venda(s) ·
            {{ delta.vgv >= 0 ? '+' : '' }}{{ formatCurrency(delta.vgv) }}
          </span>
        </div>
        <div v-else-if="delta" class="px-3 py-2 bg-surface-sunken border-t border-line text-xs text-ink-subtle">
          Sem diferença nos totais — só o snapshot dos dados de origem é renovado.
        </div>
      </div>

      <p class="text-[11px] text-ink-subtle">
        VGV+DC: {{ formatCurrency(pendente.totals.vgv_gross) }}
        <span v-if="pendente.totals.distratadas"> · {{ pendente.totals.distratadas }} venda(s) distratada(s) depois (contam no período)</span>
      </p>

      <div v-if="error"
        class="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
        {{ error }}
      </div>
    </div>

    <template #footer>
      <Button variant="ghost" :disabled="gravando" @click="cancelarConsolidacao">Cancelar</Button>
      <Button :icon="gravando ? 'fas fa-circle-notch fa-spin' : (pendente?.isRedo ? 'fas fa-rotate' : 'fas fa-lock')"
        :class="pendente?.isRedo ? '!bg-amber-500 hover:!bg-amber-600' : ''"
        :disabled="gravando" @click="confirmarConsolidacao">
        {{ gravando ? 'Gravando...' : (pendente?.isRedo ? 'Substituir' : 'Consolidar') }}
      </Button>
    </template>
  </Modal>
</template>
