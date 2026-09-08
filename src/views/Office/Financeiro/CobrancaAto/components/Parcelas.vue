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

    <!-- Acompanhamento: o que a rodada fez, boleto a boleto, e o histórico das
         rodadas. É a resposta concreta para "saiu? para quem? e o que falhou?". -->
    <Panel title="Acompanhamento" icon="fas fa-list-check"
      :subtitle="ultimaRodadaResumo" :padded="false">
      <template #actions>
        <div class="flex flex-wrap items-center gap-2">
          <SegmentedControl v-model="store.boletosFiltro.periodo" size="sm"
            :options="[{ value: 'hoje', label: 'Hoje' }, { value: '7d', label: '7 dias' }, { value: '30d', label: '30 dias' }]"
            @change="store.fetchBoletos()" />
          <Select v-model="store.boletosFiltro.status" size="sm" class="w-36"
            :options="[{ value: '', label: 'Todos' }, { value: 'success', label: 'Emitidos' }, { value: 'error', label: 'Com erro' }, { value: 'processing', label: 'Em processamento' }]"
            @change="store.fetchBoletos()" />
          <Input v-model="store.boletosFiltro.q" size="sm" class="w-40" placeholder="Reserva ou titular" @keydown.enter="store.fetchBoletos()" />
          <IconButton icon="fas fa-rotate-right" size="sm" label="Atualizar" :disabled="store.boletosLoading" @click="recarregarAcompanhamento" />
        </div>
      </template>

      <div v-if="store.boletosError" class="m-3 rounded-lg border border-data-neg/25 bg-data-neg/10 p-3 text-sm text-data-neg flex items-start gap-2">
        <i class="fas fa-circle-exclamation mt-0.5 shrink-0"></i>
        <span class="min-w-0">{{ store.boletosError }}</span>
      </div>

      <!-- Resumo do período: clique recorta a tabela de boletos. -->
      <div v-if="store.boletos.resumo" class="px-3 sm:px-4 py-2.5 border-b border-line flex flex-wrap gap-1.5">
        <button v-for="c in resumoChips" :key="c.key" type="button"
          class="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-micro font-medium transition-colors duration-120 focus-ring tabular-nums"
          :class="[c.classe, recorteBoletos === c.key ? 'ring-2 ring-accent/40' : '']"
          @click="recorteBoletos = recorteBoletos === c.key ? '' : c.key">
          <i :class="c.icon" style="font-size:10px"></i>
          <b>{{ c.value }}</b> {{ c.label }}
        </button>
      </div>

      <DataTable :columns="COLUNAS_BOLETOS" :rows="boletosRecortados" row-key="id" density="compact" clickable
        :loading="store.boletosLoading" empty-title="Nenhum boleto de parcela no período"
        :empty-text="store.boletosFiltro.periodo === 'hoje' ? 'A rodada diária ainda não emitiu nada hoje. Troque para 7 ou 30 dias para ver os anteriores.' : 'Nenhuma emissão de parcela nesse período com os filtros atuais.'"
        @row-click="abrirBoletoParcela">
        <template #cell-hora="{ row }">
          <span class="tabular-nums text-ink">{{ formatDateTime(row.created_at) }}</span>
        </template>
        <template #cell-idreserva="{ row }">
          <button type="button" class="font-mono font-semibold text-accent tabular-nums hover:underline" @click.stop="abrirPlano({ idreserva: row.idreserva })">#{{ row.idreserva }}</button>
        </template>
        <template #cell-titular_nome="{ row }">
          <span class="block min-w-0">
            <span class="block text-ink truncate">{{ row.titular_nome || '-' }}</span>
            <span class="block text-micro text-ink-subtle truncate">{{ row.empreendimento || '-' }}{{ row.unidade ? ` · ${row.unidade}` : '' }}</span>
          </span>
        </template>
        <template #cell-parcela="{ row }">
          <span class="text-ink tabular-nums">{{ row.numero ? `${row.numero}/${row.total}` : '-' }}</span>
          <span v-if="Number(row.emissoes) > 1" class="block text-micro text-ink-subtle">{{ row.emissoes }}ª via</span>
        </template>
        <template #cell-valor="{ row }">
          <span class="block tabular-nums text-ink">{{ formatCurrency(row.valor) }}</span>
          <span class="block text-micro text-ink-subtle">vence {{ formatDate(row.vencimento) }}</span>
        </template>
        <template #cell-emissao="{ row }">
          <span class="inline-flex flex-col items-start gap-0.5 min-w-0">
            <Badge :variant="emissaoVariant(row)" size="sm" dot>{{ emissaoLabel(row) }}</Badge>
            <span v-if="row.status === 'error'" class="text-micro text-data-neg leading-snug">{{ limparErro(row.error_message) }}</span>
            <span v-else-if="row.nosso_numero" class="text-micro font-mono text-ink-subtle">{{ row.nosso_numero }}</span>
          </span>
        </template>
        <template #cell-canais="{ row }">
          <span v-if="row.status === 'success'" class="inline-flex items-center gap-2">
            <span v-for="c in canais(row)" :key="c.key" class="inline-flex items-center gap-1 text-micro" :class="c.ok ? 'text-data-pos' : 'text-data-neg'" :title="c.title">
              <i :class="[c.icon]" style="font-size:11px"></i>
              <i :class="c.ok ? 'fas fa-check' : 'fas fa-xmark'" style="font-size:9px"></i>
            </span>
            <span v-if="canais(row).some(c => !c.ok)" class="text-micro text-data-neg truncate max-w-[14rem]">{{ canais(row).filter(c => !c.ok).map(c => c.motivo).join(' · ') }}</span>
          </span>
          <span v-else class="text-ink-subtle">-</span>
        </template>
      </DataTable>

      <template #footer>
        <Collapsible title="Últimas rodadas" icon="fas fa-clock-rotate-left"
          :hint="store.rodadas.length ? `${store.rodadas.length} registradas` : 'nenhuma registrada ainda'">
          <p v-if="store.rodadasError" class="text-sm text-data-neg">{{ store.rodadasError }}</p>
          <DataTable v-else :columns="COLUNAS_RODADAS" :rows="store.rodadas" row-key="id" density="compact"
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
    </Panel>

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
    <BoletoDetailModal :open="boletoModal.open" :item="boletoModal.item" :z-index="10050" @close="boletoModal = { open: false, item: null }" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
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
import Panel from '@/components/UI/Panel.vue';
import Select from '@/components/UI/Select.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Collapsible from '@/components/UI/Collapsible.vue';
import PlanoDetailModal from './PlanoDetailModal.vue';
import BoletoDetailModal from './BoletoDetailModal.vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
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

// ── Acompanhamento: rodadas e boletos ─────────────────────────────────────────
const ultimaRodadaResumo = computed(() => {
  const r = store.rodadas[0];
  if (!r) return 'Boleto a boleto do período e o histórico das rodadas';
  if (r.status === 'rodando') return `Rodada em andamento desde ${formatDateTime(r.inicio)}${r.manual ? ' (manual)' : ''}`;
  const partes = [`Última rodada ${formatDateTime(r.inicio)}`, `${r.emitidas + r.reemitidas} emitidos`];
  if (r.falhas) partes.push(`${r.falhas} falhas`);
  if (r.status === 'falhou') partes.push('CAIU antes de terminar');
  else if (r.status === 'com_erros') partes.push('com erros de passo');
  return partes.join(' · ');
});

const recorteBoletos = ref('');
const RECORTES_BOLETOS = {
  sucesso: (r) => r.status === 'success',
  erro: (r) => r.status === 'error',
  processando: (r) => r.status === 'processing',
  whatsapp: (r) => r.status === 'success' && !r.cliente_whatsapp_enviado,
  email: (r) => r.status === 'success' && !r.cliente_email_enviado,
  cv: (r) => r.status === 'success' && !r.cv_documento_anexado,
  pagos: (r) => r.payment_status === 'paid',
};
const boletosRecortados = computed(() => {
  const rows = store.boletos?.rows || [];
  const f = RECORTES_BOLETOS[recorteBoletos.value];
  return f ? rows.filter(f) : rows;
});
const resumoChips = computed(() => {
  const s = store.boletos?.resumo;
  if (!s) return [];
  const neg = 'bg-data-neg/10 text-data-neg hover:bg-data-neg/15';
  const pos = 'bg-data-pos/10 text-data-pos hover:bg-data-pos/15';
  const neu = 'bg-surface-sunken text-ink-muted hover:bg-line';
  return [
    { key: 'sucesso', label: 'emitidos', value: s.sucesso, icon: 'fas fa-barcode', classe: pos },
    { key: 'erro', label: 'com erro', value: s.erro, icon: 'fas fa-bug', classe: s.erro ? neg : neu },
    { key: 'processando', label: 'em processamento', value: s.processando, icon: 'fas fa-spinner', classe: neu },
    { key: 'whatsapp', label: 'sem WhatsApp', value: s.whatsapp_nao_enviado, icon: 'fab fa-whatsapp', classe: s.whatsapp_nao_enviado ? neg : neu },
    { key: 'email', label: 'sem e-mail', value: s.email_nao_enviado, icon: 'fas fa-envelope', classe: s.email_nao_enviado ? neg : neu },
    { key: 'cv', label: 'sem anexo no CV', value: s.cv_nao_anexado, icon: 'fas fa-paperclip', classe: s.cv_nao_anexado ? neg : neu },
    { key: 'pagos', label: 'pagos', value: s.pagos, icon: 'fas fa-circle-check', classe: s.pagos ? pos : neu },
  ];
});

const COLUNAS_BOLETOS = [
  { key: 'hora', label: 'Emitido em', priority: 2, width: '9rem' },
  { key: 'idreserva', label: '#Reserva', priority: 1, width: '6rem' },
  { key: 'titular_nome', label: 'Titular / Empreendimento', priority: 1 },
  { key: 'parcela', label: 'Parcela', priority: 2, width: '5rem' },
  { key: 'valor', label: 'Valor', priority: 1, numeric: true, width: '8rem' },
  { key: 'emissao', label: 'Emissão', priority: 1, width: '13rem' },
  { key: 'canais', label: 'CV · e-mail · WhatsApp', priority: 2, width: '15rem' },
];
const COLUNAS_RODADAS = [
  { key: 'inicio', label: 'Rodada', priority: 1, width: '11rem' },
  { key: 'status', label: 'Resultado', priority: 1, width: '9rem' },
  { key: 'feito', label: 'O que fez', priority: 1 },
  { key: 'erros', label: 'Erros', priority: 2 },
];

const emissaoLabel = (r) => {
  if (r.status === 'error') return 'Falhou';
  if (r.status === 'processing') return 'Emitindo';
  if (r.payment_status === 'paid') return 'Pago';
  if (r.payment_status === 'cancelled') return 'Baixado';
  return 'Emitido';
};
const emissaoVariant = (r) => {
  if (r.status === 'error') return 'danger';
  if (r.status === 'processing') return 'warning';
  if (r.payment_status === 'paid') return 'success';
  if (r.payment_status === 'cancelled') return 'neutral';
  return 'info';
};
/* "Falha na emissao (emissao): Portal Ecobrança: CEP SACADO INVALIDO" -> só o que importa. */
const limparErro = (m) => String(m || 'erro sem mensagem').replace(/^Falha na emissao \([^)]*\):\s*/i, '').replace(/^Portal Ecobran[cç]a:\s*/i, 'Caixa: ');
const motivoCurto = (m, padrao) => String(m || padrao).replace(/^(WhatsApp|E-mail) nao enviado:\s*/i, '').replace(/^Anexo no CV falhou:\s*/i, '');
const canais = (r) => [
  { key: 'cv', icon: 'fas fa-paperclip', ok: !!r.cv_documento_anexado, motivo: motivoCurto(r.cv_anexo_motivo, 'anexo no CV falhou'), title: r.cv_documento_anexado ? 'Anexado na reserva do CV' : (r.cv_anexo_motivo || 'Anexo no CV falhou') },
  { key: 'email', icon: 'fas fa-envelope', ok: !!r.cliente_email_enviado, motivo: motivoCurto(r.email_motivo, 'e-mail não enviado'), title: r.cliente_email_enviado ? 'E-mail enviado' : (r.email_motivo || 'E-mail não enviado') },
  { key: 'wpp', icon: 'fab fa-whatsapp', ok: !!r.cliente_whatsapp_enviado, motivo: motivoCurto(r.whatsapp_motivo, 'WhatsApp não enviado'), title: r.cliente_whatsapp_enviado ? 'WhatsApp enviado' : (r.whatsapp_motivo || 'WhatsApp não enviado') },
];

const RODADA_LABEL = { rodando: 'Em andamento', concluida: 'Concluída', com_erros: 'Com erros', falhou: 'Caiu' };
const RODADA_VARIANT = { rodando: 'warning', concluida: 'success', com_erros: 'warning', falhou: 'danger' };
const rodadaLabel = (s) => RODADA_LABEL[s] || s;
const rodadaVariant = (s) => RODADA_VARIANT[s] || 'neutral';
const skippedLabel = (s) => ({ 'parcelas_ativo=false': 'cobrança de parcelas pausada: nada emitido', fora_da_janela: 'fora da janela do Ecobrança: nada emitido' }[s] || s);
const duracaoLabel = (s) => (s >= 3600 ? `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}` : s >= 60 ? `${Math.floor(s / 60)} min` : `${s} s`);

function recarregarAcompanhamento() { return Promise.allSettled([store.fetchBoletos(), store.fetchRodadas()]); }

const boletoModal = ref({ open: false, item: null });
async function abrirBoletoParcela(row) {
  try {
    const item = await requestWithAuth(`/boleto-caixa/history/${row.id}`);
    boletoModal.value = { open: true, item: { ...item, forma: 'boleto' } };
  } catch (e) {
    store.boletosError = e.message || 'Falha ao abrir o boleto.';
  }
}

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

/* Enquanto a rodada está em andamento, o acompanhamento se atualiza sozinho. */
let acompanhamentoTimer = null;
function agendarAcompanhamento() {
  if (acompanhamentoTimer) clearInterval(acompanhamentoTimer);
  acompanhamentoTimer = setInterval(() => {
    const emAndamento = store.rodadas[0]?.status === 'rodando' || (store.boletos?.resumo?.processando || 0) > 0;
    if (emAndamento) { store.fetchBoletos({ silent: true }); store.fetchRodadas({ silent: true }); }
  }, 60000);
}
onBeforeUnmount(() => { if (acompanhamentoTimer) clearInterval(acompanhamentoTimer); });

onMounted(async () => {
  await Promise.allSettled([store.fetchFacets(), store.fetchStatus(), recarregarAcompanhamento()]);
  agendarAcompanhamento();
  await aplicar();
});
</script>
