<script setup>
// Trilha de exportações do relatório — visível apenas para admin.
// Mostra quem exportou, em que formato, de qual período e quando.
import { ref, computed, watch } from 'vue';
import dayjs from 'dayjs';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import { listarExports } from '@/utils/Config/exportLog';

const props = defineProps({
  open: { type: Boolean, default: false },
  // Relatório desta tela. O admin pode alternar para ver todos.
  report: { type: String, default: 'leads' },
});
const emit = defineEmits(['fechar']);

const escopo = ref(props.report);   // '' = todos os relatórios

const carregando = ref(false);
const erro = ref('');
const itens = ref([]);
const total = ref(0);
const page = ref(1);
const pages = ref(1);

const busca = ref('');
const formato = ref('');
const de = ref('');
const ate = ref('');

const FORMATOS = {
  pdf:   { label: 'PDF',   icon: 'fas fa-file-pdf',   cls: 'text-red-500 bg-red-500/10' },
  html:  { label: 'HTML',  icon: 'fas fa-file-code',  cls: 'text-sky-500 bg-sky-500/10' },
  excel: { label: 'Excel', icon: 'fas fa-file-excel', cls: 'text-emerald-500 bg-emerald-500/10' },
  csv:   { label: 'CSV',   icon: 'fas fa-file-csv',   cls: 'text-amber-500 bg-amber-500/10' },
};
const fmtOf = (f) => FORMATOS[f] || { label: f || '—', icon: 'fas fa-file', cls: 'text-ink-muted bg-surface-sunken' };

async function carregar(p = 1) {
  carregando.value = true;
  erro.value = '';
  try {
    const data = await listarExports({
      report: escopo.value || undefined,
      page: p,
      limit: 50,
      q: busca.value || undefined,
      format: formato.value || undefined,
      from: de.value || undefined,
      to: ate.value || undefined,
    });
    itens.value = data?.results ?? [];
    total.value = data?.count ?? 0;
    pages.value = data?.pages ?? 1;
    page.value = data?.page ?? p;
  } catch (e) {
    erro.value = e?.message || 'Não foi possível carregar a trilha de exportações.';
    itens.value = [];
  } finally {
    carregando.value = false;
  }
}

watch(() => props.open, (v) => { if (v) carregar(1); });

const intFmt = new Intl.NumberFormat('pt-BR');
const quando = (d) => (d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—');
const periodo = (a, b) =>
  (a && b) ? `${dayjs(a).format('DD/MM/YY')} a ${dayjs(b).format('DD/MM/YY')}` : '—';

// Resumo dos filtros usados na exportação, em texto curto.
function resumoFiltros(f) {
  if (!f || typeof f !== 'object') return '';
  const partes = [];
  for (const [k, v] of Object.entries(f)) {
    if (['data_inicio', 'data_fim'].includes(k)) continue;
    const val = Array.isArray(v) ? `${v.length}` : String(v);
    partes.push(`${k}: ${val}`);
  }
  return partes.join(' · ');
}

const temFiltro = computed(() => busca.value || formato.value || de.value || ate.value);
function limpar() {
  busca.value = ''; formato.value = ''; de.value = ''; ate.value = '';
  carregar(1);
}
</script>

<template>
  <Modal :open="open" size="full" @close="emit('fechar')">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-clipboard-list text-sm"></i>
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink">Trilha de exportações</h2>
          <p class="text-xs text-ink-muted mt-0.5">
            Quem exportou o relatório de leads, em qual formato e quando ·
            <span class="font-mono">{{ intFmt.format(total) }}</span> registro(s)
          </p>
        </div>
      </div>
    </template>

    <!-- Filtros -->
    <div class="flex flex-wrap items-end gap-2 mb-3">
      <div class="relative flex-1 min-w-[12rem]">
        <i class="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-xs pointer-events-none"></i>
        <input v-model="busca" type="text" placeholder="Buscar por nome ou e-mail..."
          @keydown.enter="carregar(1)"
          class="w-full h-9 pl-9 pr-3 text-sm rounded-lg bg-surface-sunken border border-line text-ink
                 placeholder:text-ink-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent-ring/20" />
      </div>
      <select v-model="escopo" @change="carregar(1)"
        class="h-9 px-2 text-sm rounded-lg bg-surface-sunken border border-line text-ink outline-none
               focus:border-accent focus:ring-2 focus:ring-accent-ring/20">
        <option :value="props.report">Este relatório</option>
        <option value="">Todos os relatórios</option>
      </select>
      <select v-model="formato" @change="carregar(1)"
        class="h-9 px-2 text-sm rounded-lg bg-surface-sunken border border-line text-ink outline-none
               focus:border-accent focus:ring-2 focus:ring-accent-ring/20">
        <option value="">Todos os formatos</option>
        <option value="pdf">PDF</option>
        <option value="html">HTML</option>
        <option value="excel">Excel</option>
        <option value="csv">CSV</option>
      </select>
      <input v-model="de" type="date" title="Exportado de"
        class="h-9 px-2 text-sm rounded-lg bg-surface-sunken border border-line text-ink outline-none
               focus:border-accent focus:ring-2 focus:ring-accent-ring/20" />
      <input v-model="ate" type="date" title="Exportado até"
        class="h-9 px-2 text-sm rounded-lg bg-surface-sunken border border-line text-ink outline-none
               focus:border-accent focus:ring-2 focus:ring-accent-ring/20" />
      <Button size="sm" icon="fas fa-magnifying-glass" @click="carregar(1)">Buscar</Button>
      <Button v-if="temFiltro" size="sm" variant="ghost" icon="fas fa-eraser" @click="limpar">Limpar</Button>
    </div>

    <div v-if="erro"
      class="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
      <i class="fas fa-circle-exclamation"></i>{{ erro }}
    </div>

    <div v-if="carregando" class="py-12 text-center text-ink-subtle text-sm">
      <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando...
    </div>

    <div v-else-if="itens.length" class="overflow-x-auto rounded-lg border border-line">
      <table class="w-full text-sm">
        <thead class="bg-surface-sunken">
          <tr class="text-left text-micro uppercase tracking-wider text-ink-subtle">
            <th class="px-3 py-2 font-semibold">Quem</th>
            <th class="px-3 py-2 font-semibold">Relatório</th>
            <th class="px-3 py-2 font-semibold">Formato</th>
            <th class="px-3 py-2 font-semibold">Período</th>
            <th class="px-3 py-2 font-semibold text-right">Registros</th>
            <th class="px-3 py-2 font-semibold">Filtros</th>
            <th class="px-3 py-2 font-semibold whitespace-nowrap">Quando</th>
            <th class="px-3 py-2 font-semibold">IP</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr v-for="it in itens" :key="it.id" class="hover:bg-surface-sunken/50 transition-colors">
            <td class="px-3 py-2 min-w-[12rem]">
              <p class="font-medium text-ink truncate">{{ it.userName || 'Usuário removido' }}</p>
              <p class="text-micro text-ink-subtle truncate">{{ it.userEmail || '—' }}</p>
            </td>
            <td class="px-3 py-2 text-ink-muted font-mono text-xs whitespace-nowrap">{{ it.report || '—' }}</td>
            <td class="px-3 py-2">
              <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-micro font-semibold"
                :class="fmtOf(it.format).cls">
                <i :class="fmtOf(it.format).icon"></i>{{ fmtOf(it.format).label }}
              </span>
            </td>
            <td class="px-3 py-2 whitespace-nowrap text-ink-muted">{{ periodo(it.periodStart, it.periodEnd) }}</td>
            <td class="px-3 py-2 text-right tabular-nums text-ink">{{ it.recordCount != null ? intFmt.format(it.recordCount) : '—' }}</td>
            <td class="px-3 py-2 max-w-[16rem]">
              <span class="text-micro text-ink-subtle truncate block" :title="resumoFiltros(it.filtersJson)">
                {{ resumoFiltros(it.filtersJson) || '—' }}
              </span>
            </td>
            <td class="px-3 py-2 whitespace-nowrap text-ink-muted font-mono text-xs">{{ quando(it.createdAt) }}</td>
            <td class="px-3 py-2 text-micro text-ink-subtle font-mono">{{ it.ip || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="py-12 text-center text-ink-subtle">
      <i class="fas fa-clipboard-list text-2xl mb-2 block"></i>
      <p class="text-sm">Nenhuma exportação registrada</p>
    </div>

    <template #footer>
      <div class="flex items-center justify-between w-full gap-3">
        <span class="text-xs text-ink-subtle">Página {{ page }} de {{ pages }}</span>
        <div class="flex items-center gap-2">
          <Button size="sm" variant="secondary" :disabled="page <= 1 || carregando"
            icon="fas fa-chevron-left" @click="carregar(page - 1)">Anterior</Button>
          <Button size="sm" variant="secondary" :disabled="page >= pages || carregando"
            @click="carregar(page + 1)">Próxima</Button>
        </div>
      </div>
    </template>
  </Modal>
</template>
