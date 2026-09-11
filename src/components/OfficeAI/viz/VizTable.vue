<script setup>
/**
 * VizTable - o visual "tabela" de um dataset.
 * ─────────────────────────────────────────────────────────────────────────────
 * `DataTable` do design system (ordenar, prioridade por coluna, card no
 * estreito) + `useIncrementalList` passo 25. Célula formatada pelo TIPO da
 * coluna (formatos.js); coluna `badge` vira selo com o tom do estado.
 *
 * Substitui o ChatTable: mesma leitura, mas o dado vem no contrato EmeBlock e
 * a moldura (título, fonte, ações, trocar visual) é do VizFrame.
 */
import { ref, computed } from 'vue';
import DataTable from '@/components/UI/DataTable.vue';
import Badge from '@/components/UI/Badge.vue';
import { useIncrementalList } from '@/composables/useIncrementalList';
import { formatarValor, numeroDe } from './formatos.js';
import { TIPOS_NUMERICOS } from './emeBlock.js';

const props = defineProps({
  dataset: { type: Object, required: true },
  compact: { type: Boolean, default: false },
});

const cols = computed(() => props.dataset.columns || []);
const rows = computed(() => props.dataset.rows || []);

/* Selo: coluna declarada `badge`, ou coluna de estado pelo nome (herança do
   ChatTable - as tools antigas não marcam o tipo). */
const ehBadge = (c) => c.type === 'badge' || ['situacao', 'situacao_nome', 'status', 'etapa'].some((k) => String(c.key).includes(k));
const STATUS_VARIANT = {
  ativo: 'success', concluido: 'success', concluída: 'success', aprovado: 'success', atingida: 'success', pago: 'success',
  vendido: 'info', 'no ritmo': 'info',
  reservado: 'warning', pendente: 'warning', distratado: 'warning', 'em risco': 'warning', 'em análise': 'warning', vencido: 'warning',
  cancelado: 'danger', reprovado: 'danger', erro: 'danger', 'sem venda': 'danger',
  inativo: 'neutral',
};
const statusVariant = (v) => STATUS_VARIANT[String(v || '').toLowerCase()] || 'neutral';

/* Prioridade: declarada na coluna, senão por posição (2 primeiras
   identificam a linha; 3 seguintes no corpo do card; resto a um toque). */
const colunas = computed(() => cols.value.map((c, i) => ({
  key: c.key,
  label: c.label || c.key,
  priority: c.priority || (i < 2 ? 1 : i < 5 ? 2 : 3),
  numeric: TIPOS_NUMERICOS.has(c.type),
  sortable: c.sortable !== false,
  truncate: c.truncate,
  value: (row) => row[c.key],
  format: (v) => formatarValor(v, c.type),
})));

const ordem = ref({ by: '', dir: 'asc' });
const ordenadas = computed(() => {
  const { by, dir } = ordem.value;
  if (!by) return rows.value;
  const col = cols.value.find((c) => c.key === by);
  const mul = dir === 'asc' ? 1 : -1;
  return [...rows.value].sort((a, b) => {
    const va = a[by], vb = b[by];
    if (col && (TIPOS_NUMERICOS.has(col.type) || (numeroDe(va) != null && numeroDe(vb) != null))) {
      return ((numeroDe(va) ?? 0) - (numeroDe(vb) ?? 0)) * mul;
    }
    return String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR', { numeric: true }) * mul;
  });
});
const inc = useIncrementalList(ordenadas, { step: 25 });
</script>

<template>
  <div class="p-3">
    <DataTable :columns="colunas" :rows="inc.visiveis.value" row-key="__i"
      manual-sort density="compact"
      v-model:sort-by="ordem.by" v-model:sort-dir="ordem.dir"
      more-label="Ver mais campos"
      empty-title="Sem resultados" empty-text="A consulta não retornou nenhuma linha.">
      <template v-for="col in cols.filter(ehBadge)" :key="col.key" #[`cell-${col.key}`]="{ value }">
        <Badge :variant="statusVariant(value)" size="sm">{{ value || '-' }}</Badge>
      </template>
      <template v-for="col in cols.filter(c => c.type === 'link')" :key="`l-${col.key}`" #[`cell-${col.key}`]="{ value }">
        <a v-if="value" :href="String(value)" target="_blank" rel="noopener" class="text-accent hover:underline truncate">{{ value }}</a>
        <span v-else>-</span>
      </template>
    </DataTable>
    <div v-if="!inc.acabou.value" :ref="el => inc.observar(el)" class="pt-3 text-center text-micro text-ink-subtle">
      carregando mais {{ Math.min(inc.step, inc.restantes.value) }} de {{ inc.restantes.value }} restantes
    </div>
  </div>
</template>
