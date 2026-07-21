<script setup>
/**
 * ProjectionEditorGrid — grade editável de metas (unidades por mês × empreendimento).
 * Desktop = tabela com 1ª coluna fixa; mobile = cards. VGV é sempre unidades × ticket.
 * As células são vinculadas diretamente às linhas reativas do pai; ao digitar,
 * emitimos 'changed' para o pai marcar rascunho.
 */
import { computed } from 'vue';
import {
  cellVgv, rowUnits, rowVgv, brl, brlCompact, int,
  shortMonthLabel, monthLabel, emptyCell,
} from '../projectionUtils';

const props = defineProps({
  rows: { type: Array, default: () => [] },
  monthKeys: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(['edit', 'duplicate', 'remove', 'changed']);

function cell(row, ym) {
  row.values ||= {};
  row.values[ym] ||= emptyCell();
  return row.values[ym];
}
function onUnits(row, ym, e) {
  const n = Math.max(0, parseInt(e.target.value, 10) || 0);
  cell(row, ym).units = n;
  emit('changed');
}

const monthTotals = computed(() => {
  const out = {};
  for (const ym of props.monthKeys) {
    let u = 0, v = 0;
    for (const r of props.rows) { u += Number(r.values?.[ym]?.units || 0); v += cellVgv(r, ym); }
    out[ym] = { units: u, vgv: v };
  }
  return out;
});
const grand = computed(() => {
  let u = 0, v = 0;
  for (const r of props.rows) { u += rowUnits(r, props.monthKeys); v += rowVgv(r, props.monthKeys); }
  return { units: u, vgv: v };
});

const uid = (r) => `${r.enterprise_key}|${r.alias_id || 'default'}`;
</script>

<template>
  <div>
    <!-- ═══════════ DESKTOP ═══════════ -->
    <div class="hidden md:block rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-surface-sunken/60 border-b border-line">
              <th class="sticky left-0 z-10 bg-surface-sunken text-left px-3 py-2.5 font-semibold text-ink min-w-[220px]">
                Empreendimento
              </th>
              <th v-for="ym in monthKeys" :key="ym" class="px-2 py-2.5 text-center font-semibold text-ink-muted whitespace-nowrap min-w-[92px]">
                {{ shortMonthLabel(ym) }}
              </th>
              <th class="px-3 py-2.5 text-right font-semibold text-ink whitespace-nowrap">Total</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="row in rows" :key="uid(row)" class="border-b border-line-subtle hover:bg-surface-sunken/30 transition-colors">
              <!-- Empreendimento (fixo) -->
              <td class="sticky left-0 z-10 bg-surface-raised px-3 py-2 align-top min-w-[220px]">
                <div class="flex items-start gap-2">
                  <div class="min-w-0 flex-1">
                    <p class="font-medium text-ink truncate">{{ row.name }}</p>
                    <p class="text-[11px] text-ink-subtle font-mono">
                      <span v-if="row.erp_id">CC {{ row.erp_id }}</span>
                      <span v-else class="text-amber-600 dark:text-amber-400">manual</span>
                      <span v-if="row.city"> • {{ row.city }}</span>
                    </p>
                    <p class="text-[11px] text-ink-muted mt-0.5">
                      Ticket {{ brlCompact(row.defaultPrice) }}
                    </p>
                  </div>
                  <div v-if="!disabled" class="flex flex-col gap-1 shrink-0">
                    <button v-tippy:left="'Configurar (ticket, %, cidade)'" @click="emit('edit', row)"
                      class="h-7 w-7 grid place-items-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-accent transition-colors">
                      <i class="fas fa-sliders text-xs"></i>
                    </button>
                    <button v-tippy:left="'Duplicar (fase/torre)'" @click="emit('duplicate', row)"
                      class="h-7 w-7 grid place-items-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors">
                      <i class="fas fa-copy text-xs"></i>
                    </button>
                    <button v-tippy:left="'Remover empreendimento'" @click="emit('remove', row)"
                      class="h-7 w-7 grid place-items-center rounded-md text-ink-muted hover:bg-red-500/10 hover:text-red-500 transition-colors">
                      <i class="fas fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </div>
              </td>

              <!-- Meses -->
              <td v-for="ym in monthKeys" :key="ym" class="px-1.5 py-2 text-center align-top">
                <input type="number" min="0" inputmode="numeric"
                  :value="row.values?.[ym]?.units || 0"
                  :disabled="disabled"
                  @input="onUnits(row, ym, $event)"
                  class="w-full max-w-[80px] mx-auto text-center h-8 px-1 rounded-md border border-line bg-surface
                         text-ink text-sm focus-ring disabled:opacity-60 disabled:cursor-not-allowed
                         [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <p class="text-[10px] text-ink-subtle mt-0.5 truncate" :title="brl(cellVgv(row, ym))">
                  {{ (row.values?.[ym]?.units || 0) ? brlCompact(cellVgv(row, ym)) : '—' }}
                </p>
              </td>

              <!-- Total linha -->
              <td class="px-3 py-2 text-right align-top whitespace-nowrap">
                <p class="font-semibold text-ink">{{ int(rowUnits(row, monthKeys)) }} un.</p>
                <p class="text-[11px] text-ink-muted">{{ brlCompact(rowVgv(row, monthKeys)) }}</p>
              </td>
            </tr>

            <tr v-if="!rows.length">
              <td :colspan="monthKeys.length + 2" class="px-4 py-10 text-center text-ink-subtle">
                Nenhum empreendimento neste período. Use <strong>Adicionar</strong> para começar.
              </td>
            </tr>
          </tbody>

          <tfoot v-if="rows.length">
            <tr class="bg-surface-sunken/80 border-t-2 border-line font-semibold">
              <td class="sticky left-0 z-10 bg-surface-sunken px-3 py-2.5 text-ink">Total geral</td>
              <td v-for="ym in monthKeys" :key="ym" class="px-2 py-2.5 text-center">
                <p class="text-ink">{{ int(monthTotals[ym].units) }}</p>
                <p class="text-[10px] text-ink-muted font-normal">{{ brlCompact(monthTotals[ym].vgv) }}</p>
              </td>
              <td class="px-3 py-2.5 text-right whitespace-nowrap">
                <p class="text-ink">{{ int(grand.units) }} un.</p>
                <p class="text-[11px] text-accent font-normal">{{ brlCompact(grand.vgv) }}</p>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- ═══════════ MOBILE ═══════════ -->
    <div class="md:hidden space-y-3">
      <p v-if="!rows.length" class="rounded-xl border border-line bg-surface-raised p-6 text-center text-sm text-ink-subtle">
        Nenhum empreendimento neste período.
      </p>

      <div v-for="row in rows" :key="uid(row)" class="rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden">
        <div class="flex items-start justify-between gap-2 px-3.5 py-3 border-b border-line bg-surface-sunken/40">
          <div class="min-w-0">
            <p class="font-semibold text-ink truncate">{{ row.name }}</p>
            <p class="text-[11px] text-ink-subtle font-mono">
              <span v-if="row.erp_id">CC {{ row.erp_id }}</span><span v-else>manual</span>
              <span v-if="row.city"> • {{ row.city }}</span> • Ticket {{ brlCompact(row.defaultPrice) }}
            </p>
          </div>
          <div v-if="!disabled" class="flex gap-1 shrink-0">
            <button @click="emit('edit', row)" class="h-9 w-9 grid place-items-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-accent">
              <i class="fas fa-sliders text-sm"></i>
            </button>
            <button @click="emit('duplicate', row)" class="h-9 w-9 grid place-items-center rounded-lg text-ink-muted hover:bg-surface-sunken">
              <i class="fas fa-copy text-sm"></i>
            </button>
            <button @click="emit('remove', row)" class="h-9 w-9 grid place-items-center rounded-lg text-ink-muted hover:bg-red-500/10 hover:text-red-500">
              <i class="fas fa-trash-can text-sm"></i>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
          <label v-for="ym in monthKeys" :key="ym" class="flex flex-col gap-1">
            <span class="text-[11px] text-ink-muted">{{ monthLabel(ym) }}</span>
            <input type="number" min="0" inputmode="numeric"
              :value="row.values?.[ym]?.units || 0"
              :disabled="disabled"
              @input="onUnits(row, ym, $event)"
              class="h-10 px-2 rounded-lg border border-line bg-surface text-ink text-sm focus-ring disabled:opacity-60" />
            <span class="text-[10px] text-ink-subtle">
              {{ (row.values?.[ym]?.units || 0) ? brlCompact(cellVgv(row, ym)) : '—' }}
            </span>
          </label>
        </div>

        <div class="flex items-center justify-between px-3.5 py-2.5 border-t border-line bg-surface-sunken/30 text-sm">
          <span class="text-ink-muted">Total</span>
          <span class="font-semibold text-ink">{{ int(rowUnits(row, monthKeys)) }} un. • {{ brlCompact(rowVgv(row, monthKeys)) }}</span>
        </div>
      </div>

      <div v-if="rows.length" class="rounded-xl border border-accent/30 bg-accent-soft/40 px-3.5 py-3 flex items-center justify-between">
        <span class="font-semibold text-ink">Total geral</span>
        <span class="font-semibold text-accent">{{ int(grand.units) }} un. • {{ brlCompact(grand.vgv) }}</span>
      </div>
    </div>
  </div>
</template>
