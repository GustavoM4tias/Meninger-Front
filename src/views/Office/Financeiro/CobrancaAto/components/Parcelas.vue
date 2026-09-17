<!--
  Aba Parcelas da tela Ato e Parcelas (Financeiro > Cobrança).

  O ato é só a entrada. Depois dele vêm as mensais, que ficavam paradas até o
  Financeiro faturar o contrato no Sienge - meses de caixa parado e cliente sem
  boleto. Esta aba mostra o PLANO de parcelas de cada reserva (nasce com o ato
  pago, encerra quando o Sienge fatura) e o que a rodada diária fez com ele.

  Uma linha por reserva; o detalhe (parcela a parcela, boletos, ações) abre no
  modal. Mobile-first: a DataTable vira cartões no estreito.
-->
<template>
  <div class="space-y-4">

    <!-- Era a casca de filtro copiada da aba Conciliação (`.filters-toolbar` +
         colapso + selo de ativos, tudo à mão). Virou o primitivo `FilterBar`,
         o mesmo da aba Histórico: altura fixa na barra (a página não pula
         quando o selo "N ativos" aparece), começa fechada no celular e a grade
         de campos já vem responsiva. "Novo plano" e "Rodar ciclo" são ações da
         tela, não filtros, então vão no slot de ações. -->
    <FilterBar title="Filtros dos planos" :active-count="activeFiltersCount" :cols="3"
      :loading="store.loading" @apply="aplicar" @clear="limpar">

      <template #actions>
        <Button v-if="can('operate')" variant="ghost" size="sm" icon="fas fa-plus"
          @click="novoPlano.open = true">
          <span class="hidden sm:inline">Novo plano</span>
        </Button>
        <Button v-if="can('configure')" variant="ghost" size="sm" icon="fas fa-rotate"
          :loading="rodando" @click="rodarAgora">
          <span class="hidden sm:inline">Rodar ciclo</span>
        </Button>
      </template>

      <div>
        <label class="block text-xs font-medium text-ink-muted mb-1.5">Situação do plano</label>
        <MultiSelector v-model="statusLabels" :options="STATUS_OPCOES.map(o => o.label)"
          placeholder="Todas" />
      </div>

      <div>
        <label class="block text-xs font-medium text-ink-muted mb-1.5">Empreendimento(s)</label>
        <MultiSelector v-model="store.filtro.empreendimento" :options="empreendimentoOptions"
          placeholder="Todos" :page-size="200" />
      </div>

      <Input v-model="store.filtro.q" label="Reserva ou titular"
        icon-left="fas fa-magnifying-glass"
        placeholder="Ex.: 8050 ou Maria" @keydown.enter="aplicar" />

      <!-- Emitido de/até e pago de/até: o mesmo bloco da aba Histórico. Vazio, a
           lista não recorta por data (é fila de trabalho); os cartões e a coluna
           "No período" ficam em 30 dias. -->
      <PeriodoFilter v-model="store.filtro.periodo" span="sm:col-span-2 lg:col-span-3" @change="aplicarComFolga" />

      <!-- Ocupa a linha inteira: é um interruptor, não um campo, e dividindo
           coluna com um seletor ficava com metade da largura do seu texto. -->
      <div class="sm:col-span-2 lg:col-span-3 pt-1 border-t border-line-subtle">
        <Switch v-model="store.filtro.comAtraso" label="Só com parcela em atraso"
          description="Mostra apenas reservas com parcela vencida sem pagamento." @change="aplicar" />
      </div>
    </FilterBar>

    <!-- KPIs: fila de trabalho. Clicar recorta a tabela. -->
    <StatRow v-if="!carregando && store.stats" :items="kpiCards" :cols="{ sm: 2, md: 4, lg: 7 }" size="sm"
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
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
        <Skeleton v-for="i in 7" :key="i" variant="stat" />
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

        <!-- O que saiu e o que entrou deste plano no período (o da tela ou 30
             dias). Substitui a lista boleto a boleto que ficava embaixo. -->
        <template #cell-periodo="{ row }">
          <span class="block min-w-0 tabular-nums">
            <span class="block text-ink">
              {{ row.per_pagas }} paga{{ Number(row.per_pagas) === 1 ? '' : 's' }}
              <span v-if="Number(row.per_pagas)" class="text-ink-subtle">· {{ formatCurrency(row.per_pagas_valor) }}</span>
            </span>
            <span class="block text-micro text-ink-subtle">
              {{ row.per_emitidas }} emitida{{ Number(row.per_emitidas) === 1 ? '' : 's' }}{{ Number(row.per_emitidas) ? ` · ${formatCurrency(row.per_emitidas_valor)}` : '' }}
            </span>
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
            <span v-if="row.cadastro_alerta" class="text-micro text-data-warn" :title="row.cadastro_alerta">
              <i class="fas fa-location-dot" style="font-size:9px"></i> CEP a corrigir no CV
            </span>
          </span>
        </template>

        <template #cell-sienge="{ row }">
          <span v-if="row.sienge_contract_id" class="inline-flex flex-col items-start gap-0.5">
            <Badge :variant="row.sienge_venda_faturada_em ? 'info' : 'neutral'" size="sm">
              <i class="fas fa-file-invoice mr-1" style="font-size:9px"></i>
              {{ row.sienge_venda_faturada_em ? `venda faturada ${formatDate(row.sienge_venda_faturada_em)}` : 'venda não faturada' }}
            </Badge>
            <span class="text-micro text-ink-subtle">contrato {{ row.sienge_contract_id }}</span>
            <span v-if="row.cv_repasse_situacao" class="text-micro text-ink-subtle truncate max-w-[9rem]" :title="`Repasse no CV: ${row.cv_repasse_situacao}`">repasse: {{ row.cv_repasse_situacao }}</span>
          </span>
          <span v-else class="inline-flex flex-col items-start gap-0.5">
            <span class="text-ink-subtle">sem contrato</span>
            <span v-if="row.cv_repasse_situacao" class="text-micro text-ink-subtle truncate max-w-[9rem]" :title="`Repasse no CV: ${row.cv_repasse_situacao}`">repasse: {{ row.cv_repasse_situacao }}</span>
          </span>
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

      <!-- Últimas rodadas: o que cada ciclo fez e onde caiu. Era o rodapé do
           painel Acompanhamento; o painel saiu (era uma segunda lista com um
           segundo filtro) e o log das rodadas ficou aqui, fechado. -->
      <Collapsible title="Últimas rodadas" icon="fas fa-clock-rotate-left" :hint="ultimaRodadaResumo">
        <p v-if="store.rodadasError" class="text-sm text-data-neg">{{ store.rodadasError }}</p>
        <DataTable v-else :columns="COLUNAS_RODADAS" :rows="store.rodadas" row-key="id" density="compact"
          :loading="store.rodadasLoading"
          empty-title="Nenhuma rodada registrada" empty-text="A rodada diária grava aqui quando roda. Antes de 08/09/2026 o resultado ia só para o log do servidor.">
          <template #cell-inicio="{ row }">
            <span class="tabular-nums text-ink">{{ formatDateTime(row.inicio) }}</span>
            <span class="block text-micro text-ink-subtle">{{ row.manual ? `manual${row.user_nome ? ` · ${row.user_nome}` : ''}` : 'automática' }}{{ row.duracao_s != null ? ` · ${duracaoLabel(row.duracao_s)}` : '' }}</span>
          </template>
          <template #cell-status="{ row }">
            <Badge :variant="rodadaVariant(row.status)" size="sm" dot>{{ rodadaLabel(row.status) }}</Badge>
            <span v-if="row.resultado?.emissao?.skipped" class="block text-micro text-ink-subtle">{{ skippedLabel(row.resultado.emissao.skipped) }}</span>
          </template>
          <template #cell-feito="{ row }">
            <span class="block text-ink tabular-nums">{{ row.emitidas + row.reemitidas }} emitido{{ row.emitidas + row.reemitidas === 1 ? '' : 's' }}<span v-if="row.falhas" class="text-data-neg"> · {{ row.falhas }} falha{{ row.falhas === 1 ? '' : 's' }}</span></span>
            <span class="block text-micro text-ink-subtle tabular-nums">{{ row.adesoes }} adesões · {{ row.encerramentos }} encerramentos · {{ row.lembretes }} lembretes · {{ row.avisos }} avisos</span>
          </template>
          <template #cell-erros="{ row }">
            <span v-if="row.erros?.length" class="block text-micro text-data-neg leading-snug">{{ row.erros.join(' | ') }}</span>
            <span v-else class="text-ink-subtle">-</span>
          </template>
        </DataTable>
      </Collapsible>
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
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useParcelasStore } from '@/stores/Financeiro/CobrancaAto/parcelasStore';
import { useCan } from '@/composables/useCan';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Switch from '@/components/UI/Switch.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import FilterBar from '@/components/UI/FilterBar.vue';
import StatRow from '@/components/UI/StatRow.vue';
import DataTable from '@/components/UI/DataTable.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Modal from '@/components/UI/Modal.vue';
import Collapsible from '@/components/UI/Collapsible.vue';
import PeriodoFilter from './PeriodoFilter.vue';
import { PERIODO_VAZIO, periodoResumo, periodosAtivos } from './periodo';
import PlanoDetailModal from './PlanoDetailModal.vue';
import { pedirConfirmacao } from '@/composables/useConfirm';
import { planoLabel, planoVariant, motivoLabel, formatCurrency, formatDate, formatDateTime, diasLabel } from './parcelasFormat';

const store = useParcelasStore();
const can = useCan('/financeiro/cobranca/ato');

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
    + (f.empreendimento.length ? 1 : 0) + (f.q ? 1 : 0) + (f.comAtraso ? 1 : 0)
    + periodosAtivos(f.periodo || {});
});

const primeiraCarga = ref(true);
const carregando = computed(() => primeiraCarga.value || store.loading);

/* Um filtro, uma lista. Já houve uma segunda lista aqui (boleto a boleto do
   Acompanhamento) com filtro próprio de período; saiu. O período agora mora
   neste filtro e recorta a lista, os cartões e a coluna "No período". */
function aplicar() {
  return store.refresh().finally(() => { primeiraCarga.value = false; });
}
function limpar() {
  store.filtro.status = ['ativo']; store.filtro.empreendimento = []; store.filtro.q = ''; store.filtro.comAtraso = false;
  store.filtro.periodo = { ...PERIODO_VAZIO };
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
  const per = s.periodo;
  return [
    { key: 'ativos', label: 'Planos ativos', value: s.planos.ativos, hint: `${s.planos.pausados} pausados · ${s.planos.encerrados} encerrados`, icon: 'fas fa-layer-group', tone: 'accent', tooltip: 'Reservas com cobrança de parcelas a cargo do Office' },
    { key: 'a_vencer', label: 'Vencem em 30 dias', value: s.aVencer30.qty, hint: formatCurrency(s.aVencer30.valor), icon: 'fas fa-calendar-day', tone: 2, tooltip: 'Parcelas previstas que a rodada vai emitir nos próximos 30 dias' },
    { key: 'emitidas', label: 'Boletos em aberto', value: s.emitidas.qty, hint: formatCurrency(s.emitidas.valor), icon: 'fas fa-barcode', tone: 'neutral', tooltip: 'Parcelas com boleto emitido aguardando pagamento. Clique para recortar' },
    { key: 'atraso', label: 'Em atraso', value: s.atraso.qty, hint: `${formatCurrency(s.atraso.valor)}${s.atraso.nuncaCobradas ? ` · ${s.atraso.nuncaCobradas} nunca cobradas` : ''}`, icon: 'fas fa-triangle-exclamation', tone: 'neg', tooltip: 'Parcelas vencidas sem pagamento, inclusive as que passaram do vencimento sem nunca terem sido cobradas. Clique para recortar' },
    /* Os dois "no período" seguem o filtro de cima; sem período preenchido
       ficam em 30 dias e o rótulo diz isso. */
    { key: 'emitidas_periodo', label: per.padrao ? 'Emitidas (30 dias)' : 'Emitidas no período', value: per.emitidas.qty, hint: formatCurrency(per.emitidas.valor), icon: 'fas fa-file-invoice', tone: 'neutral', tooltip: per.padrao ? 'Boletos de parcela emitidos nos últimos 30 dias' : `Boletos de parcela emitidos ${periodoResumo({ emitidoDe: per.emitido.de, emitidoAte: per.emitido.ate })}` },
    { key: 'pagas_periodo', label: per.padrao ? 'Pagas (30 dias)' : 'Pagas no período', value: per.pagas.qty, hint: `${formatCurrency(per.pagas.valor)} · ${s.pagas.qty} no total`, icon: 'fas fa-circle-check', tone: 'pos', tooltip: per.padrao ? 'Parcelas pagas nos últimos 30 dias' : `Parcelas pagas ${periodoResumo({ pagoDe: per.pago.de, pagoAte: per.pago.ate })}` },
    { key: 'erro', label: 'Com erro', value: s.erro.qty, hint: `${s.transferidas.qty} transferidas ao Sienge`, icon: 'fas fa-bug', tone: s.erro.qty ? 'neg' : 'neutral', tooltip: 'Parcelas cuja emissão falhou. Clique para recortar' },
  ];
});

const pct = (r) => (r.parcelas_total ? Math.round((r.parcelas_pagas / r.parcelas_total) * 100) : 0);

/* Ordena pelo SERVIDOR (`manual-sort` na tabela): a lista e paginada, e sem
   isso a tabela ordenaria so a pagina que recebeu - pior que nao ordenar.
   Cada `key` daqui tem que existir em ORDENAVEIS no AtoParcelaService. */
const COLUNAS = [
  { key: 'idreserva', label: '#Reserva', priority: 1, sortable: true, width: '7rem' },
  { key: 'titular_nome', label: 'Titular / Empreendimento', priority: 1, sortable: true },
  { key: 'progresso', label: 'Pagas', priority: 2, sortable: true, width: '10rem' },
  { key: 'periodo', label: 'No período', priority: 2, sortable: true, width: '9rem' },
  { key: 'proxima', label: 'Próxima cobrança', priority: 1, sortable: true, width: '11rem' },
  { key: 'atraso', label: 'Atraso', priority: 1, sortable: true, width: '8rem' },
  { key: 'status', label: 'Plano', priority: 2, sortable: true, width: '9rem' },
  { key: 'sienge', label: 'Sienge', priority: 3, sortable: true, width: '8rem' },
];

// ── Acompanhamento: rodadas e boletos ─────────────────────────────────────────
const ultimaRodadaResumo = computed(() => {
  const r = store.rodadas[0];
  if (!r) return 'nenhuma registrada ainda';
  if (r.status === 'rodando') return `Rodada em andamento desde ${formatDateTime(r.inicio)}${r.manual ? ' (manual)' : ''}`;
  const partes = [`Última rodada ${formatDateTime(r.inicio)}`, `${r.emitidas + r.reemitidas} emitidos`];
  if (r.falhas) partes.push(`${r.falhas} falhas`);
  if (r.status === 'falhou') partes.push('CAIU antes de terminar');
  else if (r.status === 'com_erros') partes.push('com erros de passo');
  return partes.join(' · ');
});

const COLUNAS_RODADAS = [
  { key: 'inicio', label: 'Rodada', priority: 1, sortable: true, width: '11rem' },
  { key: 'status', label: 'Resultado', priority: 1, sortable: true, width: '9rem' },
  { key: 'feito', label: 'O que fez', priority: 1, sortable: true,
    sortValue: (r) => (r.emitidas || 0) + (r.reemitidas || 0) },
  { key: 'erros', label: 'Erros', priority: 2, sortable: true,
    sortValue: (r) => (r.erros?.length || 0) },
];

const RODADA_LABEL = { rodando: 'Em andamento', concluida: 'Concluída', com_erros: 'Com erros', falhou: 'Caiu' };
const RODADA_VARIANT = { rodando: 'warning', concluida: 'success', com_erros: 'warning', falhou: 'danger' };
const rodadaLabel = (s) => RODADA_LABEL[s] || s;
const rodadaVariant = (s) => RODADA_VARIANT[s] || 'neutral';
const skippedLabel = (s) => ({ 'parcelas_ativo=false': 'cobrança de parcelas pausada: nada emitido', fora_da_janela: 'fora da janela do Ecobrança: nada emitido' }[s] || s);
const duracaoLabel = (s) => (s >= 3600 ? `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}` : s >= 60 ? `${Math.floor(s / 60)} min` : `${s} s`);

/* A busca procura ao DIGITAR, nas duas listas.

   Antes só reagia ao Enter (e o campo das emissões nem botão tinha), então
   quem digitava e esperava concluía, com razão, que não buscava. 350 ms
   segura a rajada de teclas sem parecer travado; Enter e o botão Filtrar
   continuam valendo para quem tem pressa. */
let timerBusca = null;
function aplicarComFolga() {
  clearTimeout(timerBusca);
  timerBusca = setTimeout(aplicar, 350);
}
watch(() => store.filtro.q, aplicarComFolga);
onBeforeUnmount(() => clearTimeout(timerBusca));

function recarregarAcompanhamento() { return store.fetchRodadas(); }

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
      ? 'Faz a adesão das reservas com ato pago, encerra os planos cuja venda o Sienge já faturou e EMITE os boletos das parcelas que vencem dentro da antecedência configurada. Cada boleto sai para o cliente por e-mail e WhatsApp; lembretes e avisos de vencida também.'
      : 'A cobrança de parcelas está pausada: a rodada só faz a adesão dos planos e os encerramentos. Nenhum boleto é emitido.',
    confirmLabel: 'Rodar agora', tone: ligado ? 'danger' : 'primary',
  });
  if (!ok) return;
  rodando.value = true;
  try {
    await store.rodarCiclo();
    setTimeout(() => { store.refresh({ silent: true }); store.fetchStatus(); recarregarAcompanhamento(); rodando.value = false; }, 8000);
  } catch { rodando.value = false; }
}

/* Enquanto a rodada está em andamento, o log das rodadas e a lista se
   atualizam sozinhos. */
let acompanhamentoTimer = null;
function agendarAcompanhamento() {
  if (acompanhamentoTimer) clearInterval(acompanhamentoTimer);
  acompanhamentoTimer = setInterval(() => {
    if (store.rodadas[0]?.status === 'rodando') { store.fetchRodadas({ silent: true }); store.refresh({ silent: true }); }
  }, 60000);
}
onBeforeUnmount(() => { if (acompanhamentoTimer) clearInterval(acompanhamentoTimer); });

onMounted(async () => {
  await Promise.allSettled([store.fetchFacets(), store.fetchStatus(), recarregarAcompanhamento()]);
  agendarAcompanhamento();
  await aplicar();
});
</script>
