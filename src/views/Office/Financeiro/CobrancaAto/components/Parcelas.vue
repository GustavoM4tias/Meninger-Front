<!--
  Aba Parcelas da tela Ato (Financeiro > Cobrança > Ato).

  O ato é só a entrada. Depois dele vêm as mensais, que ficavam paradas até o
  Financeiro faturar o contrato no Sienge - meses de caixa parado e cliente sem
  boleto. Esta aba mostra o PLANO de parcelas de cada reserva (nasce com o ato
  pago, encerra quando o Sienge fatura) e o que a rodada diária fez com ele.

  Uma linha por reserva; o detalhe (parcela a parcela, boletos, ações) abre no
  modal. Mobile-first: a DataTable vira cartões no estreito.
-->
<template>
  <div class="space-y-4">

    <!-- Filtros: mesmo formato da aba Conciliação (barra recolhível). -->
    <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient">
      <div class="filters-toolbar">
        <button @click="filtersExpanded = !filtersExpanded" class="filters-toolbar-trigger">
          <i class="fas fa-filter text-xs text-ink-muted"></i>
          <span>Filtros</span>
          <Badge v-if="activeFiltersCount" variant="accent" size="sm">
            {{ activeFiltersCount }} ativo{{ activeFiltersCount > 1 ? 's' : '' }}
          </Badge>
          <i class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200"
            :class="{ 'rotate-180': filtersExpanded }"></i>
        </button>
        <div class="ml-auto flex items-center gap-1.5">
          <Button v-if="can('operate')" variant="ghost" size="sm" icon="fas fa-plus" @click="novoPlano.open = true">
            <span class="hidden sm:inline">Novo plano</span>
          </Button>
          <Button v-if="can('configure')" variant="ghost" size="sm" icon="fas fa-rotate"
            :loading="rodando" @click="rodarAgora">
            <span class="hidden sm:inline">Rodar ciclo</span>
          </Button>
          <Button variant="ghost" size="sm" icon="fas fa-eraser" @click="limpar">
            <span class="hidden sm:inline">Limpar</span>
          </Button>
          <Button size="sm" icon="fas fa-magnifying-glass" :loading="store.loading" @click="aplicar">
            <span class="hidden sm:inline">Filtrar</span>
          </Button>
        </div>
      </div>

      <div v-show="filtersExpanded" class="p-3 sm:p-4 flex flex-wrap items-end gap-3">
        <div class="flex-1 min-w-[12rem]">
          <label class="block text-micro font-medium text-ink-muted mb-1.5">Situação do plano</label>
          <MultiSelector v-model="statusLabels" :options="STATUS_OPCOES.map(o => o.label)" placeholder="Todas" />
        </div>
        <div class="flex-1 min-w-[13rem]">
          <label class="block text-micro font-medium text-ink-muted mb-1.5">Empreendimento(s)</label>
          <MultiSelector v-model="store.filtro.empreendimento" :options="empreendimentoOptions"
            placeholder="Todos" :page-size="200" />
        </div>
        <div class="flex-1 min-w-[12rem]">
          <label class="block text-micro font-medium text-ink-muted mb-1.5">Reserva ou titular</label>
          <Input v-model="store.filtro.q" placeholder="Ex.: 8050 ou Maria" @keydown.enter="aplicar" />
        </div>
        <div class="w-full pt-3 border-t border-line">
          <Switch v-model="store.filtro.comAtraso" label="Só com parcela em atraso"
            description="Mostra apenas reservas com parcela vencida sem pagamento." @change="aplicar" />
        </div>
      </div>
    </section>

    <!-- KPIs: fila de trabalho. Clicar recorta a tabela. -->
    <StatRow v-if="!carregando && store.stats" :items="kpiCards" :cols="{ sm: 2, md: 3, lg: 6 }" size="sm"
      selectable :active-key="recorte" @select="aoClicarKpi" />

    <!-- Linha de estado: última rodada e interruptor. -->
    <div class="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
      <span class="tabular-nums">
        <b class="text-ink">{{ listaRecortada.length }}</b> de {{ store.total }} plano{{ store.total === 1 ? '' : 's' }}
      </span>
      <button v-if="recorteAtivo" type="button"
        class="inline-flex items-center gap-1.5 h-7 px-2 rounded-md bg-accent-soft text-accent text-micro font-medium hover:bg-accent/15 transition-colors duration-120 focus-ring"
        @click="recorte = ''">
        só {{ recorteAtivo.label }} <i class="fas fa-xmark text-micro"></i>
      </button>
      <span v-if="store.status" class="ml-auto inline-flex items-center gap-2">
        <Badge :variant="store.status.cfg?.ativo ? 'success' : 'warning'" size="sm" dot>
          {{ store.status.cfg?.ativo ? 'Cobrança de parcelas ligada' : 'Cobrança de parcelas pausada' }}
        </Badge>
        <span v-if="store.status.ultima_rodada_em">última rodada {{ formatDateTime(store.status.ultima_rodada_em) }}</span>
        <span v-else>a rodada diária ainda não rodou</span>
      </span>
    </div>

    <div v-if="store.error"
      class="rounded-xl border border-data-neg/25 bg-data-neg/10 p-4 text-sm text-data-neg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-start gap-2 min-w-0">
        <i class="fas fa-circle-exclamation mt-0.5 shrink-0"></i>
        <span class="min-w-0">{{ store.error }}</span>
      </div>
      <Button variant="outline" size="sm" icon="fas fa-rotate-right" class="shrink-0" @click="store.refresh()">Tentar novamente</Button>
    </div>

    <div v-else-if="carregando" class="space-y-4">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <Skeleton v-for="i in 6" :key="i" variant="stat" />
      </div>
      <Skeleton variant="table" :lines="8" />
    </div>

    <template v-else>
      <DataTable :columns="COLUNAS" :rows="listaRecortada" row-key="id" manual-sort clickable density="compact"
        :sort-by="store.sortBy" :sort-dir="store.sortDir"
        @update:sortBy="v => ordenar(v, store.sortDir)" @update:sortDir="v => ordenar(store.sortBy, v)"
        more-label="Ver mais campos" empty-title="Sem planos"
        empty-text="Nenhuma reserva com plano de parcelas nos filtros atuais. O plano nasce sozinho quando o ato é pago; a rodada diária faz a adesão."
        @row-click="abrirPlano">

        <template #cell-idreserva="{ row }">
          <span class="font-mono font-semibold text-accent tabular-nums">#{{ row.idreserva }}</span>
        </template>

        <template #cell-titular_nome="{ row }">
          <span class="block min-w-0">
            <span class="block text-ink truncate">{{ row.titular_nome || '-' }}</span>
            <span class="block text-micro text-ink-subtle truncate">{{ row.empreendimento || '-' }}{{ row.unidade ? ` · ${row.unidade}` : '' }}</span>
          </span>
        </template>

        <template #cell-progresso="{ row }">
          <span class="block min-w-[7rem]">
            <span class="flex items-center justify-between text-micro tabular-nums">
              <span class="text-ink">{{ row.parcelas_pagas }}/{{ row.parcelas_total }} pagas</span>
              <span class="text-ink-subtle">{{ formatCurrency(row.valor_pago) }}</span>
            </span>
            <span class="block h-1.5 rounded-full bg-surface-sunken overflow-hidden mt-1">
              <span class="block h-full rounded-full bg-data-pos" :style="{ width: pct(row) + '%' }"></span>
            </span>
          </span>
        </template>

        <template #cell-proxima="{ row }">
          <span v-if="row.emitida_vencimento" class="block">
            <span class="text-ink">boleto vence {{ formatDate(row.emitida_vencimento) }}</span>
            <span class="block text-micro text-ink-subtle">{{ row.parcelas_emitidas }} em aberto</span>
          </span>
          <span v-else-if="row.proxima_vencimento" class="block">
            <span class="text-ink">{{ row.proxima_numero }}/{{ row.parcelas_total }} em {{ formatDate(row.proxima_vencimento) }}</span>
            <span class="block text-micro text-ink-subtle">{{ diasLabel(row.proxima_vencimento) }}</span>
          </span>
          <span v-else class="text-ink-subtle">-</span>
        </template>

        <template #cell-atraso="{ row }">
          <span v-if="Number(row.valor_atraso) > 0" class="inline-flex flex-col">
            <Badge variant="danger" size="sm">{{ row.parcelas_vencidas + row.parcelas_emitidas_vencidas + row.parcelas_previstas_vencidas }} em atraso</Badge>
            <span v-if="row.parcelas_previstas_vencidas" class="text-micro text-ink-subtle">{{ row.parcelas_previstas_vencidas }} nunca cobrada{{ row.parcelas_previstas_vencidas === 1 ? '' : 's' }}</span>
            <span class="text-micro text-data-neg tabular-nums mt-0.5">{{ formatCurrency(row.valor_atraso) }}</span>
          </span>
          <span v-else class="text-ink-subtle">-</span>
        </template>

        <template #cell-status="{ row }">
          <span class="inline-flex flex-col items-start gap-0.5">
            <Badge :variant="planoVariant(row.status)" size="sm">{{ planoLabel(row.status) }}</Badge>
            <span v-if="row.encerrado_motivo" class="text-micro text-ink-subtle">{{ motivoLabel(row.encerrado_motivo) }}</span>
            <span v-else-if="row.divergencias?.length" class="text-micro text-data-warn">
              <i class="fas fa-triangle-exclamation" style="font-size:9px"></i> condição mudou no CV
            </span>
            <span v-else-if="row.parcelas_erro" class="text-micro text-data-neg">{{ row.parcelas_erro }} com erro</span>
          </span>
        </template>

        <template #cell-sienge="{ row }">
          <Badge v-if="row.sienge_receivable_bill_id" variant="info" size="sm"><i class="fas fa-file-invoice mr-1" style="font-size:9px"></i>faturado</Badge>
          <Badge v-else-if="row.sienge_contract_id" variant="neutral" size="sm">contrato {{ row.sienge_contract_id }}</Badge>
          <span v-else class="text-ink-subtle">sem contrato</span>
        </template>

        <template #actions="{ row }">
          <IconButton icon="fas fa-up-right-and-down-left-from-center" size="sm" label="Abrir plano" @click.stop="abrirPlano(row)" />
        </template>
      </DataTable>

      <div v-if="store.planos.length < store.total" class="py-6 flex items-center justify-center gap-2 text-micro text-ink-subtle">
        <Spinner v-if="store.loadingMore" size="sm" />
        <button v-else type="button" class="underline hover:text-ink" @click="store.loadMore()">
          carregar mais {{ store.total - store.planos.length }} planos
        </button>
      </div>
    </template>

    <!-- Novo plano manual -->
    <Modal :open="novoPlano.open" title="Novo plano de parcelas" size="sm" @close="novoPlano.open = false">
      <div class="space-y-3">
        <p class="text-sm text-ink-muted">
          O plano nasce sozinho quando o ato é pago. Use isto para uma reserva que ainda não tem plano
          (ato pago por fora, por exemplo). As parcelas vêm das condições da reserva no CV.
        </p>
        <Input v-model.number="novoPlano.idreserva" type="number" label="Número da reserva (CV)" placeholder="Ex.: 8050" />
        <p v-if="novoPlano.erro" class="text-sm text-data-neg">{{ novoPlano.erro }}</p>
        <div class="flex justify-end gap-2">
          <Button variant="ghost" size="sm" @click="novoPlano.open = false">Cancelar</Button>
          <Button size="sm" icon="fas fa-plus" :loading="store.acting" :disabled="!novoPlano.idreserva" @click="criarPlano">Criar plano</Button>
        </div>
      </div>
    </Modal>

    <PlanoDetailModal :open="detail.open" :idreserva="detail.idreserva" @close="fecharPlano" @changed="store.refresh({ silent: true })" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useParcelasStore } from '@/stores/Financeiro/CobrancaAto/parcelasStore';
import { useCan } from '@/composables/useCan';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Switch from '@/components/UI/Switch.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import StatRow from '@/components/UI/StatRow.vue';
import DataTable from '@/components/UI/DataTable.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Modal from '@/components/UI/Modal.vue';
import PlanoDetailModal from './PlanoDetailModal.vue';
import { pedirConfirmacao } from '@/composables/useConfirm';
import { planoLabel, planoVariant, motivoLabel, formatCurrency, formatDate, formatDateTime, diasLabel } from './parcelasFormat';

const store = useParcelasStore();
const can = useCan('/financeiro/cobranca/ato');

const filtersExpanded = ref(false);
const STATUS_OPCOES = [
  { value: 'ativo', label: 'Ativo' }, { value: 'pausado', label: 'Pausado' },
  { value: 'encerrado', label: 'Encerrado' }, { value: 'cancelado', label: 'Cancelado' },
];
const statusLabels = computed({
  get: () => store.filtro.status.map(v => STATUS_OPCOES.find(o => o.value === v)?.label || v),
  set: (labels) => { store.filtro.status = labels.map(l => STATUS_OPCOES.find(o => o.label === l)?.value || l); },
});
const empreendimentoOptions = computed(() => (store.facets?.empreendimentos || []).map(e => e.name));
const activeFiltersCount = computed(() => {
  const f = store.filtro;
  return (f.status.length && !(f.status.length === 1 && f.status[0] === 'ativo') ? 1 : 0)
    + (f.empreendimento.length ? 1 : 0) + (f.q ? 1 : 0) + (f.comAtraso ? 1 : 0);
});

const primeiraCarga = ref(true);
const carregando = computed(() => primeiraCarga.value || store.loading);

function aplicar() { return store.refresh().finally(() => { primeiraCarga.value = false; }); }
function limpar() {
  store.filtro.status = ['ativo']; store.filtro.empreendimento = []; store.filtro.q = ''; store.filtro.comAtraso = false;
  recorte.value = '';
  aplicar();
}
function ordenar(by, dir) { store.setSort(by, dir); }

/* Recorte pelo KPI: recorta a tabela, não os cartões. */
const recorte = ref('');
const RECORTES = {
  atraso: { label: 'em atraso', teste: (r) => Number(r.valor_atraso) > 0 },
  emitidas: { label: 'com boleto em aberto', teste: (r) => r.parcelas_emitidas > 0 },
  erro: { label: 'com erro', teste: (r) => r.parcelas_erro > 0 },
  ativos: { label: 'ativos', teste: (r) => r.status === 'ativo' },
};
const recorteAtivo = computed(() => RECORTES[recorte.value] || null);
function aoClicarKpi(item) { recorte.value = (!RECORTES[item.key] || recorte.value === item.key) ? '' : item.key; }
const listaRecortada = computed(() => (recorteAtivo.value ? store.planos.filter(recorteAtivo.value.teste) : store.planos));

const kpiCards = computed(() => {
  const s = store.stats;
  if (!s) return [];
  return [
    { key: 'ativos', label: 'Planos ativos', value: s.planos.ativos, hint: `${s.planos.pausados} pausados · ${s.planos.encerrados} encerrados`, icon: 'fas fa-layer-group', tone: 'accent', tooltip: 'Reservas com cobrança de parcelas a cargo do Office' },
    { key: 'a_vencer', label: 'Vencem em 30 dias', value: s.aVencer30.qty, hint: formatCurrency(s.aVencer30.valor), icon: 'fas fa-calendar-day', tone: 2, tooltip: 'Parcelas previstas que a rodada vai emitir nos próximos 30 dias' },
    { key: 'emitidas', label: 'Boletos em aberto', value: s.emitidas.qty, hint: formatCurrency(s.emitidas.valor), icon: 'fas fa-barcode', tone: 'neutral', tooltip: 'Parcelas com boleto emitido aguardando pagamento. Clique para recortar' },
    { key: 'atraso', label: 'Em atraso', value: s.atraso.qty, hint: `${formatCurrency(s.atraso.valor)}${s.atraso.nuncaCobradas ? ` · ${s.atraso.nuncaCobradas} nunca cobradas` : ''}`, icon: 'fas fa-triangle-exclamation', tone: 'neg', tooltip: 'Parcelas vencidas sem pagamento, inclusive as que passaram do vencimento sem nunca terem sido cobradas. Clique para recortar' },
    { key: 'pagas30', label: 'Pagas (30 dias)', value: s.pagas30.qty, hint: `${formatCurrency(s.pagas30.valor)} · ${s.pagas.qty} no total`, icon: 'fas fa-circle-check', tone: 'pos', tooltip: 'Parcelas pagas nos últimos 30 dias' },
    { key: 'erro', label: 'Com erro', value: s.erro.qty, hint: `${s.transferidas.qty} transferidas ao Sienge`, icon: 'fas fa-bug', tone: s.erro.qty ? 'neg' : 'neutral', tooltip: 'Parcelas cuja emissão falhou. Clique para recortar' },
  ];
});

const pct = (r) => (r.parcelas_total ? Math.round((r.parcelas_pagas / r.parcelas_total) * 100) : 0);

const COLUNAS = [
  { key: 'idreserva', label: '#Reserva', priority: 1, sortable: true, width: '7rem' },
  { key: 'titular_nome', label: 'Titular / Empreendimento', priority: 1, sortable: true },
  { key: 'progresso', label: 'Pagas', priority: 2, width: '10rem' },
  { key: 'proxima', label: 'Próxima cobrança', priority: 1, sortable: true, width: '11rem' },
  { key: 'atraso', label: 'Atraso', priority: 1, sortable: true, width: '8rem' },
  { key: 'status', label: 'Plano', priority: 2, sortable: true, width: '9rem' },
  { key: 'sienge', label: 'Sienge', priority: 3, width: '8rem' },
];

// ── Modal do plano ────────────────────────────────────────────────────────────
const detail = ref({ open: false, idreserva: null });
function abrirPlano(row) { detail.value = { open: true, idreserva: row.idreserva }; }
function fecharPlano() { detail.value = { open: false, idreserva: null }; store.refresh({ silent: true }); }

// ── Novo plano manual ─────────────────────────────────────────────────────────
const novoPlano = ref({ open: false, idreserva: null, erro: null });
async function criarPlano() {
  novoPlano.value.erro = null;
  try {
    await store.criarPlano(novoPlano.value.idreserva);
    const id = novoPlano.value.idreserva;
    novoPlano.value = { open: false, idreserva: null, erro: null };
    await store.refresh();
    abrirPlano({ idreserva: id });
  } catch (e) {
    novoPlano.value.erro = e.message || 'Falha ao criar o plano.';
  }
}

// ── Rodar ciclo agora (configure) ─────────────────────────────────────────────
const rodando = ref(false);
async function rodarAgora() {
  const ligado = store.status?.cfg?.ativo;
  const ok = await pedirConfirmacao({
    title: 'Rodar o ciclo de parcelas agora?',
    consequence: ligado
      ? 'Faz a adesão das reservas com ato pago, encerra os planos que o Sienge já faturou e EMITE os boletos das parcelas que vencem dentro da antecedência configurada (e reemite as vencidas, com encargos). Cada boleto sai para o cliente por e-mail e WhatsApp.'
      : 'A cobrança de parcelas está pausada: a rodada só faz a adesão dos planos e os encerramentos. Nenhum boleto é emitido.',
    confirmLabel: 'Rodar agora', tone: ligado ? 'danger' : 'primary',
  });
  if (!ok) return;
  rodando.value = true;
  try {
    await store.rodarCiclo();
    setTimeout(() => { store.refresh({ silent: true }); store.fetchStatus(); rodando.value = false; }, 8000);
  } catch { rodando.value = false; }
}

onMounted(async () => {
  await Promise.allSettled([store.fetchFacets(), store.fetchStatus()]);
  await aplicar();
});
</script>
