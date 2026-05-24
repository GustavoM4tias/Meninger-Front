<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useCaptureStore } from '@/stores/Marketing/Capture/captureStore';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import LeadDetailModal from './components/LeadDetailModal.vue';

const store = useCaptureStore();
const route = useRoute();

const STATUS_META = {
  received:    { label: 'Recebido',           cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20' },
  validated:   { label: 'Validado',           cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/20' },
  held:        { label: 'Aguardando vínculo', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20' },
  routed:      { label: 'Roteado',            cls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/20' },
  dispatching: { label: 'Despachando',        cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/20' },
  delivered:   { label: 'Entregue',           cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20' },
  rejected:    { label: 'Recusado',           cls: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20' },
  failed:      { label: 'Falhou',             cls: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20' },
  spam:        { label: 'Spam',               cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
};
const CHANNEL_LABEL = { meta_lead_ads: 'Meta', site_form: 'Site' };

const FILTER_CHIPS = [
  { key: '',                  label: 'Todos' },
  { key: 'held',              label: 'Inbox (aguardando)' },
  { key: 'failed,rejected',   label: 'Com erro' },
  { key: 'routed,dispatching', label: 'Em despacho' },
  { key: 'delivered',         label: 'Entregues' },
  { key: 'spam',              label: 'Spam' },
];

const detailOpen = ref(false);

const statusMeta = (s) => STATUS_META[s] || { label: s, cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
const channelLabel = (c) => CHANNEL_LABEL[c] || c;
const fmtDate = (d) => d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const contato = (lead) => lead.email || lead.telefone || '—';

const totalPages = computed(() => Math.max(1, Math.ceil(store.total / store.pageSize)));

function setFilter(key) {
  store.filters.status = key;
  store.page = 1;
  store.fetchLeads();
}
function search() {
  store.page = 1;
  store.fetchLeads();
}
function goPage(p) {
  if (p < 1 || p > totalPages.value) return;
  store.page = p;
  store.fetchLeads();
}
async function openDetail(id) {
  detailOpen.value = true;
  await store.fetchDetail(id);
}
function refresh() {
  store.fetchLeads();
  store.fetchHealth();
}

onMounted(async () => {
  await Promise.all([store.fetchLeads(), store.fetchHealth()]);
  const leadId = route.query.lead;
  if (leadId) openDetail(String(leadId));
});
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <PageHeader
        title="Captação de Leads"
        subtitle="Leads captados por formulário e Meta Lead Ads — despacho ao CV CRM."
        icon="fas fa-inbox">
        <template #actions>
          <span v-if="store.health?.dry_run"
            class="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-300">
            <i class="fas fa-eye-slash"></i> Modo sombra
          </span>
          <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate" @click="refresh">Atualizar</Button>
        </template>
      </PageHeader>

      <!-- Health -->
      <div v-if="store.health" class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <Surface variant="raised" padding="md">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">Aguardando vínculo</div>
          <div class="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">{{ store.health.counts.held }}</div>
        </Surface>
        <Surface variant="raised" padding="md">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">Em despacho</div>
          <div class="text-2xl font-bold font-mono tabular-nums">{{ store.health.counts.routed + store.health.counts.dispatching }}</div>
        </Surface>
        <Surface variant="raised" padding="md">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">Entregues</div>
          <div class="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{{ store.health.counts.delivered }}</div>
        </Surface>
        <Surface variant="raised" padding="md">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">Com erro</div>
          <div class="text-2xl font-bold font-mono tabular-nums text-red-600 dark:text-red-400">{{ store.health.counts.failed + store.health.counts.rejected }}</div>
        </Surface>
        <Surface variant="raised" padding="md" :bordered="true" :class="store.health.dead_letter ? 'border-red-500/40' : ''">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">Dead-letter</div>
          <div class="text-2xl font-bold font-mono tabular-nums" :class="store.health.dead_letter ? 'text-red-600 dark:text-red-400' : 'text-ink'">{{ store.health.dead_letter }}</div>
        </Surface>
      </div>

      <!-- Filtros -->
      <Surface variant="raised" padding="sm" class="mb-3">
        <div class="flex flex-wrap items-center gap-2">
          <button v-for="chip in FILTER_CHIPS" :key="chip.key" type="button"
            @click="setFilter(chip.key)"
            :class="[
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border',
              store.filters.status === chip.key
                ? 'bg-accent text-white border-accent'
                : 'bg-surface-sunken/40 text-ink-muted border-line hover:bg-surface-hover',
            ]">
            {{ chip.label }}
          </button>
          <div class="flex-1 min-w-[200px]">
            <Input v-model="store.filters.q" placeholder="Buscar nome, e-mail ou telefone..."
              icon-left="fas fa-magnifying-glass" size="sm" @keyup.enter="search" />
          </div>
          <Button variant="primary" size="sm" icon="fas fa-magnifying-glass" @click="search">Buscar</Button>
        </div>
      </Surface>

      <!-- Erro -->
      <div v-if="store.error"
        class="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
        <i class="fas fa-circle-exclamation"></i>{{ store.error }}
      </div>

      <!-- Tabela -->
      <Surface variant="raised" padding="none" class="overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-surface-sunken/30 border-b border-line">
              <tr>
                <th class="px-4 py-2.5 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
                <th class="px-4 py-2.5 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Canal</th>
                <th class="px-4 py-2.5 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Nome</th>
                <th class="px-4 py-2.5 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Contato</th>
                <th class="px-4 py-2.5 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Mídia</th>
                <th class="px-4 py-2.5 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Recebido</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line/60">
              <tr v-if="store.loading">
                <td colspan="6" class="px-4 py-10 text-center text-ink-subtle">
                  <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando...
                </td>
              </tr>
              <tr v-else-if="!store.leads.length">
                <td colspan="6" class="px-4 py-10 text-center text-ink-subtle">Nenhum lead encontrado.</td>
              </tr>
              <tr v-else v-for="lead in store.leads" :key="lead.id"
                @click="openDetail(lead.id)"
                class="hover:bg-surface-hover/40 cursor-pointer transition-colors">
                <td class="px-4 py-2.5">
                  <span :class="['inline-flex rounded-md border px-2 py-0.5 text-xs font-medium', statusMeta(lead.status).cls]">
                    {{ statusMeta(lead.status).label }}
                  </span>
                </td>
                <td class="px-4 py-2.5 text-ink-muted">{{ channelLabel(lead.channel) }}</td>
                <td class="px-4 py-2.5 text-ink font-medium">{{ lead.nome || '—' }}</td>
                <td class="px-4 py-2.5 text-ink-muted">{{ contato(lead) }}</td>
                <td class="px-4 py-2.5 text-ink-muted">{{ lead.midia_slug || '—' }}</td>
                <td class="px-4 py-2.5 text-ink-subtle font-mono text-xs whitespace-nowrap">{{ fmtDate(lead.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginação -->
        <div v-if="store.total > store.pageSize" class="flex items-center justify-between px-4 py-2.5 border-t border-line">
          <span class="text-xs text-ink-subtle font-mono">{{ store.total }} lead(s)</span>
          <div class="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon="fas fa-chevron-left" :disabled="store.page <= 1" @click="goPage(store.page - 1)" />
            <span class="text-xs text-ink-muted font-mono">{{ store.page }} / {{ totalPages }}</span>
            <Button variant="ghost" size="sm" icon="fas fa-chevron-right" :disabled="store.page >= totalPages" @click="goPage(store.page + 1)" />
          </div>
        </div>
      </Surface>

      <LeadDetailModal v-model:open="detailOpen" />

    </PageContainer>
  </div>
</template>
