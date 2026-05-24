<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <PageHeader
        title="Auto-Sync de Títulos"
        subtitle="Status do auto-sync diário de títulos do Sienge — execução automática às 04:00"
        icon="fas fa-arrows-rotate">
        <template #actions>
          <div class="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" icon="fas fa-rotate" size="sm" :loading="loading" @click="load">
              Recarregar
            </Button>
            <template v-if="selectedIds.size > 0">
              <Button variant="ghost" size="sm" icon="fas fa-star"
                class="!text-amber-500"
                :disabled="recurringActionBusy"
                @click="toggleRecurringSelected(true)">
                Tornar {{ selectedIds.size }} recorrente(s)
              </Button>
              <Button variant="ghost" size="sm" icon="far fa-star"
                :disabled="recurringActionBusy"
                @click="toggleRecurringSelected(false)">
                Remover dos recorrentes
              </Button>
              <Button variant="secondary" icon="fas fa-play" size="sm"
                :disabled="!!currentRun?.running"
                @click="runSelected">
                Rodar {{ selectedIds.size }} selecionado(s)
              </Button>
            </template>
            <Button variant="primary" icon="fas fa-play" size="sm"
              :loading="triggering"
              :disabled="!!currentRun?.running || recurringCount === 0"
              @click="runAll">
              Rodar do sync diário ({{ recurringCount }})
            </Button>
          </div>
        </template>
      </PageHeader>

      <!-- Execução em andamento -->
      <Surface v-if="currentRun?.running" variant="raised" padding="md"
        class="mb-5 border-2 border-accent/40 bg-accent-soft surface-gradient">
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
              <span>{{ currentRun.done }} / {{ currentRun.total }} CCs</span>
              <span v-if="currentRun.current">
                Em curso: {{ currentRun.current.name }} (CC {{ currentRun.current.costCenterId }})
              </span>
            </div>
          </div>
        </div>
      </Surface>

      <!-- Resumo -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <Surface variant="raised" padding="md" class="surface-gradient">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">Empresas / CCs</div>
          <div class="text-2xl font-bold font-mono tabular-nums">
            {{ companies.length }} <span class="text-sm text-ink-subtle">/ {{ enterprises.length }}</span>
          </div>
        </Surface>
        <Surface variant="raised" padding="md" class="surface-gradient border-amber-500/30 bg-amber-500/5">
          <div class="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-mono mb-1 flex items-center gap-1">
            <i class="fas fa-star text-[10px]"></i> No sync diário
          </div>
          <div class="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">{{ recurringCount }}</div>
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
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">Nunca rodado</div>
          <div class="text-2xl font-bold font-mono tabular-nums">{{ statusCounts.none }}</div>
        </Surface>
      </div>

      <!-- Busca -->
      <Surface variant="raised" padding="sm" class="mb-3 surface-gradient">
        <Input v-model="search" placeholder="Buscar empresa, empreendimento, CC ou cidade..."
          icon-left="fas fa-magnifying-glass" />
      </Surface>

      <!-- Lista por empresa -->
      <div class="space-y-3">
        <Surface v-for="comp in filteredCompanies" :key="comp.companyKey"
          variant="raised" padding="none" class="overflow-hidden surface-gradient">

          <!-- Header da empresa -->
          <div class="px-4 py-3 border-b border-line bg-surface-sunken/40 flex items-center gap-3">
            <button @click="toggleExpand(comp.companyKey)"
              class="h-8 w-8 grid place-items-center rounded-lg hover:bg-surface-hover transition-colors">
              <i :class="expanded.has(comp.companyKey) ? 'fas fa-chevron-down' : 'fas fa-chevron-right'"
                class="text-ink-muted text-xs"></i>
            </button>

            <div class="h-10 w-10 rounded-lg bg-accent/10 border border-accent/20 grid place-items-center text-accent shrink-0">
              <i class="fas fa-building"></i>
            </div>

            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold text-ink truncate">
                {{ comp.companyName || `Empresa #${comp.companyId || '?'}` }}
              </div>
              <div class="text-xs text-ink-subtle">
                <span class="font-mono tabular-nums">{{ comp.enterprises.length }}</span> CC(s) ·
                Empresa ID <span class="font-mono">{{ comp.companyId ?? '—' }}</span>
              </div>
            </div>

            <!-- Status agregado -->
            <div class="flex items-center gap-2 mr-2">
              <Badge v-if="comp.recurringCount > 0" variant="warning" size="sm">
                <i class="fas fa-star text-[9px] mr-0.5"></i>
                {{ comp.recurringCount }} no diário
              </Badge>
              <Badge v-if="comp.statusSummary.success > 0" variant="success" size="sm">
                {{ comp.statusSummary.success }} OK
              </Badge>
              <Badge v-if="comp.statusSummary.error > 0" variant="danger" size="sm">
                {{ comp.statusSummary.error }} erro
              </Badge>
              <Badge v-if="comp.statusSummary.none > 0" variant="neutral" size="sm">
                {{ comp.statusSummary.none }} nunca
              </Badge>
            </div>

            <Button variant="primary" size="sm" icon="fas fa-play"
              :disabled="!!currentRun?.running"
              @click="runCompany(comp)">
              Rodar empresa
            </Button>
          </div>

          <!-- Linhas de CC (mostradas quando expandido) -->
          <div v-if="expanded.has(comp.companyKey)" class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="bg-surface-sunken/30 border-b border-line">
                <tr>
                  <th class="px-4 py-2 text-left w-10">
                    <input type="checkbox" :checked="isAllSelected(comp)" @change="toggleSelectAll(comp)" />
                  </th>
                  <th class="px-4 py-2 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle w-12" title="No cron diário">
                    <i class="fas fa-star text-amber-500"></i>
                  </th>
                  <th class="px-4 py-2 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Centro de custo</th>
                  <th class="px-4 py-2 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Cidade</th>
                  <th class="px-4 py-2 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">CC ERP</th>
                  <th class="px-4 py-2 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Último sync</th>
                  <th class="px-4 py-2 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
                  <th class="px-4 py-2 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Resumo</th>
                  <th class="px-4 py-2 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line/60">
                <tr v-for="ec in comp.enterprises" :key="ec.id" class="hover:bg-surface-hover/40">
                  <td class="px-4 py-2">
                    <input type="checkbox" :checked="selectedIds.has(ec.id)" @change="toggleSelect(ec.id)" />
                  </td>
                  <td class="px-4 py-2 text-center">
                    <button @click="toggleRecurringOne(ec)"
                      :disabled="recurringActionBusy"
                      class="h-7 w-7 grid place-items-center rounded-md hover:bg-surface-hover transition-colors disabled:opacity-50"
                      :title="ec.isRecurring ? 'Remover do sync diário' : 'Incluir no sync diário'">
                      <i :class="ec.isRecurring ? 'fas fa-star text-amber-500' : 'far fa-star text-ink-subtle'"></i>
                    </button>
                  </td>
                  <td class="px-4 py-2 max-w-[320px]">
                    <div v-if="editingNameId === ec.id" class="flex items-center gap-1">
                      <Input v-model="editNameValue" size="sm" class="flex-1"
                        @keyup.enter="saveName(ec)" @keyup.esc="cancelEditName" />
                      <button class="h-7 w-7 grid place-items-center rounded-md text-emerald-600 hover:bg-emerald-500/10"
                        :disabled="nameSaving" title="Salvar" @click="saveName(ec)">
                        <i class="fas fa-check text-xs"></i>
                      </button>
                      <button class="h-7 w-7 grid place-items-center rounded-md text-ink-muted hover:bg-surface-hover"
                        title="Cancelar" @click="cancelEditName">
                        <i class="fas fa-times text-xs"></i>
                      </button>
                    </div>
                    <div v-else class="flex items-center gap-1.5 group/name">
                      <span class="truncate" :title="ec.name">{{ ec.name || '—' }}</span>
                      <button
                        class="h-6 w-6 grid place-items-center rounded text-ink-subtle opacity-0 group-hover/name:opacity-100 hover:text-accent hover:bg-surface-hover transition-opacity shrink-0"
                        title="Editar nome de exibição"
                        @click="startEditName(ec)">
                        <i class="fas fa-pen text-[10px]"></i>
                      </button>
                    </div>
                  </td>
                  <td class="px-4 py-2 text-xs text-ink-muted">{{ ec.city || '—' }}</td>
                  <td class="px-4 py-2 text-center text-xs font-mono tabular-nums">{{ ec.erpId }}</td>
                  <td class="px-4 py-2 text-center text-xs font-mono tabular-nums">
                    {{ ec.lastRunAt ? new Date(ec.lastRunAt).toLocaleString('pt-BR') : '—' }}
                  </td>
                  <td class="px-4 py-2 text-center">
                    <Badge :variant="statusVariant(ec.lastStatus)" size="sm">
                      {{ statusLabel(ec.lastStatus) }}
                    </Badge>
                  </td>
                  <td class="px-4 py-2 text-right text-xs text-ink-muted">
                    <div v-if="ec.lastSummary && !ec.lastSummary.error">
                      <span class="font-mono tabular-nums">{{ ec.lastSummary.totalBills || 0 }}</span> bills
                      <span class="text-ink-subtle">· +{{ ec.lastSummary.newBills || 0 }} novos</span>
                    </div>
                    <span v-else-if="ec.lastSummary?.error"
                      class="text-red-500 truncate max-w-[180px] inline-block"
                      :title="ec.lastSummary.error">{{ ec.lastSummary.error }}</span>
                    <span v-else class="text-ink-subtle">—</span>
                  </td>
                  <td class="px-4 py-2 text-right whitespace-nowrap">
                    <Button variant="secondary" size="sm" icon="fas fa-play"
                      :disabled="!!currentRun?.running"
                      @click="runOne(ec)">
                      Rodar
                    </Button>
                    <Button variant="ghost" size="sm" icon="fas fa-trash-can"
                      class="!text-red-500 ml-1"
                      :disabled="!!currentRun?.running"
                      title="Apagar todos os dados deste empreendimento e re-sincronizar do zero"
                      @click="purgeEnterprise(ec)">
                      Limpar
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Surface>

        <Surface v-if="!filteredCompanies.length && !loading" variant="raised" padding="md" class="surface-gradient">
          <EmptyState icon="fas fa-inbox" title="Nenhum resultado"
            :description="search ? 'Nenhuma empresa/CC bate com a busca.' : 'Aguardando carga.'" />
        </Surface>
      </div>
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
import Input from '@/components/UI/Input.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import { useCostCenterNamesStore } from '@/stores/Financeiro/costCenterNamesStore';

const toast = (() => {
  try { return useToast(); }
  catch { return { success: console.log, error: console.error }; }
})();

const ccNames = useCostCenterNamesStore();

const enterprises = ref([]);
const currentRun = ref(null);
const loading = ref(false);
const triggering = ref(false);
const recurringActionBusy = ref(false);
const search = ref('');
const expanded = ref(new Set());
const selectedIds = ref(new Set());
let pollTimer = null;

// ── Edição inline do nome de exibição (override) ───────────────
const editingNameId = ref(null);
const editNameValue = ref('');
const nameSaving = ref(false);

function startEditName(ec) {
  editingNameId.value = ec.id;
  editNameValue.value = ec.name || '';
}
function cancelEditName() {
  editingNameId.value = null;
  editNameValue.value = '';
}
async function saveName(ec) {
  const name = (editNameValue.value || '').trim();
  if (!name) { toast.error('Informe um nome.'); return; }
  const ccId = Number(ec.erpId);
  if (!Number.isFinite(ccId)) { toast.error('CC inválido.'); return; }
  nameSaving.value = true;
  try {
    await requestWithAuth(`${API_URL}/expenses/admin/cost-center-overrides/${ccId}`, {
      method: 'PUT',
      body: JSON.stringify({ displayName: name }),
    });
    // reflete imediatamente: tabela local + store compartilhado (Custos/Títulos)
    ec.name = name;
    ccNames.setLocal(ccId, name);
    toast.success(`Nome do CC ${ccId} atualizado.`);
    cancelEditName();
  } catch (err) {
    toast.error('Falha ao salvar: ' + (err.message || ''));
  } finally {
    nameSaving.value = false;
  }
}

// ── Agrupa empreendimentos por company ─────────────────────────
const companies = computed(() => {
  const map = new Map();
  for (const ec of enterprises.value) {
    const key = ec.companyId != null ? `c-${ec.companyId}` : 'sem-empresa';
    if (!map.has(key)) {
      map.set(key, {
        companyKey: key,
        companyId: ec.companyId,
        companyName: ec.companyName,
        enterprises: [],
        statusSummary: { success: 0, error: 0, running: 0, none: 0 },
        recurringCount: 0,
      });
    }
    const group = map.get(key);
    group.enterprises.push(ec);
    if (ec.isRecurring) group.recurringCount++;
    if (!ec.lastStatus) group.statusSummary.none++;
    else if (ec.lastStatus === 'success') group.statusSummary.success++;
    else if (ec.lastStatus === 'error') group.statusSummary.error++;
    else if (ec.lastStatus === 'running') group.statusSummary.running++;
  }
  // Ordena: empresas com nome primeiro, "sem empresa" no fim
  return [...map.values()].sort((a, b) => {
    if (!a.companyName && !b.companyName) return 0;
    if (!a.companyName) return 1;
    if (!b.companyName) return -1;
    return a.companyName.localeCompare(b.companyName);
  });
});

const filteredCompanies = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return companies.value;
  return companies.value
    .map(c => {
      const compMatch = (c.companyName || '').toLowerCase().includes(q)
        || String(c.companyId).includes(q);
      const ecs = c.enterprises.filter(ec =>
        compMatch
        || (ec.name || '').toLowerCase().includes(q)
        || (ec.city || '').toLowerCase().includes(q)
        || String(ec.erpId).includes(q)
      );
      return ecs.length ? { ...c, enterprises: ecs } : null;
    })
    .filter(Boolean);
});

const statusCounts = computed(() => {
  const out = { success: 0, error: 0, running: 0, none: 0 };
  for (const e of enterprises.value) {
    if (!e.lastStatus) out.none++;
    else if (e.lastStatus === 'success') out.success++;
    else if (e.lastStatus === 'error') out.error++;
    else if (e.lastStatus === 'running') out.running++;
  }
  return out;
});

const recurringCount = computed(() =>
  enterprises.value.filter(e => e.isRecurring).length
);

// ── Status badge ────────────────────────────────────────────────
function statusVariant(s) {
  return s === 'success' ? 'success'
       : s === 'error'   ? 'danger'
       : s === 'running' ? 'info'
       : 'neutral';
}
function statusLabel(s) {
  return s === 'success' ? 'OK'
       : s === 'error'   ? 'Erro'
       : s === 'running' ? 'Em curso'
       : 'Nunca';
}

// ── Expand / collapse ──────────────────────────────────────────
function toggleExpand(key) {
  if (expanded.value.has(key)) expanded.value.delete(key);
  else expanded.value.add(key);
  // forçar reatividade do Set
  expanded.value = new Set(expanded.value);
}

// ── Selection ──────────────────────────────────────────────────
function toggleSelect(id) {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id);
  else selectedIds.value.add(id);
  selectedIds.value = new Set(selectedIds.value);
}

function toggleSelectAll(comp) {
  const ids = comp.enterprises.map(e => e.id);
  const allSelected = ids.every(id => selectedIds.value.has(id));
  if (allSelected) ids.forEach(id => selectedIds.value.delete(id));
  else ids.forEach(id => selectedIds.value.add(id));
  selectedIds.value = new Set(selectedIds.value);
}

function isAllSelected(comp) {
  return comp.enterprises.every(e => selectedIds.value.has(e.id));
}

// ── Run actions ────────────────────────────────────────────────
async function load() {
  loading.value = true;
  try {
    const data = await requestWithAuth(`${API_URL}/sienge/bills/auto-sync`);
    enterprises.value = data.enterprises || [];
    currentRun.value = data.currentRun || null;
    if (pollTimer && !currentRun.value?.running) {
      stopPolling();
      toast.success('Auto-sync concluído.');
    }
  } catch (err) {
    toast.error('Falha ao carregar: ' + err.message);
  } finally {
    loading.value = false;
  }
}

async function postRunNow(payload, msgOk) {
  triggering.value = true;
  try {
    await requestWithAuth(`${API_URL}/sienge/bills/auto-sync/run-now`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    toast.success(msgOk);
    startPolling();
  } catch (err) {
    toast.error('Falha ao disparar: ' + err.message);
  } finally {
    triggering.value = false;
  }
}

async function runAll() {
  if (!recurringCount.value) {
    toast.error('Nenhum CC marcado no sync diário.');
    return;
  }
  if (!confirm(`Disparar auto-sync para os ${recurringCount.value} CC(s) marcados como recorrentes?`)) return;
  await postRunNow({ mode: 'default' }, `Auto-sync iniciado (${recurringCount.value} CCs do sync diário).`);
}

async function runOne(ec) {
  if (!confirm(`Disparar auto-sync para "${ec.name}" (CC ${ec.erpId})?`)) return;
  await postRunNow({ enterpriseCityId: ec.id, mode: 'full' }, `Sync iniciado para ${ec.name}.`);
}

async function purgeEnterprise(ec) {
  const ok = confirm(
    `⚠️ APAGAR TODOS os dados de "${ec.name}" (CC ${ec.erpId})?\n\n` +
    `Isso remove TODOS os títulos, parcelas e custos deste empreendimento do banco. ` +
    `Edições manuais (categoria/departamento) serão perdidas. Irreversível.\n\n` +
    `Após apagar, clique em "Rodar" para repopular do zero.`
  );
  if (!ok) return;
  if (!confirm(`Confirma novamente: apagar tudo de CC ${ec.erpId}?`)) return;

  try {
    await requestWithAuth(`${API_URL}/sienge/bills/auto-sync/purge`, {
      method: 'POST',
      body: JSON.stringify({ enterpriseCityId: ec.id }),
    });
    toast.success(`Dados de "${ec.name}" apagados. Rode o sync para repopular.`);
    await load();
  } catch (err) {
    toast.error('Falha ao apagar: ' + err.message);
  }
}

async function runCompany(comp) {
  const label = comp.companyName || `Empresa #${comp.companyId}`;
  if (!confirm(`Disparar auto-sync para TODOS os ${comp.enterprises.length} CCs de "${label}"?`)) return;
  if (comp.companyId) {
    await postRunNow({ companyId: comp.companyId, mode: 'full' }, `Sync iniciado para ${label}.`);
  } else {
    // "sem empresa" — manda como lista de ids
    const ids = comp.enterprises.map(e => e.id);
    await postRunNow({ enterpriseCityIds: ids, mode: 'full' }, `Sync iniciado para ${ids.length} CCs sem empresa.`);
  }
}

async function runSelected() {
  const ids = [...selectedIds.value];
  if (!ids.length) return;
  if (!confirm(`Disparar auto-sync para ${ids.length} CC(s) selecionado(s)?`)) return;
  await postRunNow({ enterpriseCityIds: ids, mode: 'full' }, `Sync iniciado para ${ids.length} CCs.`);
  selectedIds.value = new Set();
}

// ── Toggle de recorrência (inscrição no cron diário) ───────────
async function setRecurringBulk(ids, enabled) {
  recurringActionBusy.value = true;
  try {
    await requestWithAuth(`${API_URL}/sienge/bills/auto-sync/recurring`, {
      method: 'POST',
      body: JSON.stringify({ enterpriseCityIds: ids, enabled }),
    });
    // Atualização otimista local
    const set = new Set(ids);
    for (const ec of enterprises.value) {
      if (set.has(ec.id)) ec.isRecurring = enabled;
    }
    toast.success(enabled
      ? `${ids.length} CC(s) adicionado(s) ao sync diário.`
      : `${ids.length} CC(s) removido(s) do sync diário.`);
  } catch (err) {
    toast.error('Falha ao atualizar: ' + err.message);
    await load(); // ressincroniza em caso de divergência
  } finally {
    recurringActionBusy.value = false;
  }
}

async function toggleRecurringOne(ec) {
  await setRecurringBulk([ec.id], !ec.isRecurring);
}

async function toggleRecurringSelected(enabled) {
  const ids = [...selectedIds.value];
  if (!ids.length) return;
  await setRecurringBulk(ids, enabled);
  selectedIds.value = new Set();
}

// ── Polling ────────────────────────────────────────────────────
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
