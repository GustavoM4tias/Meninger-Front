<script setup>
// Extrato do cliente (/comercial/relatorios/extrato-cliente).
//
// A lista é a dos contratos de venda do Sienge que a pessoa pode consultar:
// o servidor já recorta pela alçada (empreendimentos liberados), então a tela
// nunca recebe contrato de fora. Clicar num contrato abre o extrato, lido na
// hora do Sienge, com o PDF oficial para ver ampliado ou baixar.
//
// Filtro e extrato aberto ficam na URL (?empreendimento=, ?q=, ?titulo=): o
// link copiado abre no mesmo ponto para quem também tiver a alçada.
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import { fmtMoney, fmtDate } from '@/utils/format';
import { useIncrementalList } from '@/composables/useIncrementalList';

import PageHelp from '@/components/UI/PageHelp.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import StatRow from '@/components/UI/StatRow.vue';
import DataTable from '@/components/UI/DataTable.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import Spinner from '@/components/UI/Spinner.vue';
import ExtratoModal from './ExtratoModal.vue';
import { ehDocumento, normalizar } from './extrato';

const route = useRoute();
const router = useRouter();

// ── Empreendimentos da alçada ───────────────────────────────────────────────
const empreendimentos = ref([]);
const opcoesEmp = computed(() => empreendimentos.value.map((e) => ({
  value: String(e.id), label: `${e.nome} · ${e.id} (${e.contratos})`,
})));
const emps = ref(String(route.query.empreendimento || '').split(',').filter(Boolean));

async function carregarEmpreendimentos() {
  try {
    const r = await requestWithAuth('/extrato-cliente/empreendimentos');
    empreendimentos.value = r.empreendimentos || [];
  } catch (e) {
    erro.value = e.message || 'Não foi possível listar os empreendimentos.';
  }
}

// ── Contratos ───────────────────────────────────────────────────────────────
const busca = ref(String(route.query.q || ''));
const contratos = ref([]);
const precisaFiltro = ref(false);
const aviso = ref('');
const carregando = ref(false);
const carregou = ref(false);
const erro = ref('');

// A busca vai ao servidor quando é CPF/CNPJ (o documento mora no cadastro do
// Sienge, não na lista) ou quando não há empreendimento escolhido (a lista
// inteira pode passar do limite). Com empreendimento, o texto filtra aqui.
const buscaNoServidor = computed(() => {
  const q = busca.value.trim();
  if (!q) return '';
  if (ehDocumento(q)) return q;
  return !emps.value.length && q.length >= 3 ? q : '';
});

let seq = 0;
async function carregar() {
  const meu = ++seq;
  carregando.value = true;
  erro.value = '';
  try {
    const qs = new URLSearchParams();
    if (emps.value.length) qs.set('empreendimento', emps.value.join(','));
    if (buscaNoServidor.value) qs.set('q', buscaNoServidor.value);
    const r = await requestWithAuth(`/extrato-cliente/contratos?${qs}`);
    if (meu !== seq) return;
    contratos.value = r.contratos || [];
    precisaFiltro.value = !!r.precisaFiltro;
    aviso.value = r.aviso || '';
    carregou.value = true;
  } catch (e) {
    if (meu !== seq) return;
    erro.value = e.message || 'Não foi possível carregar os contratos.';
    contratos.value = [];
  } finally {
    if (meu === seq) carregando.value = false;
  }
}

function sincronizarUrl(extra = {}) {
  router.replace({
    query: {
      ...route.query,
      empreendimento: emps.value.length ? emps.value.join(',') : undefined,
      q: busca.value.trim() || undefined,
      ...extra,
    },
  });
}

watch(emps, () => {
  recorte.value = 'todos';
  ultimaBuscaServidor = buscaNoServidor.value;
  sincronizarUrl();
  carregar();
});

let timerBusca = null;
let ultimaBuscaServidor = buscaNoServidor.value;
watch(busca, () => {
  clearTimeout(timerBusca);
  timerBusca = setTimeout(() => {
    sincronizarUrl();
    // Só volta ao servidor se o que ele precisa saber mudou.
    if (buscaNoServidor.value !== ultimaBuscaServidor) { ultimaBuscaServidor = buscaNoServidor.value; carregar(); }
  }, 400);
});

onMounted(async () => {
  await carregarEmpreendimentos();
  await carregar();
  if (route.query.titulo) abrirPorUrl();
});

// ── Recorte e busca local ───────────────────────────────────────────────────
const recorte = ref('todos');
const ativos = (c) => c.situacao !== 'Cancelado';

const kpis = computed(() => {
  const L = contratos.value;
  const nAtivos = L.filter(ativos).length;
  const clientes = new Set(L.map((c) => c.clienteId)).size;
  const nEmps = new Set(L.map((c) => c.empreendimento.id)).size;
  return [
    { key: 'todos', label: 'Contratos', raw: L.length, icon: 'fas fa-file-contract', tone: 'accent',
      hint: `${clientes} ${clientes === 1 ? 'cliente' : 'clientes'} · ${nEmps} ${nEmps === 1 ? 'empreendimento' : 'empreendimentos'}`,
      tooltip: 'Clique para ver todos os contratos' },
    { key: 'ativos', label: 'Ativos', raw: nAtivos, icon: 'fas fa-circle-check', tone: 'pos',
      hint: 'contratos emitidos', tooltip: 'Clique para ver só os ativos' },
    { key: 'cancelados', label: 'Cancelados', raw: L.length - nAtivos, icon: 'fas fa-ban', tone: L.length - nAtivos ? 'warn' : 'neutral',
      hint: 'distrato ou cancelamento', tooltip: 'Clique para ver só os cancelados' },
  ];
});

function escolherKpi(item) {
  const key = item?.key ?? item;
  recorte.value = key === 'todos' || recorte.value === key ? 'todos' : key;
}

const visiveis = computed(() => {
  const q = busca.value.trim();
  const termo = q && !ehDocumento(q) ? normalizar(q) : '';
  return contratos.value.filter((c) => {
    if (recorte.value === 'ativos' && !ativos(c)) return false;
    if (recorte.value === 'cancelados' && ativos(c)) return false;
    if (termo) {
      const alvo = normalizar(`${c.clientes.map((x) => x.nome).join(' ')} ${c.contrato} ${c.titulo} ${c.unidades.map((u) => u.nome).join(' ')} ${c.empreendimento.nome}`);
      if (!alvo.includes(termo)) return false;
    }
    return true;
  });
});

const ordem = ref({ by: 'data', dir: 'desc' });
const COLUNAS = [
  { key: 'cliente', label: 'Cliente', priority: 1, sortable: true },
  { key: 'unidade', label: 'Unidade', priority: 2, sortable: true, width: '10rem' },
  { key: 'empreendimento', label: 'Empreendimento', priority: 2, sortable: true, value: (c) => c.empreendimento.nome },
  { key: 'contrato', label: 'Contrato', priority: 3, sortable: true, width: '9rem' },
  { key: 'data', label: 'Data', priority: 3, sortable: true, width: '7rem' },
  { key: 'valor', label: 'Valor', priority: 2, numeric: true, sortable: true, width: '8.5rem' },
  { key: 'situacao', label: 'Situação', priority: 1, sortable: true, width: '7.5rem' },
];

const ordenadas = computed(() => {
  const { by, dir } = ordem.value;
  const col = COLUNAS.find((c) => c.key === by);
  const val = (l) => (col?.value ? col.value(l) : l[by]);
  const mul = dir === 'asc' ? 1 : -1;
  return [...visiveis.value].sort((a, b) => {
    const x = val(a); const y = val(b);
    if (x == null || x === '') return 1;
    if (y == null || y === '') return -1;
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * mul;
    return String(x).localeCompare(String(y), 'pt-BR', { numeric: true, sensitivity: 'base' }) * mul;
  });
});

const inc = useIncrementalList(ordenadas, { step: 50 });

const ROTULO_RECORTE = { ativos: 'só ativos', cancelados: 'só cancelados' };
const linhaEstado = computed(() => {
  const V = visiveis.value;
  const total = V.reduce((s, c) => s + (c.valor || 0), 0);
  return `${V.length} de ${contratos.value.length} contratos · ${fmtMoney(total, { casas: 0 })}`;
});

// ── Extrato (modal) ─────────────────────────────────────────────────────────
const aberto = ref(false);
const selecionado = ref(null);

function abrirExtrato(c, clienteId = null) {
  selecionado.value = { ...c, clienteEscolhido: clienteId || c.clienteId };
  aberto.value = true;
  sincronizarUrl({ titulo: String(c.titulo), cliente: clienteId ? String(clienteId) : undefined });
}

// Link com ?titulo=: abre o extrato mesmo que o contrato não esteja na lista
// carregada (o servidor confere a alçada do mesmo jeito).
function abrirPorUrl() {
  const titulo = Number(route.query.titulo);
  if (!titulo) return;
  const c = contratos.value.find((x) => x.titulo === titulo) || { titulo, clienteId: null, clientes: [], unidades: [] };
  abrirExtrato(c, Number(route.query.cliente) || null);
}

watch(aberto, (v) => { if (!v) sincronizarUrl({ titulo: undefined, cliente: undefined }); });
</script>

<template>
  <div class="space-y-4">
    <Teleport to="#relatorio-acoes" defer>
      <PageHelp
        storage-key="relatorio-extrato-cliente"
        title="Como usar o Extrato do Cliente"
        intro="Consulta o extrato financeiro de cada contrato direto do Sienge: parcelas, pagamentos, saldo em aberto e o PDF oficial do extrato."
        :steps="[
          { title: 'Encontre o contrato', text: 'A lista traz só os contratos dos empreendimentos liberados para você. Escolha o empreendimento ou digite o nome do cliente, a unidade, o número do contrato ou o CPF/CNPJ.' },
          { title: 'Abra o extrato', text: 'Clique no cliente. O extrato é lido na hora do Sienge: cada parcela com vencimento, valor, saldo atualizado e os pagamentos dela.' },
          { title: 'Confira os números do topo', text: 'Recebido, em aberto, vencido e outras baixas. Clique num cartão para ver só aquelas parcelas; clique de novo para voltar a todas.' },
          { title: 'Veja ou baixe o PDF', text: 'Ver PDF abre o extrato oficial do Sienge em tela cheia; Baixar PDF salva o arquivo para enviar ao cliente.' },
        ]"
        :tips="[
          'Recebido conta só dinheiro que entrou (recebimento e adiantamento). Reparcelamento, distrato, promoção e outras baixas aparecem à parte.',
          'O botão de ampliar no extrato ocupa a tela inteira, para conferir muitas parcelas de uma vez.',
          'Clique numa parcela para ver cada pagamento dela: data, juros, acréscimo, desconto e valor líquido.',
          'O filtro e o extrato aberto ficam no endereço da página: copie o link para mandar a mesma consulta a um colega com a mesma alçada.',
          'Contrato com mais de um comprador: escolha o cliente no topo do extrato.',
        ]"
      />
    </Teleport>

    <!-- Filtros: os dois que importam, sempre à vista -->
    <div class="flex flex-col sm:flex-row sm:items-end gap-3">
      <div class="w-full sm:w-96">
        <MultiSelector v-model="emps" :options="opcoesEmp" :page-size="200"
          label="Empreendimento" placeholder="Todos os liberados para você" />
      </div>
      <div class="w-full sm:w-80">
        <Input v-model="busca" label="Buscar" icon-left="fas fa-magnifying-glass"
          placeholder="Cliente, unidade, contrato ou CPF" />
      </div>
      <Button variant="secondary" icon="fas fa-rotate-right" :loading="carregando" class="sm:ml-auto" @click="carregar">
        <span class="hidden sm:inline">Atualizar</span>
      </Button>
    </div>

    <div v-if="erro"
      class="rounded-xl border border-data-neg/25 bg-data-neg/10 p-4 text-sm text-data-neg flex items-center justify-between gap-3">
      <span class="flex items-center gap-2"><i class="fas fa-circle-exclamation"></i>{{ erro }}</span>
      <Button variant="outline" size="sm" icon="fas fa-rotate-right" @click="carregar">Tentar novamente</Button>
    </div>

    <div v-else-if="!carregou" class="space-y-4">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <Skeleton v-for="i in 3" :key="i" variant="stat" />
      </div>
      <Skeleton variant="table" :lines="8" />
    </div>

    <EmptyState v-else-if="!empreendimentos.length" icon="fas fa-lock" title="Nenhum empreendimento liberado"
      description="Você ainda não tem empreendimentos liberados para consulta. Peça a liberação na tela de Alçadas." />

    <EmptyState v-else-if="precisaFiltro" icon="fas fa-filter" title="Escolha um empreendimento ou busque um cliente"
      description="São muitos contratos para listar de uma vez. Escolha o empreendimento acima ou digite o nome, a unidade ou o CPF do cliente." />

    <template v-else>
      <StatRow :items="kpis" :cols="{ sm: 3, md: 3, lg: 3 }" selectable :active-key="recorte" @select="escolherKpi" />

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted">
        <span class="tabular-nums">{{ linhaEstado }}</span>
        <button v-if="recorte !== 'todos'" type="button"
          class="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-accent/10 text-accent font-medium focus-ring"
          @click="recorte = 'todos'">
          {{ ROTULO_RECORTE[recorte] }} <i class="fas fa-xmark text-micro"></i>
        </button>
        <span v-if="aviso" class="text-data-warn"><i class="fas fa-triangle-exclamation mr-1"></i>{{ aviso }}</span>
      </div>

      <DataTable :columns="COLUNAS" :rows="inc.visiveis.value" row-key="id" :loading="carregando" manual-sort clickable
        sticky-header density="compact" more-label="Ver mais campos"
        v-model:sort-by="ordem.by" v-model:sort-dir="ordem.dir"
        empty-icon="fas fa-magnifying-glass" empty-title="Nenhum contrato encontrado"
        empty-text="Confira a busca, troque o empreendimento ou clique de novo no cartão do topo."
        @row-click="(c) => abrirExtrato(c)">
        <template #cell-cliente="{ row }">
          <div class="min-w-0">
            <p class="font-semibold text-ink leading-tight truncate">{{ row.cliente || 'Sem cliente' }}</p>
            <p v-if="row.clientes.length > 1" class="text-micro text-ink-subtle truncate"
              :title="row.clientes.map((c) => c.nome).join(' · ')">
              + {{ row.clientes.length - 1 }} {{ row.clientes.length > 2 ? 'compradores' : 'comprador' }}
            </p>
          </div>
        </template>
        <template #cell-unidade="{ row }">
          <span class="text-sm text-ink">{{ row.unidade || '-' }}</span>
        </template>
        <template #cell-empreendimento="{ row }">
          <span class="text-xs text-ink-muted line-clamp-2" :title="row.empreendimento.nome">{{ row.empreendimento.nome }}</span>
        </template>
        <template #cell-contrato="{ row }">
          <span class="tabular-nums text-sm">{{ row.contrato }}</span>
          <p class="text-micro text-ink-subtle tabular-nums">título {{ row.titulo }}</p>
        </template>
        <template #cell-data="{ row }"><span class="tabular-nums text-sm">{{ fmtDate(row.data) }}</span></template>
        <template #cell-valor="{ row }"><span class="metric tabular-nums">{{ fmtMoney(row.valor) }}</span></template>
        <template #cell-situacao="{ row }">
          <Badge size="sm" :variant="row.situacao === 'Cancelado' ? 'warning' : 'success'">
            {{ row.situacao === 'Cancelado' ? 'Cancelado' : 'Ativo' }}
          </Badge>
        </template>
        <template #actions="{ row }">
          <Button size="sm" variant="ghost" icon="fas fa-file-invoice-dollar" @click.stop="abrirExtrato(row)">
            <span class="hidden lg:inline">Extrato</span>
          </Button>
        </template>
      </DataTable>

      <div v-if="!inc.acabou.value" :ref="(el) => inc.observar(el)"
        class="py-6 flex items-center justify-center gap-2 text-micro text-ink-subtle">
        <Spinner size="sm" />
        carregando mais {{ Math.min(inc.step, inc.restantes.value) }} de {{ inc.restantes.value }} restantes
      </div>
    </template>

    <ExtratoModal v-model:open="aberto" :contrato="selecionado" />
  </div>
</template>
