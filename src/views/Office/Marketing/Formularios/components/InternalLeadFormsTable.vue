<script setup>
// Tabela dos formulários internos (LPs) com KPIs, filtros, toggle ativo inline.
// Espelha a UX da MetaLeadFormsTable pra manter consistência.

import { computed, ref } from 'vue';
import { useLeadFormsStore } from '@/stores/Marketing/Capture/leadFormsStore';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';

const emit = defineEmits(['edit']);

const store = useLeadFormsStore();

const search = ref('');
const filterActive   = ref('ALL');  // ALL | ACTIVE | INACTIVE
const filterPriority = ref('ALL');  // ALL | high | normal | low
const filterDateFrom = ref('');     // start_date (ou created_at se sem start_date)
const filterDateTo   = ref('');
const sortBy         = ref('last_lead'); // last_lead | total | name | created

function openEdit(f) { emit('edit', f); }

async function quickToggle(e, f) {
    e.stopPropagation();   // não abre o modal
    await store.toggleActive(f.id);
}

function fmtDate(iso) {
    if (!iso) return null;
    try { return new Date(iso); } catch { return null; }
}
function inRange(iso) {
    const dt = fmtDate(iso);
    if (!dt) return false;
    if (filterDateFrom.value) {
        const from = new Date(filterDateFrom.value);
        if (dt < from) return false;
    }
    if (filterDateTo.value) {
        const to = new Date(filterDateTo.value);
        to.setHours(23, 59, 59, 999);
        if (dt > to) return false;
    }
    return true;
}

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    let arr = store.forms.filter(f => {
        if (filterActive.value === 'ACTIVE'   && !f.active) return false;
        if (filterActive.value === 'INACTIVE' &&  f.active) return false;

        if (filterPriority.value !== 'ALL' && f.priority !== filterPriority.value) return false;

        if (filterDateFrom.value || filterDateTo.value) {
            const ref = f.start_date || f.created_at;
            if (!inRange(ref)) return false;
        }

        if (q) {
            const txt = [f.name, f.slug, f.midia_slug, f.campaign_ref, f.description]
                .filter(Boolean).join(' ').toLowerCase();
            if (!txt.includes(q)) return false;
        }
        return true;
    });

    arr = [...arr];
    if (sortBy.value === 'last_lead') {
        arr.sort((a, b) => {
            const ta = a.stats?.last_lead_at ? new Date(a.stats.last_lead_at).getTime() : 0;
            const tb = b.stats?.last_lead_at ? new Date(b.stats.last_lead_at).getTime() : 0;
            return tb - ta;
        });
    } else if (sortBy.value === 'total') {
        arr.sort((a, b) => (b.stats?.total || 0) - (a.stats?.total || 0));
    } else if (sortBy.value === 'name') {
        arr.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    } else if (sortBy.value === 'created') {
        arr.sort((a, b) => {
            const ta = a.start_date || a.created_at;
            const tb = b.start_date || b.created_at;
            const da = ta ? new Date(ta).getTime() : 0;
            const db = tb ? new Date(tb).getTime() : 0;
            return db - da;
        });
    }
    return arr;
});

const summary = computed(() => {
    const acc = { total: 0, last_30d: 0, delivered: 0, held: 0, actives: 0 };
    for (const f of filtered.value) {
        acc.total    += f.stats?.total    || 0;
        acc.last_30d += f.stats?.last_30d || 0;
        acc.delivered+= f.stats?.delivered|| 0;
        acc.held     += f.stats?.held     || 0;
        if (f.active) acc.actives += 1;
    }
    return acc;
});

function priorityDot(p) {
    if (p === 'high')   return { cls: 'bg-red-500',     title: 'Prioridade alta' };
    if (p === 'low')    return { cls: 'bg-slate-400',   title: 'Prioridade baixa' };
    return { cls: 'bg-emerald-500', title: 'Prioridade normal' };
}

function fmtRelative(iso) {
    if (!iso) return '—';
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 0) return 'agora';
    const min = Math.floor(ms / 60000);
    if (min < 1)    return 'agora';
    if (min < 60)   return `${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24)     return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7)      return `${d}d`;
    if (d < 30)     return `${Math.floor(d / 7)}sem`;
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function deliveryRate(stats) {
    if (!stats?.total) return null;
    return Math.round(((stats.delivered || 0) / stats.total) * 100);
}

function fmtShortDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
    catch { return '—'; }
}

function endedAlready(f) {
    if (!f.end_date) return false;
    const end = new Date(f.end_date);
    end.setHours(23, 59, 59, 999);
    return Date.now() > end.getTime();
}
</script>

<template>
  <div class="space-y-3">

    <!-- Resumo -->
    <Surface variant="raised" padding="sm" class="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <div>
        <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Forms exibidos</div>
        <div class="text-xl font-semibold text-ink">{{ filtered.length }}</div>
        <div class="text-[10px] text-ink-subtle">{{ summary.actives }} ativos</div>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Leads totais</div>
        <div class="text-xl font-semibold text-ink">{{ summary.total }}</div>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Últimos 30 dias</div>
        <div class="text-xl font-semibold text-ink">{{ summary.last_30d }}</div>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Entregues ao CV</div>
        <div class="text-xl font-semibold text-emerald-600 dark:text-emerald-300">{{ summary.delivered }}</div>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Em held</div>
        <div class="text-xl font-semibold text-amber-600 dark:text-amber-300">{{ summary.held }}</div>
      </div>
    </Surface>

    <!-- Filtros -->
    <div class="flex flex-wrap items-center gap-2">
      <input v-model="search" type="text" placeholder="Buscar por nome, slug, mídia, ref..."
        class="flex-1 min-w-[200px] rounded border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder-ink-subtle focus:outline-none focus:border-accent/40" />

      <select v-model="filterActive" class="rounded border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none">
        <option value="ALL">Ativos + Inativos</option>
        <option value="ACTIVE">Só ativos</option>
        <option value="INACTIVE">Só inativos</option>
      </select>

      <select v-model="filterPriority" class="rounded border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none">
        <option value="ALL">Todas prioridades</option>
        <option value="high">Alta</option>
        <option value="normal">Normal</option>
        <option value="low">Baixa</option>
      </select>

      <div class="flex items-center gap-1 text-xs text-ink-subtle">
        <span>De:</span>
        <input v-model="filterDateFrom" type="date" class="rounded border border-line bg-surface px-2 py-1 text-xs text-ink focus:outline-none" />
        <span>até:</span>
        <input v-model="filterDateTo"   type="date" class="rounded border border-line bg-surface px-2 py-1 text-xs text-ink focus:outline-none" />
      </div>

      <select v-model="sortBy" class="rounded border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none">
        <option value="last_lead">Último lead</option>
        <option value="total">Mais leads</option>
        <option value="name">Nome A-Z</option>
        <option value="created">Mais novos</option>
      </select>

      <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate" :loading="store.loading" @click="store.fetchAll">
        Atualizar
      </Button>
    </div>

    <!-- Erro -->
    <div v-if="store.error"
      class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
      <i class="fas fa-circle-exclamation mt-0.5"></i>
      <div>{{ store.error }}</div>
    </div>

    <!-- Tabela -->
    <Surface variant="raised" padding="none" class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-surface-sunken/30 border-b border-line">
            <tr>
              <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Formulário</th>
              <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Mídia</th>
              <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Período</th>
              <th class="px-3 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Empreend.</th>
              <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Leads</th>
              <th class="px-3 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Entrega</th>
              <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Último</th>
              <th class="px-3 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line/60">
            <tr v-if="store.loading">
              <td colspan="8" class="px-4 py-10 text-center text-ink-subtle">
                <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando...
              </td>
            </tr>
            <tr v-else-if="!store.forms.length">
              <td colspan="8" class="px-4 py-10 text-center text-ink-subtle">
                Nenhum formulário ainda. Clique em "Novo formulário".
              </td>
            </tr>
            <tr v-else-if="!filtered.length">
              <td colspan="8" class="px-4 py-10 text-center text-ink-subtle">
                Nenhum formulário corresponde aos filtros.
              </td>
            </tr>
            <tr v-else v-for="f in filtered" :key="f.id"
              @click="openEdit(f)"
              class="hover:bg-surface-hover/40 cursor-pointer transition-colors">

              <!-- Form -->
              <td class="px-3 py-2.5">
                <div class="flex items-center gap-2">
                  <span :class="['inline-block w-2 h-2 rounded-full shrink-0', priorityDot(f.priority).cls]" :title="priorityDot(f.priority).title"></span>
                  <div class="min-w-0">
                    <div class="text-ink font-medium leading-tight truncate">{{ f.name }}</div>
                    <div class="text-[10px] font-mono text-ink-subtle truncate">
                      /{{ f.slug }}<span v-if="f.campaign_ref"> · {{ f.campaign_ref }}</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Mídia -->
              <td class="px-3 py-2.5">
                <div v-if="f.midia_slug" class="font-mono text-[11px] text-ink">{{ f.midia_slug }}</div>
                <div v-else class="text-[11px] text-ink-subtle italic">—</div>
                <div class="text-[10px] text-ink-subtle">{{ f.cv_origem || '—' }}</div>
              </td>

              <!-- Período -->
              <td class="px-3 py-2.5">
                <div class="text-[11px] text-ink-muted">
                  <span v-if="f.start_date">{{ fmtShortDate(f.start_date) }}</span>
                  <span v-else class="text-ink-subtle italic">desde criação</span>
                </div>
                <div class="text-[10px]" :class="endedAlready(f) ? 'text-red-500 font-medium' : 'text-ink-subtle'">
                  <template v-if="f.end_date">→ {{ fmtShortDate(f.end_date) }}<span v-if="endedAlready(f)"> (encerrado)</span></template>
                  <template v-else>sem fim</template>
                </div>
              </td>

              <!-- Empreendimentos -->
              <td class="px-3 py-2.5 text-center text-ink-muted">
                <span v-if="Array.isArray(f.bound_empreendimentos) && f.bound_empreendimentos.length"
                  class="text-xs">{{ f.bound_empreendimentos.length }}</span>
                <span v-else class="text-[11px] text-ink-subtle italic">—</span>
              </td>

              <!-- Leads count -->
              <td class="px-3 py-2.5 text-right whitespace-nowrap">
                <div class="text-sm font-semibold text-ink leading-tight">{{ f.stats?.total || 0 }}</div>
                <div class="text-[10px] text-ink-subtle leading-tight">
                  <span v-if="f.stats?.last_30d">+{{ f.stats.last_30d }} (30d)</span>
                  <span v-else>—</span>
                </div>
              </td>

              <!-- Entrega -->
              <td class="px-3 py-2.5 text-center">
                <template v-if="deliveryRate(f.stats) !== null">
                  <div class="inline-flex items-center gap-1.5">
                    <div class="w-12 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                      <div class="h-full bg-emerald-500" :style="{ width: deliveryRate(f.stats) + '%' }"></div>
                    </div>
                    <span class="text-[10px] font-medium text-ink">{{ deliveryRate(f.stats) }}%</span>
                  </div>
                  <div v-if="f.stats.held" class="text-[10px] text-amber-600 dark:text-amber-300">{{ f.stats.held }} held</div>
                </template>
                <span v-else class="text-[11px] text-ink-subtle italic">—</span>
              </td>

              <!-- Último lead -->
              <td class="px-3 py-2.5 text-[11px] text-ink-muted whitespace-nowrap">
                {{ fmtRelative(f.stats?.last_lead_at) }}
              </td>

              <!-- Status toggle (inline) -->
              <td class="px-3 py-2.5 text-center">
                <button @click="quickToggle($event, f)"
                  :title="f.active ? 'Clique para desativar' : 'Clique para ativar'"
                  :class="['inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors',
                    f.active
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-500 border-slate-500/20 hover:bg-slate-500/20']">
                  <i :class="f.active ? 'fas fa-circle-check' : 'fas fa-circle-pause'" class="text-[10px]"></i>
                  {{ f.active ? 'Ativo' : 'Inativo' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Surface>
  </div>
</template>
