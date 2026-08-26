<!--
  Aba Conciliação da tela Ato (Financeiro > Contas a Receber).

  Era uma tela própria ("Recebimentos do Ato", /financeiro/recebimentos-ato).
  Virou aba porque a pergunta que ela responde - o que foi cobrado x o que foi
  lançado - só faz sentido ao lado do Histórico de cobrança, na mesma tela.
  A rota antiga segue viva como redirect para ?tab=conciliacao.

  A REGRA não mudou: relatório "Contas Recebidas (por Data de Recebimento)" do
  Sienge no documento AVC, lido AO VIVO da API, confrontado com o ato pago.
-->
<template>
  <div class="space-y-4">
  <!-- Filtros (barra recolhível, padrão das telas financeiras) -->
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
        <Button variant="ghost" size="sm" icon="fas fa-eraser" @click="clearFilters">
          <span class="hidden sm:inline">Limpar</span>
        </Button>
        <Button variant="ghost" size="sm" icon="fas fa-file-csv"
          :loading="store.exporting" :disabled="!store.temResultado" @click="store.exportCsv()">
          <span class="hidden sm:inline">Exportar</span>
        </Button>
        <Button size="sm" icon="fas fa-magnifying-glass" :loading="store.loading" @click="apply">
          <span class="hidden sm:inline">Filtrar</span>
        </Button>
      </div>
    </div>

    <!-- Uma linha só no desktop: datas e folga com largura de conteúdo, e os
         dois seletores esticando para ocupar TODA a largura que sobra (é neles
         que o espaço faz falta - nome de empreendimento é comprido).
         No celular tudo quebra e cada campo divide a linha, sem estourar. -->
    <div v-show="filtersExpanded" class="p-3 sm:p-4 flex flex-wrap items-end gap-3">
      <div class="flex-1 min-w-[8.5rem] sm:flex-none sm:w-[9rem]">
        <label class="block text-micro font-medium text-ink-muted mb-1.5 whitespace-nowrap">Recebido de</label>
        <Input v-model="store.startDate" type="date" />
      </div>

      <div class="flex-1 min-w-[8.5rem] sm:flex-none sm:w-[9rem]">
        <label class="block text-micro font-medium text-ink-muted mb-1.5 whitespace-nowrap">Recebido até</label>
        <Input v-model="store.endDate" type="date" />
      </div>

      <div class="flex-1 min-w-[13rem]">
        <label class="block text-micro font-medium text-ink-muted mb-1.5">Empresa(s)</label>
        <MultiSelector :model-value="empresaLabels" @update:modelValue="onEmpresasChange"
          :options="empresaOptions" placeholder="Todas" :page-size="200" :select-all="true" />
      </div>

      <div class="flex-1 min-w-[13rem]">
        <label class="block text-micro font-medium text-ink-muted mb-1.5">Empreendimento(s)</label>
        <MultiSelector :model-value="empreendimentoLabels" @update:modelValue="onEmpreendimentosChange"
          :options="empreendimentoOptions" placeholder="Todos" :page-size="200" :select-all="true" />
      </div>

      <!-- Sobe para a linha dos filtros: é filtro do confronto, não um ajuste
           à parte. O atraso do administrativo varia por empreendimento e por
           época, então a janela é do usuário, não do código. -->
      <div v-if="store.mesclarAto" class="flex-1 min-w-[7.5rem] sm:flex-none sm:w-[8.5rem]">
        <label class="block text-micro font-medium text-ink-muted mb-1.5 whitespace-nowrap"
          title="Quantos dias antes do período o confronto olha, para não acusar de pendente um ato que já foi lançado fora da janela.">
          Olhar p/ trás (dias)
        </label>
        <Input v-model.number="store.folgaDias" type="number" min="0" max="365" />
      </div>

      <!-- O confronto é o motivo da aba, então nasce ligado; desligar deixa a
           tela como espelho puro do relatório do Sienge. -->
      <div class="w-full pt-3 border-t border-line">
        <Switch
          v-model="store.mesclarAto"
          label="Mesclar com o Ato"
          description="Confronta cada recebimento do Sienge com o ato cobrado no Office e mostra o que ainda falta lançar." />
      </div>
    </div>
  </section>

  <!-- Erro: mesmo bloco da aba Histórico, inclusive o "Tentar novamente". -->
  <div v-if="store.error"
    class="rounded-xl border border-data-neg/25 bg-data-neg/10 p-4 text-sm text-data-neg
           flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div class="flex items-start gap-2 min-w-0">
      <i class="fas fa-circle-exclamation mt-0.5 shrink-0"></i>
      <span class="min-w-0">{{ store.error }}</span>
    </div>
    <Button variant="outline" size="sm" icon="fas fa-rotate-right" class="shrink-0" @click="store.search()">
      Tentar novamente
    </Button>
  </div>

  <!-- Esqueleto na forma exata do que vem: a fileira de cartões e a tabela.
       Sem ele a tela pulava do vazio para o conteúdo, e a consulta é AO VIVO
       (alguns segundos), então o salto era bem visível. -->
  <div v-else-if="store.loading" class="space-y-4">
    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
      <Skeleton v-for="i in 5" :key="i" variant="stat" />
    </div>
    <div v-if="store.mesclarAto" class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
      <Skeleton v-for="i in 4" :key="`c${i}`" variant="stat" />
    </div>
    <Skeleton variant="table" :lines="8" />
  </div>

  <template v-else>
    <!-- Rodapé do relatório do Sienge, promovido a topo: são os números que
         quem confere procura primeiro. StatRow é o mesmo primitivo dos KPIs
         do Histórico - antes eram Surfaces montados à mão, e destoavam. -->
    <StatRow v-if="store.searched" :items="kpisRecebimento"
      :cols="{ sm: 2, md: 3, lg: 5 }" size="sm" />

    <!-- Confronto com o Ato. -->
    <template v-if="conc">
      <StatRow :items="kpisConciliacao" :cols="{ sm: 2, md: 4, lg: 4 }" size="sm" />

      <!-- Avisos honestos: o que o confronto NÃO conseguiu olhar. -->
      <div v-if="conc.resumo.naoMapeados || conc.folgaIndisponivel"
        class="rounded-xl border border-data-warn/25 bg-data-warn/10 p-4 text-xs text-data-warn
               flex items-start gap-2">
        <i class="fas fa-triangle-exclamation mt-0.5 shrink-0"></i>
        <span class="min-w-0">
          <template v-if="conc.resumo.naoMapeados">
            {{ num(conc.resumo.naoMapeados) }} ato(s) ficaram de fora do confronto porque o empreendimento
            deles não está pareado com o ERP (Configurações &gt; Empresas).
          </template>
          <template v-if="conc.folgaIndisponivel">
            Não foi possível checar os lançamentos anteriores ao período, então a lista de "falta lançar"
            não foi montada para não acusar quem já foi lançado.
          </template>
        </span>
      </div>

      <!-- A lista acionável: o que o administrativo ainda tem que digitar no
           Sienge. É LISTA, não tabela, de propósito - dois DataTable na mesma
           tela davam duas barras de rolagem horizontal, e o de fora ainda
           ficava emoldurado por um painel (borda dentro de borda). -->
      <section v-if="conc.atosSemAvc.length"
        class="rounded-xl border border-data-warn/30 bg-data-warn/5 overflow-hidden">
        <header class="px-4 py-3 border-b border-data-warn/20 flex items-center justify-between flex-wrap gap-2">
          <h3 class="text-sm font-semibold text-ink flex items-center gap-2">
            <i class="fas fa-hourglass-half text-data-warn text-xs"></i>
            Atos pagos sem recebimento lançado
            <Badge variant="warning" size="sm">{{ num(conc.atosSemAvc.length) }}</Badge>
          </h3>
          <span class="text-sm font-mono tabular-nums font-semibold text-data-warn">
            {{ moeda(conc.resumo.valorAtoSemAvc) }}
          </span>
        </header>

        <ul class="divide-y divide-line">
          <li v-for="a in conc.atosSemAvc" :key="a.uid"
            class="px-4 py-2.5 flex items-baseline gap-x-3 gap-y-1 flex-wrap hover:bg-surface-sunken/40 transition-colors">
            <span class="font-mono tabular-nums text-xs text-ink-muted w-20 shrink-0">{{ dataBR(a.pago_em) }}</span>

            <span class="text-sm text-ink flex-1 min-w-[10rem]">
              {{ a.titular }}
              <span v-if="a.unidade" class="text-ink-subtle text-xs ml-1">· {{ a.unidade }}</span>
            </span>

            <span class="text-xs text-ink-subtle truncate max-w-[14rem] hidden sm:inline">{{ a.empreendimento }}</span>

            <Badge :variant="a.tipo === 'cartao' ? 'info' : 'neutral'" size="sm">
              {{ a.tipo === 'cartao' ? 'Cartão' : 'Boleto' }}
            </Badge>

            <span class="font-mono tabular-nums text-sm font-semibold text-data-warn w-24 text-right shrink-0">
              {{ moeda(a.valor) }}
            </span>
          </li>
        </ul>
      </section>
    </template>

    <!-- Detalhe. O DataTable JÁ desenha a própria moldura e já prende o
         scroll horizontal nela, então aqui não entra Surface nem padding em
         volta: painel dentro de painel era a "tabela dentro de tabela", e o
         container extra criava a segunda barra de rolagem. -->
    <div>
      <div class="flex items-center justify-between flex-wrap gap-2 mb-2 px-0.5">
        <h3 class="text-base font-semibold text-ink flex items-center gap-2">
          <i class="fas fa-list text-accent"></i> Recebimentos
        </h3>
        <span class="text-xs text-ink-muted flex items-center gap-3">
          <!-- A linha inteira abre o detalhe (o DataTable trata o clique), mas
               isso não se descobre olhando: a setinha da ponta é discreta. -->
          <span class="hidden sm:inline text-ink-subtle">
            <i class="fas fa-hand-pointer text-[10px] mr-1"></i>clique na linha para abrir o detalhe
          </span>
          <span><span class="font-mono tabular-nums">{{ num(store.linhas.length) }}</span> linha(s)</span>
        </span>
      </div>

      <div>
        <DataTable
          :columns="columns"
          :rows="store.linhas"
          row-key="id"
          manual-sort
          clickable
          density="compact"
          more-label="Ver todos os campos"
          @row-click="abrirDetalhe"
          v-model:sort-by="ordenarPor"
          v-model:sort-dir="ordenarDir"
          empty-icon="fas fa-hand-holding-dollar"
          :empty-title="store.searched ? 'Nenhum recebimento no período' : 'Escolha o período'"
          :empty-text="store.searched
            ? 'Não houve recebimento de ato para os filtros escolhidos. Amplie o período ou tire o filtro de empresa.'
            : 'Selecione o período de recebimento e clique em Filtrar.'">

          <template #cell-data_baixa="{ row }">
            <span class="font-mono tabular-nums text-ink">{{ dataBR(row.data_baixa) }}</span>
          </template>

          <template #cell-cliente="{ row }">
            <span class="text-ink">{{ row.cliente }}</span>
            <span class="text-ink-subtle font-mono text-micro ml-1">({{ row.cod_cliente }})</span>
          </template>

          <template #cell-documento="{ row }">
            <span class="font-mono tabular-nums text-ink-muted">{{ row.documento }}</span>
          </template>

          <template #cell-nutitulo="{ row }">
            <span class="font-mono tabular-nums text-ink-muted">{{ row.nutitulo }}</span>
          </template>

          <template #cell-unidade="{ row }">
            <span class="text-ink-muted">{{ row.unidade || '-' }}</span>
          </template>

          <template #cell-valor_baixa="{ row }">
            <span class="font-mono tabular-nums font-semibold text-ink">{{ moeda(row.valor_baixa) }}</span>
          </template>

          <!-- Só existe com a mesclagem ligada (ver `columns`). A diferença
               aparece junto do selo: "divergente" sem o número não diz nada. -->
          <template #cell-_ato="{ row }">
            <div v-if="row.conciliacao" class="flex items-center gap-1.5 flex-wrap cursor-help"
              :title="explicarAto(row)">
              <Badge :variant="atoVariant(row.conciliacao.status)" size="sm">
                {{ atoRotulo(row.conciliacao.status) }}
              </Badge>
              <span v-if="row.conciliacao.status === 'divergente'"
                class="font-mono tabular-nums text-micro text-data-warn">
                {{ sinal(row.conciliacao.ato.diferenca) }}
              </span>
              <i v-if="row.conciliacao.ambiguo" class="fas fa-circle-exclamation text-[10px] text-data-warn"></i>
            </div>
            <span v-else class="text-ink-subtle">-</span>
          </template>

        </DataTable>
      </div>
    </div>
  </template>

  <RecebimentoDetailModal :open="detalhe.open" :item="detalhe.item" @close="fecharDetalhe" />

  <!-- De onde veio e de quando é. O relatório já morou no backup diário, e a
       diferença entre as duas fontes é justamente o que gerava dúvida - então
       fica escrito, com hora. -->
  <p class="text-micro text-ink-subtle font-mono mt-3 text-right">
    {{ origemDoDado }}
  </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useConciliacaoStore } from '@/stores/Financeiro/CobrancaAto/conciliacaoStore';

import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Switch from '@/components/UI/Switch.vue';
import DataTable from '@/components/UI/DataTable.vue';
import StatRow from '@/components/UI/StatRow.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import RecebimentoDetailModal from './RecebimentoDetailModal.vue';

const store = useConciliacaoStore();

const conc = computed(() => store.conciliacao);

/* Texto da procedência. A tela lê a API do Sienge ao vivo; o catálogo dos
   seletores é que vem do backup. Dizer "direto do Sienge" era vago demais para
   um relatório que existe para bater com o ERP. */
const origemDoDado = computed(() => {
  if (!store.consultadoEm) return 'API do Sienge (consulta ao vivo)';
  return `API do Sienge, consultada em ${dataHoraBR(store.consultadoEm)}`;
});

/* Detalhe em MODAL, igual ao Histórico. A linha aberta dentro da tabela
   (`expandable`) empurrava as de baixo e ficava ruim de ler. */
const detalhe = ref({ open: false, item: null });
const abrirDetalhe = (row) => { detalhe.value = { open: true, item: row }; };
const fecharDetalhe = () => { detalhe.value = { open: false, item: null }; };

/* Os KPIs usam o MESMO primitivo dos cartões do Histórico (StatRow), para as
   duas abas lerem igual. Antes eram Surfaces montados à mão e destoavam em
   altura, tipografia e espaçamento. */
const kpisRecebimento = computed(() => {
  const t = store.totais;
  return [
    { key: 'recebido', label: 'Total recebido', value: moeda(t.valor_baixa),
      hint: `líquido ${moeda(t.liquido)}`, icon: 'fas fa-hand-holding-dollar', tone: 'pos' },
    { key: 'parcelas', label: 'Parcelas', value: num(t.parcelas), icon: 'fas fa-layer-group', tone: 'accent' },
    { key: 'titulos', label: 'Títulos', value: num(t.titulos), icon: 'fas fa-file-invoice', tone: 'neutral' },
    { key: 'clientes', label: 'Clientes', value: num(t.clientes), icon: 'fas fa-users', tone: 'neutral' },
    { key: 'medio', label: 'Valor médio', value: moeda(t.valor_medio), icon: 'fas fa-calculator', tone: 'neutral' },
  ];
});

const kpisConciliacao = computed(() => {
  const r = conc.value?.resumo;
  if (!r) return [];
  return [
    { key: 'conciliados', label: 'Conciliados', value: num(r.conciliados),
      hint: 'recebimento com ato pago', icon: 'fas fa-circle-check', tone: 'pos' },
    { key: 'faltalancar', label: 'Falta lançar', value: num(r.atoSemAvc),
      hint: `${moeda(r.valorAtoSemAvc)} pagos sem baixa`, icon: 'fas fa-hourglass-half', tone: 'warn',
      tooltip: 'Ato que o cliente já pagou e que ainda não foi lançado no Sienge' },
    { key: 'semato', label: 'Sem ato', value: num(r.avcSemAto),
      hint: `${moeda(r.valorAvcSemAto)} abatidos sem ato`, icon: 'fas fa-circle-question', tone: 'neutral',
      tooltip: 'Recebimento lançado no Sienge sem ato correspondente no Office' },
    { key: 'divergentes', label: 'Valor divergente', value: num(r.divergentes),
      hint: 'conciliados com valor diferente', icon: 'fas fa-scale-unbalanced', tone: 2,
      tooltip: 'Bateram pelo cliente, mas o valor do ato e o da baixa não são iguais' },
  ];
});


/* `priority` decide a ORDEM no celular. A tela existe para responder "quanto de
   ato entrou e de quem", então data, cliente e valor abrem o cartão. Com a
   mesclagem ligada o selo do Ato entra logo depois do valor: passa a ser a
   coisa mais importante da linha.

   ENXUTA de propósito. Com nove colunas a tabela ficava mais larga que a área
   útil e ganhava barra de rolagem horizontal própria - segunda barra na tela,
   e a coluna de expandir (a última) saía do campo de visão. "Data vecto" e
   "Líquido" desceram para o detalhe da linha: em AVC o líquido é SEMPRE igual
   ao valor da baixa (medido), então ele ocupava largura para repetir o vizinho.
   Os dois seguem inteiros no CSV, que é onde se confere contra o Sienge.

   As larguras são FIXAS nas colunas curtas (data, valor, título, documento,
   selo). Sem isso a tabela reparte a sobra igualmente e a primeira coluna -
   uma data de dez caracteres - ficava com um vão enorme, enquanto o nome do
   cliente espremia. Agora a folga vai toda para Cliente, que e o unico campo de tamanho
   imprevisivel. */
const columns = computed(() => {
  const base = [
    { key: 'data_baixa', label: 'Dt. baixa', priority: 1, sortable: true, numeric: true, width: '104px' },
    { key: 'cliente', label: 'Cliente', priority: 1, sortable: true },
    { key: 'valor_baixa', label: 'Vl. baixa', priority: 1, sortable: true, numeric: true, width: '120px' },
    { key: 'unidade', label: 'Unid. princ', priority: 2, sortable: true, width: '150px' },
    { key: 'documento', label: 'Documento', priority: 2, sortable: true, width: '168px' },
    { key: 'nutitulo', label: 'Título', priority: 3, sortable: true, numeric: true, width: '92px' },
  ];
  if (!conc.value) return base;
  // Não é ordenável: o dado vem do confronto em memória, não do servidor.
  base.splice(3, 0, { key: '_ato', label: 'Ato', priority: 1, width: '150px' });
  return base;
});

const ATO_ROTULO = { conciliado: 'Conciliado', divergente: 'Divergente', sem_ato: 'Sem ato' };
const ATO_VARIANT = { conciliado: 'success', divergente: 'warning', sem_ato: 'neutral' };
const atoRotulo = (s) => ATO_ROTULO[s] || '-';
const atoVariant = (s) => ATO_VARIANT[s] || 'neutral';
/* O sinal importa: positivo = o Sienge baixou MAIS do que o ato cobrou. */
const sinal = (v) => (Number(v) > 0 ? '+' : '') + moeda(v);

/* Texto do tooltip. "Divergente" sozinho não resolve nada: quem confere precisa
   saber QUAL lado é qual e de quanto é a diferença, sem abrir outra tela. */
function explicarAto(row) {
  const c = row.conciliacao;
  if (!c) return '';

  const partes = [];
  const tipo = c.ato?.tipo === 'cartao' ? 'Cartão' : 'Boleto';

  if (c.status === 'sem_ato') {
    partes.push('Nenhum ato pago encontrado para este cliente.');
    partes.push('Ou o recebimento não é de ato, ou o ato foi cobrado fora do Office, ou o nome está grafado diferente nos dois sistemas.');
  } else {
    partes.push(`${tipo} de ${moeda(c.ato.valor)}, pago em ${dataBR(c.ato.pago_em)}.`);
    partes.push(`Sienge baixou ${moeda(row.valor_baixa)} em ${dataBR(row.data_baixa)}.`);

    if (c.status === 'divergente') {
      const d = Number(c.ato.diferenca);
      partes.push(d > 0
        ? `O Sienge baixou ${moeda(Math.abs(d))} A MAIS do que o ato cobrou.`
        : `O Sienge baixou ${moeda(Math.abs(d))} A MENOS do que o ato cobrou.`);
    } else {
      partes.push('Os valores batem.');
    }
    if (c.ato.idreserva) partes.push(`Reserva ${c.ato.idreserva}.`);
  }

  if (c.ambiguo) {
    partes.push('ATENÇÃO: havia mais de um ato com este nome; foi escolhido o mais próximo em valor e data. Conferir na mão.');
  }
  return partes.join('\n');
}

/* Quem ordena é o servidor (a lista chega ordenada), daí o `manual-sort`. */
const ordenarPor = computed({
  get: () => store.sort,
  set: (v) => store.applySort(v, store.dir),
});
const ordenarDir = computed({
  get: () => store.dir,
  set: (v) => store.applySort(store.sort, v),
});


// ── Formatadores ──
const num = v => Number(v || 0).toLocaleString('pt-BR');
const moeda = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
function dataBR(v) {
  if (!v) return '-';
  const d = new Date(v);
  return isNaN(d) ? '-' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}
function dataHoraBR(v) {
  if (!v) return '-';
  const d = new Date(v);
  return isNaN(d) ? '-' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// ── Seletores (label ↔ id) ──
const labelFor = (o) => `${(o.name || '').toString().trim() || '-'} · ${o.id}`;

const empresaOptions = computed(() => store.empresaOptions.map(labelFor));
const empresaIdByLabel = computed(() => new Map(store.empresaOptions.map(o => [labelFor(o), Number(o.id)])));
const empresaLabelById = computed(() => new Map(store.empresaOptions.map(o => [Number(o.id), labelFor(o)])));
const empresaLabels = computed(() =>
  store.empresas.map(id => empresaLabelById.value.get(Number(id))).filter(Boolean));
function onEmpresasChange(v) {
  store.empresas = (Array.isArray(v) ? v : []).map(l => empresaIdByLabel.value.get(l)).filter(Number.isFinite);
}

const empreendimentoOptions = computed(() => store.empreendimentoOptions.map(labelFor));
const empreendIdByLabel = computed(() => new Map(store.empreendimentoOptions.map(o => [labelFor(o), Number(o.id)])));
const empreendLabelById = computed(() => new Map(store.empreendimentoOptions.map(o => [Number(o.id), labelFor(o)])));
const empreendimentoLabels = computed(() =>
  store.empreendimentos.map(id => empreendLabelById.value.get(Number(id))).filter(Boolean));
function onEmpreendimentosChange(v) {
  store.empreendimentos = (Array.isArray(v) ? v : []).map(l => empreendIdByLabel.value.get(l)).filter(Number.isFinite);
}

// ── Filtros ──
const filtersExpanded = ref(true);

const activeFiltersCount = computed(() => {
  let n = 0;
  if (store.empresas.length) n++;
  if (store.empreendimentos.length) n++;
  return n;
});

function apply() {
  store.applyFilters();
}

function clearFilters() {
  store.clear();
}

onMounted(async () => {
  await store.fetchFiltros();
  // O período já nasce preenchido (mês corrente), então a tela abre com dado
  // na tela em vez de pedir um clique para mostrar o óbvio.
  store.search();
});
</script>
