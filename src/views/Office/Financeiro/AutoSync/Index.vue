<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <PageHeader
        subtitle="Status do auto-sync diário de títulos do Sienge — execução automática às 04:00"
        icon="fas fa-arrows-rotate">
        <template #title>
          Auto-Sync de Títulos
        </template>
        <template #actions>
          <div class="flex items-center gap-2">
            <Button variant="ghost" icon="fas fa-rotate" size="sm" :loading="loading" @click="load">
              Recarregar
            </Button>
            <Button variant="primary" icon="fas fa-play" size="sm"
              :loading="triggering"
              :disabled="!!currentRun?.running"
              @click="runAll">
              Rodar agora (todos)
            </Button>
          </div>
        </template>
      </PageHeader>

      <!-- Execução em andamento -->
      <Surface v-if="currentRun?.running" variant="raised" padding="md" class="mb-5 border-2 border-accent/40 bg-accent-soft surface-gradient">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 mb-2">
              <div class="h-9 w-9 rounded-xl bg-accent grid place-items-center text-white shrink-0">
                <i class="fas fa-arrows-rotate fa-spin"></i>
              </div>
              <div>
                <h3 class="font-semibold text-ink text-sm">Execução em andamento</h3>
                <p class="text-xs text-ink-muted">
                  Modo: <span class="font-mono">{{ currentRun.mode }}</span>
                  · Origem: <span class="font-mono">{{ currentRun.triggeredBy }}</span>
                </p>
              </div>
            </div>
            <div class="h-2 bg-surface-sunken rounded-full overflow-hidden">
              <div class="h-full bg-accent rounded-full transition-all duration-500"
                :style="{ width: ((currentRun.done / Math.max(currentRun.total, 1)) * 100) + '%' }">
              </div>
            </div>
            <div class="flex justify-between text-[11px] text-ink-muted mt-1 font-mono tabular-nums">
              <span>{{ currentRun.done }} / {{ currentRun.total }} empreendimentos</span>
              <span v-if="currentRun.current">
                Em curso: {{ currentRun.current.name }} ({{ currentRun.current.costCenterId }})
              </span>
            </div>
          </div>
        </div>
      </Surface>

      <!-- Resumo -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <Surface variant="raised" padding="md" class="surface-gradient">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">Empreendimentos</div>
          <div class="text-2xl font-bold font-mono tabular-nums">{{ enterprises.length }}</div>
        </Surface>
        <Surface variant="raised" padding="md" class="surface-gradient border-emerald-500/30 bg-emerald-500/5">
          <div class="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-mono mb-1">Último sync OK</div>
          <div class="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{{ statusCounts.success }}</div>
        </Surface>
        <Surface variant="raised" padding="md" class="surface-gradient border-red-500/30 bg-red-500/5">
          <div class="text-[10px] uppercase tracking-wider text-red-700 dark:text-red-300 font-mono mb-1">Com erro</div>
          <div class="text-2xl font-bold font-mono tabular-nums text-red-600 dark:text-red-400">{{ statusCounts.error }}</div>
        </Surface>
        <Surface variant="raised" padding="md" class="surface-gradient">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">Sem execução</div>
          <div class="text-2xl font-bold font-mono tabular-nums">{{ statusCounts.none }}</div>
        </Surface>
      </div>

      <!-- Tabela de empreendimentos -->
      <Surface variant="raised" padding="none" class="overflow-hidden surface-gradient">
        <div class="px-5 py-3 border-b border-line bg-surface-sunken/40">
          <h3 class="text-base font-semibold text-ink flex items-center gap-2">
            <i class="fas fa-list-check text-accent"></i> Status por empreendimento
          </h3>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead class="bg-surface-sunken/60 border-b border-line">
              <tr>
                <th class="px-4 py-3 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Empreendimento</th>
                <th class="px-4 py-3 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Cidade</th>
                <th class="px-4 py-3 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">CC ERP</th>
                <th class="px-4 py-3 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Último sync</th>
                <th class="px-4 py-3 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
                <th class="px-4 py-3 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Resumo</th>
                <th class="px-4 py-3 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="ec in enterprises" :key="ec.id" class="hover:bg-surface-hover/40 transition-colors">
                <td class="px-4 py-3 align-middle">
                  <div class="text-sm font-semibold text-ink">{{ ec.name || '—' }}</div>
                </td>
                <td class="px-4 py-3 align-middle text-xs text-ink-muted">{{ ec.city || '—' }}</td>
                <td class="px-4 py-3 align-middle text-center text-xs font-mono tabular-nums">{{ ec.erpId }}</td>
                <td class="px-4 py-3 align-middle text-center text-xs font-mono tabular-nums">
                  {{ ec.lastRunAt ? new Date(ec.lastRunAt).toLocaleString('pt-BR') : '—' }}
                </td>
                <td class="px-4 py-3 align-middle text-center">
                  <Badge :variant="statusVariant(ec.lastStatus)" size="sm">
                    {{ statusLabel(ec.lastStatus) }}
                  </Badge>
                </td>
                <td class="px-4 py-3 align-middle text-right text-xs text-ink-muted">
                  <div v-if="ec.lastSummary && !ec.lastSummary.error" class="space-y-0.5">
                    <div><span class="font-mono tabular-nums">{{ ec.lastSummary.totalBills || 0 }}</span> bills</div>
                    <div class="text-[10px] text-ink-subtle">
                      +{{ ec.lastSummary.newBills || 0 }} novos · {{ ec.lastSummary.installmentsSynced || 0 }} parc.
                    </div>
                  </div>
                  <span v-else-if="ec.lastSummary?.error" class="text-red-500 text-xs truncate max-w-[200px] inline-block" :title="ec.lastSummary.error">
                    {{ ec.lastSummary.error }}
                  </span>
                  <span v-else class="text-ink-subtle">—</span>
                </td>
                <td class="px-4 py-3 align-middle text-right">
                  <Button variant="secondary" size="sm" icon="fas fa-play"
                    :disabled="!!currentRun?.running"
                    @click="runOne(ec)">
                    Rodar
                  </Button>
                </td>
              </tr>
              <tr v-if="!enterprises.length">
                <td colspan="7" class="px-6 py-12">
                  <EmptyState icon="fas fa-inbox" title="Nenhum empreendimento" description="Aguardando carga." />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Surface>
    </PageContainer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useToast } from 'vue-toastification';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const toast = (() => {
  try { return useToast(); }
  catch { return { success: console.log, error: console.error }; }
})();

const enterprises = ref([]);
const currentRun = ref(null);
const loading = ref(false);
const triggering = ref(false);
let pollTimer = null;

const statusCounts = computed(() => {
  const out = { success: 0, error: 0, running: 0, none: 0 };
  for (const e of enterprises.value) {
    if (!e.lastStatus)             out.none++;
    else if (e.lastStatus === 'success') out.success++;
    else if (e.lastStatus === 'error')   out.error++;
    else if (e.lastStatus === 'running') out.running++;
  }
  return out;
});

function statusVariant(status) {
  switch (status) {
    case 'success': return 'success';
    case 'error':   return 'danger';
    case 'running': return 'info';
    default:        return 'neutral';
  }
}
function statusLabel(status) {
  switch (status) {
    case 'success': return 'OK';
    case 'error':   return 'Erro';
    case 'running': return 'Em curso';
    default:        return 'Nunca';
  }
}

async function load() {
  loading.value = true;
  try {
    const data = await requestWithAuth(`${API_URL}/sienge/bills/auto-sync`);
    enterprises.value = data.enterprises || [];
    currentRun.value  = data.currentRun || null;

    // Se estava polling e a execução terminou, para
    if (pollTimer && !currentRun.value?.running) {
      stopPolling();
      toast.success('Auto-sync concluído.');
    }
  } catch (err) {
    toast.error('Falha ao carregar status: ' + err.message);
  } finally {
    loading.value = false;
  }
}

async function runAll() {
  if (!confirm('Disparar auto-sync para TODOS os empreendimentos agora? Pode levar minutos.')) return;
  triggering.value = true;
  try {
    await requestWithAuth(`${API_URL}/sienge/bills/auto-sync/run-now`, {
      method: 'POST',
      body: JSON.stringify({ mode: 'default' }),
    });
    toast.success('Auto-sync iniciado em background.');
    startPolling();
  } catch (err) {
    toast.error('Falha ao disparar: ' + err.message);
  } finally {
    triggering.value = false;
  }
}

async function runOne(ec) {
  if (!confirm(`Disparar auto-sync apenas para "${ec.name}" (CC ${ec.erpId})?`)) return;
  try {
    await requestWithAuth(`${API_URL}/sienge/bills/auto-sync/run-now`, {
      method: 'POST',
      body: JSON.stringify({ enterpriseCityId: ec.id, mode: 'full' }),
    });
    toast.success(`Sync iniciado para ${ec.name}.`);
    startPolling();
  } catch (err) {
    toast.error('Falha ao disparar: ' + err.message);
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(load, 3000);
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

onMounted(async () => {
  await load();
  if (currentRun.value?.running) startPolling();
});

onUnmounted(stopPolling);
</script>
