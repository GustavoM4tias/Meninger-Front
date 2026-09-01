<script setup>
/**
 * Aba "Travadas no ERP" da tela Sienge (o cabeçalho vive no hub, ../Index.vue).
 *
 * A tela É a listagem: uma pergunta só - quais reservas entraram em "Envio
 * Sienge" há mais tempo que o prazo e ainda não viraram contrato no Sienge.
 *
 * O motivo do erro não dá para trazer: o CV nunca preenche o campo de problema
 * da integração e a API não expõe nada (405 em todos os caminhos). A lista
 * aponta a reserva; o diagnóstico é no painel do CV.
 *
 * A régua (prazo, frequência, quem recebe o aviso) mora na aba Configuração.
 */
import { computed, onMounted, reactive, ref } from 'vue';
import { useToast } from 'vue-toastification';
import { useEnvioSiengeStore } from '@/stores/Sienge/envioSiengeStore';

import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Surface from '@/components/UI/Surface.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import StatRow from '@/components/UI/StatRow.vue';
import FilterBar from '@/components/UI/FilterBar.vue';
import DataTable from '@/components/UI/DataTable.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Spinner from '@/components/UI/Spinner.vue';
import { useIncrementalList } from '@/composables/useIncrementalList';
import { pedirConfirmacao } from '@/composables/useConfirm';

/* O motivo do erro só existe na reserva, dentro do painel do CV: a API não
   expõe nada de integração. Sem este link, a lista dizia QUAL reserva conferir
   e obrigava a pessoa a procurá-la à mão no CV. Mesma URL usada na tela de
   Reservas e no Cancelamento. */
const cvReservaUrl = (r) => (r?.idreserva
    ? `https://menin.cvcrm.com.br/gestor/comercial/reservas/${r.idreserva}/administrar`
    : null);

const store = useEnvioSiengeStore();
const toast = useToast();

// ─── Tempo parado ───────────────────────────────────────────────────────────
// O relógio vem do webhook do ato, que o CV dispara ao entrar na etapa. Reserva
// que nunca acionou esse fluxo cai no último recurso (a data da reserva) e vem
// marcada como estimada - aí o número é MAIOR que o real, e a tela precisa
// dizer isso, senão um "462 dias" parece um caso perdido quando não é.
function tempo(min) {
    const m = Number(min) || 0;
    if (m < 120) return `${m} min`;
    if (m < 2880) return `${Math.round(m / 60)} h`;
    return `${Math.round(m / 1440)} dias`;
}

const DIA = 1440;

// ─── Filtros ────────────────────────────────────────────────────────────────
function filtrosVazios() {
    return { q: '', empreendimento: '', desde: '' };
}
const filtros = reactive(filtrosVazios());
const aplicados = reactive(filtrosVazios());

const empreendimentos = computed(() => {
    const nomes = [...new Set(store.itens.map(i => i.empreendimento).filter(Boolean))];
    nomes.sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return [{ value: '', label: 'Todos' }, ...nomes.map(n => ({ value: n, label: n }))];
});

/* Conta DIMENSÕES preenchidas, não valores. */
const filtrosAtivos = computed(() =>
    ['q', 'empreendimento', 'desde'].filter(k => String(aplicados[k] ?? '').trim() !== '').length);

function aplicar() { Object.assign(aplicados, JSON.parse(JSON.stringify(filtros))); }
function limpar() {
    Object.assign(filtros, filtrosVazios());
    Object.assign(aplicados, filtrosVazios());
}

// ─── KPIs que recortam a lista ──────────────────────────────────────────────
const RECORTES = {
    ato: { rotulo: 'só com ato pago', filtro: (i) => !!i.ato_pago },
    semana: { rotulo: 'só há 7 dias ou mais', filtro: (i) => Number(i.minutos_esperando) >= 7 * DIA },
};
const recorte = ref('');

/* O mesmo gesto liga e desliga. "Travadas" volta ao conjunto inteiro, e o
   cartão que não recorta nada (Mais antiga) não muda a lista - clicar nele
   deixaria um chip mentindo sobre o que está filtrado. */
function aoClicarKpi(item) {
    if (!RECORTES[item.key]) { recorte.value = ''; return; }
    recorte.value = recorte.value === item.key ? '' : item.key;
}

const inteiro = (v) => Math.round(v).toLocaleString('pt-BR');

const kpiCards = computed(() => {
    const itens = store.itens;
    const comAto = itens.filter(RECORTES.ato.filtro).length;
    const semanaOuMais = itens.filter(RECORTES.semana.filtro).length;
    const maisAntiga = itens.reduce((max, i) => Math.max(max, Number(i.minutos_esperando) || 0), 0);

    return [
        {
            key: 'total', label: 'Travadas', raw: itens.length, format: inteiro,
            icon: 'fas fa-triangle-exclamation', tone: itens.length ? 'neg' : 'pos',
            hint: `parada há mais de ${store.minutosLimite} min`,
            tooltip: 'Clique para voltar à lista inteira',
        },
        {
            key: 'ato', label: 'Com ato pago', raw: comAto, format: inteiro,
            icon: 'fas fa-money-bill-wave', tone: comAto ? 'neg' : 'neutral',
            hint: comAto ? 'o dinheiro entrou e o ERP não sabe' : 'nenhuma com ato pago',
            tooltip: 'Clique para ver só as que já tiveram o ato pago',
        },
        {
            key: 'semana', label: 'Há 7 dias ou mais', raw: semanaOuMais, format: inteiro,
            icon: 'fas fa-hourglass-half', tone: semanaOuMais ? 'warn' : 'neutral',
            hint: 'passaram de uma semana na fila',
            tooltip: 'Clique para ver só as paradas há uma semana ou mais',
        },
        {
            key: '_maisantiga', label: 'Mais antiga', value: itens.length ? tempo(maisAntiga) : '-',
            icon: 'fas fa-clock-rotate-left', tone: 'neutral',
            hint: 'tempo da que está parada há mais tempo',
        },
    ];
});

// ─── Lista: filtrar → ordenar → fatiar ──────────────────────────────────────
const filtradas = computed(() => {
    const q = aplicados.q.trim().toLowerCase();
    const desdeMin = Number(aplicados.desde) > 0 ? Number(aplicados.desde) * DIA : 0;
    const corte = RECORTES[recorte.value]?.filtro || null;

    return store.itens.filter((i) => {
        if (corte && !corte(i)) return false;
        if (aplicados.empreendimento && i.empreendimento !== aplicados.empreendimento) return false;
        if (desdeMin && (Number(i.minutos_esperando) || 0) < desdeMin) return false;
        if (q) {
            const feno = [i.idreserva, i.empreendimento, i.unidade, i.titular_nome]
                .filter(Boolean).join(' ').toLowerCase();
            if (!feno.includes(q)) return false;
        }
        return true;
    });
});

const ordem = reactive({ by: 'minutos_esperando', dir: 'desc' });

const VALOR = {
    idreserva: (r) => Number(r.idreserva) || 0,
    empreendimento: (r) => `${r.empreendimento || ''} ${r.unidade || ''}`,
    titular_nome: (r) => r.titular_nome || '',
    minutos_esperando: (r) => Number(r.minutos_esperando) || 0,
    ato_pago: (r) => (r.ato_pago ? 1 : 0),
};

const ordenadas = computed(() => {
    const get = VALOR[ordem.by] || VALOR.minutos_esperando;
    const fator = ordem.dir === 'asc' ? 1 : -1;
    return [...filtradas.value].sort((a, b) => {
        const va = get(a);
        const vb = get(b);
        if (typeof va === 'string' || typeof vb === 'string') {
            return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true, sensitivity: 'base' }) * fator;
        }
        return (va - vb) * fator;
    });
});

const inc = useIncrementalList(ordenadas, { step: 50 });

/* Duas ordens diferentes, de propósito.

   No MONITOR vale a ordem do array, que é a de leitura: qual reserva, onde, de
   quem, há quanto tempo, e se o ato foi pago. As larguras são declaradas porque
   sem elas a tabela dava metade da linha para "Parada há" (um número de duas
   palavras) e espremia empreendimento e titular, que são o que se lê.

   No CELULAR vale `priority`: 1 é o título do card (qual reserva e há quanto
   tempo - as duas coisas que fazem alguém abrir esta aba), 2 é o corpo. Nada
   ficou em 3: com cinco colunas, esconder o titular atrás de um toque custaria
   mais do que economiza. */
const COLUNAS = [
    { key: 'idreserva', label: 'Reserva', priority: 1, sortable: true, width: '7.5rem' },
    { key: 'empreendimento', label: 'Empreendimento / unidade', priority: 2, sortable: true, width: '34%' },
    { key: 'titular_nome', label: 'Titular', priority: 2, sortable: true, width: '26%' },
    { key: 'minutos_esperando', label: 'Parada há', priority: 1, sortable: true, numeric: true, width: '8.5rem' },
    { key: 'ato_pago', label: 'Ato', priority: 2, sortable: true, width: '6rem' },
];

// ─── Ações ──────────────────────────────────────────────────────────────────
/**
 * "Verificar e avisar" manda notificação para gente de verdade, então a
 * confirmação diz QUANTAS pessoas e por QUANTAS reservas - "tem certeza?" não
 * é consequência. "Verificar" sozinho só recalcula e passa direto.
 */
async function verificar(notificar) {
    if (notificar) {
        const quantos = store.settings?.notify_user_ids?.length || 0;
        if (!await pedirConfirmacao({
            title: 'Verificar e avisar agora?',
            consequence: quantos
                ? `${quantos} pessoa(s) recebem uma notificação por reserva travada que ainda não tinha sido avisada.`
                : 'Ninguém está na lista de destinatários (aba Configuração), então a verificação roda e não avisa ninguém.',
            hint: 'Cada reserva gera um aviso só - reserva já avisada não avisa de novo.',
            tone: 'accent',
            confirmLabel: 'Verificar e avisar',
        })) return;
    }
    try {
        await store.run(notificar);
        toast.success(notificar
            ? 'Verificação concluída. Quem está na lista de avisos foi notificado.'
            : 'Verificação concluída.');
    } catch (err) {
        toast.error(err.message || 'Falha ao verificar.');
    }
}

const ultimaRodada = computed(() =>
    store.lastRunAt ? new Date(store.lastRunAt).toLocaleString('pt-BR') : '');

onMounted(() => { store.fetchAll().catch(() => {}); });
</script>

<template>
  <div>
    <!-- Toolbar da aba (o cabeçalho vive no hub Sienge) -->
    <div class="flex items-center justify-between gap-2 mb-3 flex-wrap">
      <p v-if="ultimaRodada" class="text-xs text-ink-subtle">
        Última verificação: <span class="font-mono tabular-nums">{{ ultimaRodada }}</span>
      </p>
      <span v-else></span>

      <div class="flex items-center gap-2">
        <Button variant="secondary" size="sm" icon="fas fa-rotate" :loading="store.loading"
          title="Recalcula a lista sem avisar ninguém."
          @click="verificar(false)">
          <span class="hidden sm:inline">Verificar</span>
        </Button>
        <Button variant="primary" size="sm" icon="fas fa-bell" :loading="store.loading"
          title="Recalcula e manda o aviso para quem está na lista da aba Configuração."
          @click="verificar(true)">
          Verificar e avisar
        </Button>
      </div>
    </div>

    <div v-if="store.error"
      class="mb-4 rounded-xl border border-data-neg/30 bg-data-neg/10 px-4 py-3 text-sm text-data-neg
             flex items-center gap-3 flex-wrap">
      <i class="fas fa-circle-exclamation"></i>
      <span class="flex-1 min-w-0">{{ store.error }}</span>
      <Button variant="outline" size="sm" icon="fas fa-rotate-right" @click="store.fetchAll()">
        Tentar novamente
      </Button>
    </div>

    <div v-if="!store.loaded" class="space-y-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <Skeleton v-for="i in 4" :key="i" variant="stat" />
      </div>
      <Skeleton variant="table" :lines="8" />
    </div>

    <div v-else class="space-y-4">
      <StatRow :items="kpiCards" :cols="{ sm: 2, md: 4, lg: 4 }"
        selectable :active-key="recorte" @select="aoClicarKpi" />

      <FilterBar :active-count="filtrosAtivos" :loading="store.loading" :cols="3"
        @apply="aplicar" @clear="limpar">
        <Input v-model="filtros.q" label="Busca"
          placeholder="Reserva, empreendimento, unidade ou titular" />
        <Select v-model="filtros.empreendimento" label="Empreendimento"
          :options="empreendimentos" placeholder="Todos" />
        <Input v-model="filtros.desde" type="number" min="0" label="Parada há pelo menos (dias)"
          hint="Deixe vazio para ver todas." />
      </FilterBar>

      <!-- Linha de estado: impede alguém de ler uma lista recortada achando
           que é o total. -->
      <p class="text-xs text-ink-muted flex items-center gap-2 flex-wrap">
        <span>
          <span v-if="filtradas.length !== store.itens.length" class="tabular-nums">
            {{ filtradas.length }} de
          </span>
          <span class="tabular-nums">{{ store.itens.length }}</span>
          reserva(s) travada(s) há mais de
          <span class="font-mono tabular-nums">{{ store.minutosLimite }}</span> min
        </span>
        <button v-if="recorte" type="button"
          class="inline-flex items-center gap-1.5 px-2 h-6 rounded-full border border-accent/20
                 bg-accent-soft text-accent focus-ring"
          @click="recorte = ''">
          {{ RECORTES[recorte].rotulo }}
          <i class="fas fa-times text-micro"></i>
        </button>
      </p>

      <Surface padding="none" class="overflow-hidden">
        <div class="p-3 sm:p-4">
          <DataTable
            :columns="COLUNAS"
            :rows="inc.visiveis.value"
            row-key="idreserva"
            manual-sort
            density="compact"
            v-model:sort-by="ordem.by"
            v-model:sort-dir="ordem.dir"
            more-label="Ver mais campos"
            empty-icon="fas fa-circle-check"
            :empty-title="store.itens.length ? 'Nenhuma reserva com esses filtros' : 'Nenhuma venda travada'"
            :empty-text="store.itens.length
              ? 'Ajuste ou limpe os filtros da barra acima.'
              : 'Tudo que entrou em Envio Sienge chegou ao Sienge.'">

            <!-- O número É o atalho: leva direto para a reserva no CV, que é
                 onde o motivo do erro está escrito. -->
            <template #cell-idreserva="{ row }">
              <a :href="cvReservaUrl(row)" target="_blank" rel="noopener" @click.stop
                v-tippy="'Abrir a reserva no CV CRM'"
                class="inline-flex items-center gap-1.5 font-mono tabular-nums font-semibold
                       text-ink hover:text-accent transition-colors duration-120 focus-ring rounded px-1 -mx-1">
                {{ row.idreserva }}
                <i class="fas fa-arrow-up-right-from-square text-micro opacity-50"></i>
              </a>
            </template>

            <template #cell-minutos_esperando="{ row }">
              <span class="tabular-nums" :class="row.ato_pago ? 'text-data-neg font-medium' : 'text-ink'">
                {{ tempo(row.minutos_esperando) }}
              </span>
              <span v-if="row.entrada_estimada" class="block text-micro text-ink-subtle"
                title="Esta reserva nunca acionou o fluxo do ato, então o tempo é estimado pela data da reserva e fica maior que o real.">
                estimado
              </span>
            </template>

            <template #cell-empreendimento="{ row }">
              <span class="text-ink">{{ row.empreendimento }}</span>
              <span class="block text-xs text-ink-subtle">{{ row.unidade }}</span>
            </template>

            <template #cell-ato_pago="{ row }">
              <Badge v-if="row.ato_pago" variant="danger" size="sm">
                <i class="fas fa-money-bill-wave"></i>pago
              </Badge>
              <span v-else class="text-ink-subtle">-</span>
            </template>

            <template #cell-titular_nome="{ row }">
              <span class="text-ink-muted">{{ row.titular_nome }}</span>
            </template>

            <!-- No celular esta ação vira o alvo de 40px do cabeçalho do card,
                 onde o link do número seria pequeno demais para o polegar. -->
            <template #actions="{ row }">
              <a :href="cvReservaUrl(row)" target="_blank" rel="noopener" @click.stop
                v-tippy="'Administrar no CV'" aria-label="Administrar no CV"
                class="h-10 w-10 md:h-8 md:w-8 grid place-items-center rounded-lg text-ink-subtle
                       hover:text-accent hover:bg-surface-sunken transition-colors duration-120 focus-ring">
                <i class="fas fa-arrow-up-right-from-square text-xs"></i>
              </a>
            </template>
          </DataTable>

          <!-- Rolagem incremental: diga quantos faltam, que é a informação que
               a paginação dava de graça. -->
          <div v-if="!inc.acabou.value" :ref="el => inc.observar(el)"
            class="py-6 flex items-center justify-center gap-2 text-micro text-ink-subtle">
            <Spinner size="sm" />
            carregando mais {{ Math.min(inc.step, inc.restantes.value) }} de
            {{ inc.restantes.value }} restantes
          </div>
        </div>
      </Surface>
    </div>
  </div>
</template>
