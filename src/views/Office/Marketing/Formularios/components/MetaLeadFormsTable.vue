<script setup>
// Tabela dos Lead Forms da Meta com KPIs (total, 30d, last lead, entrega).
// Filtros: status Meta, status do mapping, prioridade, busca textual.

import { onMounted, ref, computed } from 'vue';
import { useMetaFormsStore } from '@/stores/Marketing/Capture/metaFormsStore';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import MetaFormMappingModal from './MetaFormMappingModal.vue';

const store = useMetaFormsStore();

const modalOpen = ref(false);
const editing = ref(null);

const search = ref('');
const filterStatus = ref('ALL');     // ALL | ACTIVE | OTHER
const filterMapping = ref('ALL');    // ALL | MAPPED | UNMAPPED
const filterPriority = ref('ALL');   // ALL | high | normal | low
const sortBy = ref('last_lead');     // last_lead | total | name | created

function openEdit(f) { editing.value = f; modalOpen.value = true; }

onMounted(() => store.fetchAll());

async function doSync() { await store.syncFromMeta(); }

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    let arr = store.forms.filter(f => {
        if (filterStatus.value === 'ACTIVE' && String(f.status).toUpperCase() !== 'ACTIVE') return false;
        if (filterStatus.value === 'OTHER'  && String(f.status).toUpperCase() === 'ACTIVE') return false;

        const hasMapping = f.mapping_active && !!f.midia_slug;
        if (filterMapping.value === 'MAPPED' && !hasMapping) return false;
        if (filterMapping.value === 'UNMAPPED' && hasMapping) return false;

        if (filterPriority.value !== 'ALL' && f.priority !== filterPriority.value) return false;

        if (q) {
            const txt = [f.name, f.id, f.page_name, f.midia_slug, f.campaign_ref, f.description]
                .filter(Boolean).join(' ').toLowerCase();
            if (!txt.includes(q)) return false;
        }
        return true;
    });

    // sort
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
            const ta = a.created_time ? new Date(a.created_time).getTime() : 0;
            const tb = b.created_time ? new Date(b.created_time).getTime() : 0;
            return tb - ta;
        });
    }
    return arr;
});

// Resumo agregado pros filtros aplicados
const summary = computed(() => {
    const acc = { total: 0, last_30d: 0, delivered: 0, held: 0, withMapping: 0 };
    for (const f of filtered.value) {
        acc.total += f.stats?.total || 0;
        acc.last_30d += f.stats?.last_30d || 0;
        acc.delivered += f.stats?.delivered || 0;
        acc.held += f.stats?.held || 0;
        if (f.mapping_active && f.midia_slug) acc.withMapping += 1;
    }
    return acc;
});

function statusBadge(status) {
    const s = String(status || '').toUpperCase();
    if (s === 'ACTIVE')   return { label: 'Ativo',     cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20' };
    if (s === 'ARCHIVED') return { label: 'Arquivado', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20' };
    if (s === 'DELETED')  return { label: 'Excluído',  cls: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20' };
    if (s === 'DRAFT')    return { label: 'Rascunho',  cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    return { label: s || '—', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
}

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
</script>

<template>
  <div class="space-y-3">

    <!-- Resumo agregado (sticky-like card) -->
    <Surface variant="raised" padding="sm" class="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <div>
        <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Forms exibidos</div>
        <div class="text-xl font-semibold text-ink">{{ filtered.length }}</div>
        <div class="text-[10px] text-ink-subtle">{{ summary.withMapping }} com vínculo</div>
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

    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-2">
      <input v-model="search" type="text" placeholder="Buscar por nome, mídia, ref ou ID..."
        class="flex-1 min-w-[200px] rounded border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder-ink-subtle focus:outline-none focus:border-accent/40" />

      <select v-model="filterStatus" class="rounded border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none">
        <option value="ALL">Todos status</option>
        <option value="ACTIVE">Só ativos</option>
        <option value="OTHER">Não-ativos</option>
      </select>

      <select v-model="filterMapping" class="rounded border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none">
        <option value="ALL">Todos mappings</option>
        <option value="MAPPED">Com vínculo</option>
        <option value="UNMAPPED">Sem vínculo</option>
      </select>

      <select v-model="filterPriority" class="rounded border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none">
        <option value="ALL">Todas prioridades</option>
        <option value="high">Alta</option>
        <option value="normal">Normal</option>
        <option value="low">Baixa</option>
      </select>

      <select v-model="sortBy" class="rounded border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none">
        <option value="last_lead">Último lead</option>
        <option value="total">Mais leads</option>
        <option value="name">Nome A-Z</option>
        <option value="created">Mais novos</option>
      </select>

      <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate" :loading="store.loading" @click="store.fetchAll">
        Atualizar
      </Button>
      <Button variant="primary" size="sm" icon="fab fa-meta" :loading="store.syncing" @click="doSync">
        Sincronizar com Meta
      </Button>
    </div>

    <!-- Resultado do último sync -->
    <div v-if="store.lastSync"
      :class="['rounded-lg border px-3 py-2.5 text-sm',
        store.lastSync.errors?.length
          ? 'border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200'
          : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300']">
      <div class="flex items-start gap-2">
        <i :class="store.lastSync.errors?.length ? 'fas fa-triangle-exclamation' : 'fas fa-circle-check'" class="mt-0.5"></i>
        <div class="flex-1 min-w-0">
          <div>
            Sincronizado: <b>{{ store.lastSync.pages_count }}</b> Página(s),
            <b>{{ store.lastSync.forms_total }}</b> formulário(s)
            ({{ store.lastSync.forms_new }} novo(s), {{ store.lastSync.forms_updated }} atualizado(s))
          </div>
          <div v-if="store.lastSync.errors?.length" class="mt-1.5 space-y-1">
            <div v-for="(e, i) in store.lastSync.errors" :key="i"
              class="text-xs rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5">
              <div class="font-medium"><i class="fas fa-circle-exclamation mr-1"></i>{{ e.page_name || 'Página' }} <span class="text-ink-subtle font-mono">#{{ e.page_id }}</span></div>
              <div class="text-amber-700 dark:text-amber-300 mt-0.5 font-mono text-[11px] break-words">{{ e.error }}</div>
            </div>
          </div>
          <div v-else-if="store.lastSync.forms_total === 0 && store.lastSync.pages_count > 0"
            class="mt-1 text-xs text-ink-subtle italic">
            Página acessada mas sem nenhum lead form criado.
            Crie em <a href="https://business.facebook.com/adsmanager" target="_blank" class="text-accent underline">Ads Manager</a> e clique em Sincronizar novamente.
          </div>
        </div>
      </div>
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
              <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Form</th>
              <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Página</th>
              <th class="px-3 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
              <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle" title="Data de criação na Meta">Criado</th>
              <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Vínculo</th>
              <th class="px-3 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Empreend.</th>
              <th class="px-3 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Roteamento</th>
              <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle" title="Total / Últimos 30d">Leads</th>
              <th class="px-3 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle" title="% de leads entregues ao CV">Entrega</th>
              <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Último</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line/60">
            <tr v-if="store.loading">
              <td colspan="10" class="px-4 py-10 text-center text-ink-subtle">
                <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando...
              </td>
            </tr>
            <tr v-else-if="!store.forms.length">
              <td colspan="10" class="px-4 py-10 text-center text-ink-subtle">
                Nenhum formulário sincronizado ainda. Clique em <b>"Sincronizar com Meta"</b>.
              </td>
            </tr>
            <tr v-else-if="!filtered.length">
              <td colspan="10" class="px-4 py-10 text-center text-ink-subtle">
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
                    <div class="text-ink font-medium leading-tight truncate">{{ f.name || '(sem nome)' }}</div>
                    <div class="text-[10px] font-mono text-ink-subtle truncate">
                      #{{ f.id }}<span v-if="f.campaign_ref"> · {{ f.campaign_ref }}</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Página -->
              <td class="px-3 py-2.5 text-ink-muted text-xs">
                {{ f.page_name || '—' }}
              </td>

              <!-- Status Meta -->
              <td class="px-3 py-2.5 text-center">
                <span :class="['inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium', statusBadge(f.status).cls]">
                  {{ statusBadge(f.status).label }}
                </span>
              </td>

              <!-- Criado (data vinda da Meta) -->
              <td class="px-3 py-2.5">
                <div class="text-[11px] text-ink-muted">
                  <span v-if="f.created_time">{{ fmtShortDate(f.created_time) }}</span>
                  <span v-else class="text-ink-subtle italic">—</span>
                </div>
                <div class="text-[10px] text-ink-subtle">na Meta</div>
              </td>

              <!-- Vínculo -->
              <td class="px-3 py-2.5">
                <template v-if="f.midia_slug">
                  <div class="font-mono text-[11px] text-ink leading-tight">{{ f.midia_slug }}</div>
                  <div class="text-[10px] text-ink-subtle">{{ f.cv_origem || 'FB' }}</div>
                </template>
                <span v-else class="text-[11px] text-ink-subtle italic">sem vínculo</span>
              </td>

              <!-- Empreendimentos -->
              <td class="px-3 py-2.5 text-ink-muted">
                <span v-if="Array.isArray(f.bound_empreendimentos) && f.bound_empreendimentos.length"
                  class="text-xs">{{ f.bound_empreendimentos.length }}</span>
                <span v-else class="text-[11px] text-ink-subtle italic">—</span>
              </td>

              <!-- Roteamento -->
              <td class="px-3 py-2.5 text-center">
                <span v-if="f.mapping_active && f.midia_slug"
                  class="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium">
                  <i class="fas fa-bolt text-[9px]"></i>Auto
                </span>
                <span v-else
                  class="inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium">
                  <i class="fas fa-hand text-[9px]"></i>Manual
                </span>
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
            </tr>
          </tbody>
        </table>
      </div>
    </Surface>

    <MetaFormMappingModal
      v-model:open="modalOpen"
      :form="editing"
      @saved="store.fetchAll()" />
  </div>
</template>
