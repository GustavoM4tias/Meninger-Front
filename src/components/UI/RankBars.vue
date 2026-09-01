<script setup>
/**
 * RankBars — ranking com barra, no lugar da tabela.
 * ─────────────────────────────────────────────────────────────────────────────
 * Uma tabela de "categoria × contagem por etapa" tem 9 colunas de números que
 * ninguém compara de cabeça, estoura no celular e precisa de cabeçalho, rodapé
 * de totais e scroll lateral. Um ranking com barra mostra a MESMA informação e
 * a comparação vira visual: a barra maior é a maior.
 *
 * Cada linha:
 *
 *   1  Terras de São Paulo V                        412   38%
 *      [████████████░░░░░░░░]                     ← composição por etapa
 *      12,4 dias · 68% aprovação                  ← meta opcional
 *
 * Clicar na linha ABRE ela ali mesmo (não em outra tela) com o detalhe da
 * composição. O botão de ação leva ao registro individual.
 *
 *   <RankBars :items="linhas" :segments="etapas" v-model:selected="selecionados" />
 *
 *   linhas = [{ key, label, value, meta, badge, segments: { chave: n } }]
 *   etapas = [{ key, label, bar: 'bg-series-4', text: 'text-series-4' }]
 */
import { computed, ref, onMounted, nextTick } from 'vue';
import EmptyState from './EmptyState.vue';
import Skeleton from './Skeleton.vue';

const props = defineProps({
  items: { type: Array, default: () => [] },
  /* definição das faixas da barra empilhada; sem isto a barra é sólida */
  segments: { type: Array, default: () => [] },
  /* cor da barra sólida quando não há segmentos */
  bar: { type: String, default: 'bg-accent' },
  /* Quantas linhas antes do "ver todas". `0` = automático: com poucas
     categorias mostra todas, com muitas mostra uma fatia proporcional. Número
     fixo de 8 era arbitrário: em 10 empreendimentos escondia 2 sem motivo, e em
     60 escondia 52. */
  limit: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  valueFormat: { type: Function, default: null },
  /* mostra a posição (1, 2, 3...) */
  showRank: { type: Boolean, default: true },
  /* caixa de seleção por linha */
  selectable: { type: Boolean, default: false },
  selected: { type: Array, default: () => [] },
  /* Legenda das faixas. A barra empilhada é um gráfico de 8 séries e legenda
     é obrigatória a partir de 2 (DESIGN-LANGUAGE, "Gráficos"): sem ela a cor
     não identifica nada até a pessoa abrir uma linha. Só aparece quando há
     `segments`. */
  showLegend: { type: Boolean, default: true },
  emptyTitle: { type: String, default: 'Nada para ranquear' },
  emptyText: { type: String, default: 'Ajuste os filtros para ver resultados.' },
  /* Botão de ação da linha. Ícone vazio = sem botão - é o caso da lista que
     trabalha por SELEÇÃO: ali a ação é uma só, sobre o conjunto marcado, e um
     botão por linha ao lado do checkbox oferece dois caminhos para a mesma
     coisa. */
  actionLabel: { type: String, default: 'Abrir' },
  actionIcon: { type: String, default: '' },
});

const emit = defineEmits(['action', 'update:selected']);

const aberto = ref(null);
const verTodas = ref(false);

/* Barras nascem em zero e crescem, uma depois da outra: o ranking se monta de
   cima para baixo em vez de aparecer pronto. */
const montado = ref(false);
onMounted(() => { nextTick(() => requestAnimationFrame(() => { montado.value = true; })); });

const total = computed(() => props.items.reduce((s, i) => s + (i.value || 0), 0));
const max = computed(() => Math.max(1, ...props.items.map((i) => i.value || 0)));

const limiteEfetivo = computed(() => {
  if (props.limit > 0) return props.limit;
  const n = props.items.length;
  if (n <= 12) return n;                                  // poucas: mostra todas
  return Math.min(25, Math.max(10, Math.ceil(n * 0.4)));  // muitas: 40% delas
});

const visiveis = computed(() => (verTodas.value ? props.items : props.items.slice(0, limiteEfetivo.value)));
const escondidas = computed(() => Math.max(0, props.items.length - limiteEfetivo.value));

const fmt = (v) => (props.valueFormat ? props.valueFormat(v) : new Intl.NumberFormat('pt-BR').format(v));
const pctDoTotal = (v) => (total.value ? (v / total.value) * 100 : 0);
/* A largura da barra é relativa ao MAIOR, não ao total: com 40 categorias
   todas as barras ficariam invisíveis se fossem % do total. */
const larguraBarra = (v) => (v / max.value) * 100;

/* Composição interna da barra: cada faixa em % do valor DA LINHA. */
const faixas = (item) => {
  if (!props.segments.length || !item.segments) return [];
  const v = item.value || 0;
  if (!v) return [];
  return props.segments
    .map((s) => ({ ...s, n: item.segments[s.key] || 0 }))
    .filter((s) => s.n > 0)
    .map((s) => ({ ...s, pct: (s.n / v) * 100 }));
};

const abrir = (item) => { aberto.value = aberto.value === item.key ? null : item.key; };

const marcado = (k) => props.selected.includes(k);
function alternar(k) {
  const s = new Set(props.selected);
  s.has(k) ? s.delete(k) : s.add(k);
  emit('update:selected', Array.from(s));
}

/* Selecionar todos vale para a lista INTEIRA, não só as linhas montadas: quem
   marca "todos" quer todos, e não "todos os dez que estão à vista". */
const chaves = computed(() => props.items.map((i) => i.key));
const todosMarcados = computed(() => chaves.value.length > 0 && chaves.value.every((k) => marcado(k)));
const algunsMarcados = computed(() => !todosMarcados.value && chaves.value.some((k) => marcado(k)));

function alternarTodos() {
  emit('update:selected', todosMarcados.value ? [] : [...chaves.value]);
}
</script>

<template>
  <div class="min-w-0">
    <Skeleton v-if="loading && !items.length" variant="row" :lines="5" />

    <EmptyState v-else-if="!items.length" size="sm" icon="fas fa-inbox"
      :title="emptyTitle" :description="emptyText" />

    <template v-else>

    <!-- Cabeçalho da seleção. Só existe quando a lista é selecionável, e o
         traço no meio da caixa indica "alguns marcados". -->
    <div v-if="selectable && items.length"
      class="flex items-center gap-2 pb-2 mb-1 border-b border-line">
      <input type="checkbox" :checked="todosMarcados"
        :indeterminate.prop="algunsMarcados"
        aria-label="Selecionar todos"
        class="shrink-0 accent-accent h-5 w-5" @change="alternarTodos" />
      <span class="text-micro text-ink-muted">
        {{ selected.length ? `${selected.length} de ${items.length} selecionado${selected.length > 1 ? 's' : ''}` : `Selecionar todos (${items.length})` }}
      </span>
      <button v-if="selected.length" type="button"
        class="ml-auto text-micro text-accent hover:underline focus-ring rounded px-1"
        @click="emit('update:selected', [])">
        Limpar
      </button>
    </div>

    <!-- LEGENDA. O quadradinho usa a MESMA classe que pinta a faixa, nunca uma
         cor "parecida" escrita à mão. -->
    <ul v-if="showLegend && segments.length"
      class="flex flex-wrap items-center gap-x-3 gap-y-1.5 pb-2 mb-1 border-b border-line-subtle">
      <li v-for="s in segments" :key="s.key" class="flex items-center gap-1.5 min-w-0">
        <span :class="[s.bar, 'h-2 w-2 rounded-sm shrink-0']"></span>
        <span class="text-micro text-ink-muted truncate max-w-[12rem]">{{ s.label }}</span>
      </li>
    </ul>

    <ul class="divide-y divide-line-subtle -my-1">
      <li v-for="(item, i) in visiveis" :key="item.key" :style="i < 16 ? { '--i': i } : null"
        :class="i < 16 ? 'stagger-in' : ''">

        <!-- LINHA. O corpo inteiro é o botão de abrir, então o alvo é a linha
             toda e não um chevron de 12px. -->
        <div class="flex items-center gap-2 py-2">
          <input v-if="selectable" type="checkbox" :checked="marcado(item.key)"
            :aria-label="`Selecionar ${item.label}`"
            class="shrink-0 accent-accent h-5 w-5" @change="alternar(item.key)" />

          <button type="button" class="flex-1 min-w-0 text-left group focus-ring rounded-lg px-1 -mx-1"
            :aria-expanded="aberto === item.key" @click="abrir(item)">
            <div class="flex items-baseline gap-2 min-w-0">
              <span v-if="showRank"
                class="text-micro font-mono text-ink-subtle tabular-nums w-5 shrink-0">{{ i + 1 }}</span>
              <i v-if="item.icon" :class="[item.icon, item.iconClass || 'text-ink-subtle', 'text-xs shrink-0 w-4 text-center']"></i>
              <span class="text-sm font-medium text-ink truncate flex-1 group-hover:text-accent transition-colors duration-120">
                {{ item.label }}
              </span>
              <span v-if="item.badge"
                :class="['text-micro font-semibold tabular-nums px-1.5 py-0.5 rounded-md shrink-0', item.badge.class]">
                {{ item.badge.text }}
              </span>
              <span class="metric text-sm tabular-nums shrink-0">{{ fmt(item.value) }}</span>
              <span class="text-micro font-mono text-ink-subtle tabular-nums w-10 text-right shrink-0">
                {{ pctDoTotal(item.value).toFixed(0) }}%
              </span>
            </div>

            <!-- A BARRA. Empilhada quando há composição, sólida quando não. -->
            <div class="mt-1.5 h-2 rounded-full bg-surface-sunken overflow-hidden
                        transition-all duration-500 ease-out-expo group-hover:brightness-110"
              :style="{
                width: montado ? `${Math.max(4, larguraBarra(item.value))}%` : '0%',
                transitionDelay: `${Math.min(i, 10) * 40}ms`,
              }">
              <div v-if="faixas(item).length" class="flex h-full gap-[1px]">
                <span v-for="f in faixas(item)" :key="f.key" :class="[f.bar, 'h-full']"
                  :style="{ width: `${f.pct}%` }"></span>
              </div>
              <div v-else :class="[bar, 'h-full w-full rounded-full']"></div>
            </div>

            <p v-if="item.meta" class="mt-1 text-micro text-ink-subtle tabular-nums truncate">{{ item.meta }}</p>
          </button>

          <button v-if="actionIcon" type="button" v-tippy="actionLabel"
            :aria-label="`${actionLabel}: ${item.label}`"
            class="h-10 w-10 shrink-0 grid place-items-center rounded-lg text-ink-subtle
                   hover:text-accent hover:bg-surface-sunken transition-colors duration-120 focus-ring"
            @click.stop="emit('action', item)">
            <i :class="[actionIcon, 'text-xs']"></i>
          </button>
        </div>

        <!-- DETALHE, aberto na própria linha. Antes isso era um modal ou um
             alternador de visualização; agora é um passo, não uma troca de
             tela. -->
        <div v-if="aberto === item.key" class="pb-3 pl-1 pr-11 animate-slide-down">
          <dl class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 rounded-lg bg-surface-sunken/60 p-3">
            <div v-for="f in faixas(item)" :key="f.key" class="min-w-0">
              <dt class="flex items-center gap-1.5 text-micro text-ink-muted truncate">
                <span :class="[f.bar, 'h-2 w-2 rounded-sm shrink-0']"></span>{{ f.label }}
              </dt>
              <dd class="metric text-sm mt-0.5">
                {{ fmt(f.n) }}
                <span class="text-micro font-normal text-ink-subtle tabular-nums">{{ f.pct.toFixed(0) }}%</span>
              </dd>
            </div>
            <div v-if="!faixas(item).length" class="col-span-full text-micro text-ink-subtle">
              Sem composição por etapa para esta linha.
            </div>
          </dl>
          <slot name="detail" :item="item" />
        </div>
      </li>
    </ul>

    </template>

    <button v-if="escondidas && !verTodas" type="button"
      class="mt-2 w-full h-10 rounded-lg border border-line text-xs font-medium text-ink-muted
             hover:bg-surface-sunken hover:text-ink transition-colors duration-120 focus-ring"
      @click="verTodas = true">
      Ver as outras {{ escondidas }}
    </button>
    <button v-else-if="verTodas && escondidas" type="button"
      class="mt-2 w-full h-10 rounded-lg border border-line text-xs font-medium text-ink-muted
             hover:bg-surface-sunken hover:text-ink transition-colors duration-120 focus-ring"
      @click="verTodas = false">
      Mostrar só as {{ limiteEfetivo }} maiores
    </button>
  </div>
</template>
