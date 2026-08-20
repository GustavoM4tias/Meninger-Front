<script setup>
/**
 * DataTable — a tabela de trabalho do Office.
 * ─────────────────────────────────────────────────────────────────────────────
 * DESKTOP PRIMEIRO, mas com PARIDADE: o monitor é onde a tabela é projetada
 * (densidade alta, cabeçalho fixo, ordenação, número à direita), e o celular
 * faz TUDO que o monitor faz. Nada é exclusivo de um dispositivo: o que muda é
 * o arranjo, nunca o que dá para fazer.
 *
 * Cada coluna declara uma PRIORIDADE, e é ela que decide a ORDEM de aparição
 * no estreito - não o que existe:
 *
 *   priority 1 → título do card no celular
 *   priority 2 → corpo do card
 *   priority 3 → dentro de "Ver detalhes", a um toque de distância
 *
 * Ordenar, agir na linha e ler qualquer campo funcionam nos dois. Ninguém
 * precisa arrastar a tela de lado, e ninguém precisa de um computador para
 * terminar o que começou no celular.
 *
 *   const colunas = [
 *     { key: 'nome',  label: 'Cliente',   priority: 1, sortable: true },
 *     { key: 'valor', label: 'Valor',     priority: 1, numeric: true, format: fmtBRL },
 *     { key: 'data',  label: 'Assinado',  priority: 2, sortable: true },
 *     { key: 'obs',   label: 'Observação',priority: 3 },
 *   ];
 *
 *   <DataTable :columns="colunas" :rows="linhas" row-key="id" :loading="carregando"
 *              @row-click="abrirDetalhe">
 *     <template #cell-valor="{ value }"><b class="tabular-nums">{{ value }}</b></template>
 *     <template #actions="{ row }"><IconButton icon="fas fa-pen" @click.stop="editar(row)" /></template>
 *   </DataTable>
 */
import { ref, computed } from 'vue';
import EmptyState from './EmptyState.vue';
import Skeleton from './Skeleton.vue';

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  rowKey: { type: String, default: 'id' },
  loading: { type: Boolean, default: false },
  /* ordenação interna; passe false quando o servidor já ordena */
  sortable: { type: Boolean, default: true },
  sortBy: { type: String, default: '' },
  sortDir: { type: String, default: 'asc' },
  /* Ordenação CONTROLADA: a tabela mostra os controles e avisa quando mudam,
     mas quem ordena é quem chamou. Necessário quando a lista é longa e chega
     aqui já fatiada (scroll incremental) ou já ordenada pelo servidor - sem
     isso a tabela ordenaria só o pedaço que recebeu, o que é pior que não
     ordenar. */
  manualSort: { type: Boolean, default: false },
  /* densidade: compact para listagem longa, comfortable para leitura */
  density: { type: String, default: 'compact' },   // compact | comfortable
  emptyIcon: { type: String, default: 'far fa-folder-open' },
  emptyTitle: { type: String, default: 'Nenhum resultado' },
  emptyText: { type: String, default: 'Ajuste os filtros para ver mais linhas.' },
  clickable: { type: Boolean, default: false },
  /* rótulo do botão que abre o resto dos campos no celular */
  moreLabel: { type: String, default: 'Ver detalhes' },
  /* Abre a linha ali mesmo, com o slot #expanded. Serve para mostrar o
     registro inteiro sem trocar de tela - e mantém a ordenação e as colunas
     da tabela, coisa que uma lista de cartões não tem. */
  expandable: { type: Boolean, default: false },
});

const emit = defineEmits(['row-click', 'update:sortBy', 'update:sortDir']);

/* ── ordenação ──────────────────────────────────────────────────────────────
   Estado local só quando `sortable` está ligado e ninguém controla de fora. */
const localSort = ref({ by: props.sortBy, dir: props.sortDir });

function toggleSort(col) {
  if (!props.sortable || !col.sortable) return;
  const s = localSort.value;
  if (s.by === col.key) s.dir = s.dir === 'asc' ? 'desc' : 'asc';
  else { s.by = col.key; s.dir = 'asc'; }
  emit('update:sortBy', s.by);
  emit('update:sortDir', s.dir);
}

const sorted = computed(() => {
  const { by, dir } = localSort.value;
  if (props.manualSort || !props.sortable || !by) return props.rows;
  const col = props.columns.find((c) => c.key === by);
  const mul = dir === 'asc' ? 1 : -1;
  return [...props.rows].sort((a, b) => {
    const va = col?.sortValue ? col.sortValue(a) : a[by];
    const vb = col?.sortValue ? col.sortValue(b) : b[by];
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mul;
    return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true, sensitivity: 'base' }) * mul;
  });
});

/* Colunas ordenáveis: alimentam o seletor de ordenação do celular, para que
   ordenar não seja um privilégio de quem está no monitor. */
const sortableCols = computed(() => (props.sortable ? props.columns.filter((c) => c.sortable) : []));

function setSortKey(key) {
  const s = localSort.value;
  s.by = key;
  if (!key) s.dir = 'asc';
  emit('update:sortBy', s.by);
  emit('update:sortDir', s.dir);
}
function flipSortDir() {
  const s = localSort.value;
  s.dir = s.dir === 'asc' ? 'desc' : 'asc';
  emit('update:sortDir', s.dir);
}

/* ── colunas por prioridade ─────────────────────────────────────────────────
   Prioridade decide a ORDEM de aparição no celular, nunca o que existe: tudo
   continua acessível, o que muda é quantos toques até lá.
   Sem `priority`, a coluna vale 2: aparece no card, mas não disputa o título. */
const prio = (c) => c.priority || 2;
const primary = computed(() => props.columns.filter((c) => prio(c) === 1));
const secondary = computed(() => props.columns.filter((c) => prio(c) === 2));
const extra = computed(() => props.columns.filter((c) => prio(c) === 3));

const cellValue = (row, col) => {
  const raw = col.value ? col.value(row) : row[col.key];
  return col.format ? col.format(raw, row) : raw;
};

const alignClass = (col) => (col.numeric || col.align === 'right')
  ? 'text-right tabular-nums'
  : col.align === 'center' ? 'text-center' : 'text-left';

/* TRUNCAR é o padrão. Célula que quebra linha faz a altura da linha variar, e
   uma tabela com linhas de alturas diferentes é impossível de varrer com o
   olho - some a régua que faz a lista ser lista.
   `max-w-0` é o truque que faz `truncate` funcionar dentro de <table>: sem uma
   largura máxima, a célula cresce com o conteúdo e nunca corta. O texto
   completo continua acessível no title (e no detalhe do registro).
   `col.truncate: false` libera a quebra em coluna que precisa mesmo. */
const cellClass = (col) => (col.truncate === false ? '' : 'max-w-0 truncate');

/* Texto puro do valor, para o `title`. Só quando não há slot próprio: com slot
   o conteúdo pode ser um selo, e "[object Object]" no title é pior que nada. */
const cellTitle = (row, col) => {
  const v = cellValue(row, col);
  return (v === null || v === undefined || typeof v === 'object') ? undefined : String(v);
};

const rowPad = computed(() => (props.density === 'comfortable' ? 'py-3' : 'py-2'));

/* Linhas abertas. Uma coleção só serve o desktop e o celular: abrir no
   monitor e girar o aparelho mantém a linha aberta. */
const open = ref(new Set());
const toggleOpen = (k) => {
  const s = new Set(open.value);
  s.has(k) ? s.delete(k) : s.add(k);
  open.value = s;
};
const estaAberta = (k) => open.value.has(k);

/* No celular o botão "Ver detalhes" existe se houver coluna de prioridade 3 OU
   conteúdo expandido - nos dois casos há mais coisa para mostrar. */
const temMais = computed(() => props.expandable || extra.value.length > 0);

const keyOf = (row, i) => row?.[props.rowKey] ?? i;

function onRowClick(row, i) {
  /* Expandir ganha do clique de linha: quando a tabela abre, o gesto natural
     na linha é abrir, não navegar. */
  if (props.expandable) { toggleOpen(keyOf(row, i)); return; }
  if (props.clickable) emit('row-click', row);
}
</script>

<template>
  <div class="min-w-0">
    <Skeleton v-if="loading && !rows.length" variant="table" :lines="6" />

    <EmptyState v-else-if="!rows.length" :icon="emptyIcon" :title="emptyTitle" :description="emptyText">
      <template v-if="$slots.emptyActions" #actions><slot name="emptyActions" /></template>
    </EmptyState>

    <template v-else>
      <!-- ══ DESKTOP: tabela ═══════════════════════════════════════════════
           O scroll horizontal fica PRESO a este container. O corpo da página
           nunca rola de lado. -->
      <div class="hidden md:block overflow-x-auto rounded-xl border border-line">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="bg-surface-sunken/60">
              <th v-for="col in columns" :key="col.key" scope="col"
                :style="col.width ? { width: col.width } : null"
                :class="['metric-label px-3 py-2.5 border-b border-line whitespace-nowrap select-none',
                         alignClass(col),
                         sortable && col.sortable ? 'cursor-pointer hover:text-ink transition-colors' : '']"
                :aria-sort="localSort.by === col.key ? (localSort.dir === 'asc' ? 'ascending' : 'descending') : 'none'"
                @click="toggleSort(col)">
                {{ col.label }}
                <i v-if="sortable && col.sortable"
                  :class="['fas ml-1',
                           localSort.by === col.key
                             ? (localSort.dir === 'asc' ? 'fa-arrow-up-short-wide text-accent' : 'fa-arrow-down-wide-short text-accent')
                             : 'fa-sort opacity-30']"
                  style="font-size:9px"></i>
              </th>
              <th v-if="expandable" scope="col" class="w-px px-2 py-2.5 border-b border-line"><span class="sr-only">Abrir</span></th>
              <th v-if="$slots.actions" scope="col" class="w-px px-3 py-2.5 border-b border-line"><span class="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            <!-- Entrada escalonada só nas primeiras linhas: em lista de 500
                 registros, animar todas custa caro e não acrescenta nada
                 (ninguém vê a linha 300 chegar). -->
            <template v-for="(row, i) in sorted" :key="keyOf(row, i)">
              <tr
                :style="i < 24 ? { '--i': i } : null"
                :class="['transition-colors duration-120',
                         i < 24 ? 'stagger-in' : '',
                         estaAberta(keyOf(row, i)) ? 'bg-surface-sunken/60' : 'border-b border-line-subtle',
                         (clickable || expandable) ? 'cursor-pointer hover:bg-surface-sunken/70' : 'hover:bg-surface-sunken/40']"
                @click="onRowClick(row, i)">
                <td v-for="col in columns" :key="col.key"
                  :title="cellTitle(row, col)"
                  :class="['px-3 text-ink', rowPad, alignClass(col), cellClass(col), col.class || '']">
                  <slot :name="`cell-${col.key}`" :row="row" :value="cellValue(row, col)" :col="col">
                    {{ cellValue(row, col) }}
                  </slot>
                </td>
                <td v-if="expandable" :class="['px-2 w-px', rowPad]">
                  <i class="fas fa-chevron-down text-micro text-ink-subtle transition-transform duration-200 ease-out-expo"
                    :class="{ 'rotate-180': estaAberta(keyOf(row, i)) }"></i>
                </td>
                <td v-if="$slots.actions" :class="['px-3 text-right whitespace-nowrap', rowPad]"
                  @click.stop>
                  <slot name="actions" :row="row" />
                </td>
              </tr>

              <!-- Detalhe da linha: ocupa a largura toda, logo abaixo dela. A
                   ordenação e as colunas continuam valendo - é a tabela que
                   abre, não outra tela. -->
              <tr v-if="expandable && estaAberta(keyOf(row, i))" class="border-b border-line">
                <td :colspan="columns.length + (expandable ? 1 : 0) + ($slots.actions ? 1 : 0)"
                  class="px-3 pb-3 pt-0 bg-surface-sunken/60">
                  <div class="animate-slide-down">
                    <slot name="expanded" :row="row" />
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- ══ CELULAR: cards empilhados ═════════════════════════════════════
           Prioridade 1 no topo, prioridade 2 logo abaixo, o resto ao abrir.
           Nada de rolar a tela de lado para ler uma linha. -->

      <!-- Ordenação no celular: o cabeçalho de coluna não existe aqui, então o
           controle vira explícito. Ordenar não pode ser privilégio de quem
           está no monitor. -->
      <div v-if="sortableCols.length" class="md:hidden flex items-center gap-2 mb-2.5">
        <label :for="`${rowKey}-sort`" class="metric-label shrink-0">Ordenar por</label>
        <select :id="`${rowKey}-sort`" :value="localSort.by"
          class="flex-1 min-w-0 h-10 px-2.5 rounded-lg bg-surface-raised border border-line
                 text-sm text-ink focus-ring"
          @change="setSortKey($event.target.value)">
          <option value="">Ordem original</option>
          <option v-for="col in sortableCols" :key="col.key" :value="col.key">{{ col.label }}</option>
        </select>
        <button type="button" :disabled="!localSort.by"
          class="h-10 w-10 shrink-0 grid place-items-center rounded-lg border border-line
                 bg-surface-raised text-ink-muted hover:text-ink hover:bg-surface-sunken
                 disabled:opacity-40 transition-colors focus-ring"
          :aria-label="localSort.dir === 'asc' ? 'Ordem crescente, tocar para inverter' : 'Ordem decrescente, tocar para inverter'"
          @click="flipSortDir">
          <i :class="['fas text-xs', localSort.dir === 'asc' ? 'fa-arrow-up-short-wide' : 'fa-arrow-down-wide-short']"></i>
        </button>
      </div>

      <ul class="md:hidden space-y-2">
        <li v-for="(row, i) in sorted" :key="keyOf(row, i)"
          :class="['panel p-3', (clickable && !expandable) ? 'panel-focus' : '', i < 16 ? 'stagger-in' : '']"
          :style="i < 16 ? { '--i': i } : null"
          @click="expandable ? null : onRowClick(row, i)">

          <div class="flex items-start justify-between gap-3 min-w-0">
            <div class="min-w-0 flex-1 space-y-0.5">
              <div v-for="col in primary" :key="col.key" class="min-w-0">
                <p class="metric-label">{{ col.label }}</p>
                <p :class="['text-sm font-medium text-ink break-words', col.numeric ? 'tabular-nums' : '']">
                  <slot :name="`cell-${col.key}`" :row="row" :value="cellValue(row, col)" :col="col">
                    {{ cellValue(row, col) }}
                  </slot>
                </p>
              </div>
            </div>
            <div v-if="$slots.actions" class="shrink-0" @click.stop>
              <slot name="actions" :row="row" />
            </div>
          </div>

          <dl v-if="secondary.length" class="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
            <div v-for="col in secondary" :key="col.key" class="min-w-0">
              <dt class="metric-label">{{ col.label }}</dt>
              <dd :class="['text-xs text-ink-muted break-words', col.numeric ? 'tabular-nums' : '']">
                <slot :name="`cell-${col.key}`" :row="row" :value="cellValue(row, col)" :col="col">
                  {{ cellValue(row, col) }}
                </slot>
              </dd>
            </div>
          </dl>

          <template v-if="temMais">
            <!-- alvo de 40px: o dedo tem que acertar -->
            <button type="button"
              class="mt-2.5 w-full h-10 rounded-lg border border-line text-xs font-medium text-ink-muted
                     hover:bg-surface-sunken hover:text-ink transition-colors focus-ring"
              :aria-expanded="estaAberta(keyOf(row, i))"
              @click.stop="toggleOpen(keyOf(row, i))">
              {{ estaAberta(keyOf(row, i)) ? 'Ocultar' : moreLabel }}
              <i :class="['fas fa-chevron-down ml-1.5 transition-transform duration-200',
                          estaAberta(keyOf(row, i)) ? 'rotate-180' : '']" style="font-size:9px"></i>
            </button>
            <div v-if="estaAberta(keyOf(row, i))" class="animate-slide-down">
              <dl v-if="extra.length"
                class="mt-2.5 pt-2.5 border-t border-line-subtle grid grid-cols-2 gap-x-3 gap-y-2">
                <div v-for="col in extra" :key="col.key" class="min-w-0">
                  <dt class="metric-label">{{ col.label }}</dt>
                  <dd :class="['text-xs text-ink-muted break-words', col.numeric ? 'tabular-nums' : '']">
                    <slot :name="`cell-${col.key}`" :row="row" :value="cellValue(row, col)" :col="col">
                      {{ cellValue(row, col) }}
                    </slot>
                  </dd>
                </div>
              </dl>
              <div v-if="expandable" class="mt-2.5 pt-2.5 border-t border-line-subtle">
                <slot name="expanded" :row="row" />
              </div>
            </div>
          </template>
        </li>
      </ul>
    </template>
  </div>
</template>
