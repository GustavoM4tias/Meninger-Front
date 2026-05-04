<script setup>
import { ref, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useEnterpriseCitiesStore } from '@/stores/Settings/Admin/enterpriseCitiesStore';
import { useCarregamentoStore } from '@/stores/Config/carregamento';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import Modal from '@/components/UI/Modal.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Switch from '@/components/UI/Switch.vue';
import Favorite from '@/components/config/Favorite.vue';

const store = useEnterpriseCitiesStore();
const carregamento = useCarregamentoStore();

const { items, total, page, pageSize, loading, error, filtros, logs, showRaw } = storeToRefs(store);

const jsonPopoverOpenId = ref(null);
function toggleJson(id) { jsonPopoverOpenId.value = jsonPopoverOpenId.value === id ? null : id; }

const showOverrideModal = ref(false);
const editingRow = ref(null);
const newCity = ref('');
const showLogs = ref(false);

const searchQuery = computed({
  get: () => filtros.value.q || '',
  set: (v) => { filtros.value.q = v; },
});
const filterSource = computed({
  get: () => filtros.value.source || '',
  set: (v) => { filtros.value.source = v; },
});
const filterOverride = computed({
  get: () => filtros.value.hasOverride ?? '',
  set: (v) => { filtros.value.hasOverride = v; },
});

const totalPages = computed(() => Math.max(1, Math.ceil((total.value || 0) / (pageSize.value || 50))));

const sourceOptions = [
  { value: '',    label: 'Todas as fontes' },
  { value: 'crm', label: 'CRM' },
  { value: 'erp', label: 'ERP' },
];
const overrideOptions = [
  { value: '',      label: 'Todos' },
  { value: 'true',  label: 'Com override' },
  { value: 'false', label: 'Sem override' },
];

function fmtSource(s) { return s === 'crm' ? 'CRM' : s === 'erp' ? 'ERP' : s; }
const sourceVariant = (s) => s === 'crm' ? 'accent' : 'success';

function openOverride(row) {
  editingRow.value = row;
  newCity.value = row.city_override || row.effective_city || '';
  showOverrideModal.value = true;
}

async function saveOverride() {
  try {
    await store.setOverride(editingRow.value.id, newCity.value.trim() || null);
    showOverrideModal.value = false;
  } catch (e) { alert(e.message); }
}

async function buscar(reset = false) { await store.fetchList({ resetPage: reset }); }
function clearFilters() {
  searchQuery.value = ''; filterSource.value = ''; filterOverride.value = '';
  buscar(true);
}
async function goTo(p) {
  if (p < 1 || p > totalPages.value) return;
  page.value = p;
  await buscar(false);
}

// ── Sync ─────────────────────────────────────────────
const erpLimit = ref(200);
const erpMaxCount = ref('');
const erpVerbose = ref(false);

const confirmVisible = ref(false);
const confirmStep = ref(1);
const confirmSource = ref('');
const confirmPhraseInput = ref('');
const confirmRequiredPhrase = computed(() =>
  confirmSource.value === 'crm' ? 'RECALCULAR CRM' : 'RECALCULAR ERP'
);
const canConfirm = computed(() =>
  confirmPhraseInput.value.trim().toUpperCase() === confirmRequiredPhrase.value
);

function openConfirm(source) {
  confirmSource.value = source; confirmStep.value = 1;
  confirmPhraseInput.value = ''; confirmVisible.value = true;
}
function closeConfirm() {
  confirmVisible.value = false; confirmPhraseInput.value = '';
  confirmStep.value = 1; confirmSource.value = '';
}

async function runConfirmedSync() {
  try {
    confirmSource.value === 'crm' ? await doSyncCRM() : await doSyncERP();
  } finally { closeConfirm(); }
}

async function doSyncCRM() {
  try {
    carregamento.iniciarCarregamento();
    const r = await store.syncCRM();
    await buscar(false);
    alert(`CRM sync ok. Itens: ${r.count ?? 0}`);
  } catch (e) { alert(e.message); }
  finally { carregamento.finalizarCarregamento(); }
}

async function doSyncERP() {
  try {
    carregamento.iniciarCarregamento();
    const opts = { limit: Number(erpLimit.value) || 200, verbose: !!erpVerbose.value };
    if (erpMaxCount.value) opts.maxCount = Number(erpMaxCount.value);
    const res = await store.syncERP(opts);
    await buscar(false);
    if (opts.verbose) showLogs.value = true;
    else alert(`ERP sync ok. upserts=${res.upserts}, matched=${res.matched}, skipped=${res.skipped}`);
  } catch (e) { alert(e.message); }
  finally { carregamento.finalizarCarregamento(); }
}

onMounted(() => buscar(true));
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="xl">

      <!-- Header -->
      <PageHeader
        title="Vínculos de cidades"
        subtitle="Mapeamento de empreendimentos para cidades. Overrides prevalecem sobre o valor padrão."
        icon="fas fa-map-location-dot">
        <template #title>
          <span>Vínculos de cidades</span>
          <Favorite :router="'/settings/cidades'" :section="'Cidades'" />
        </template>
        <template #actions>
          <Button variant="secondary" @click="openConfirm('crm')">
            <img src="/CVLogo.png" alt="CRM" class="h-3.5 w-3.5" />
            Sync CRM
          </Button>
          <Button @click="openConfirm('erp')" icon="fas fa-arrows-rotate">
            Sync ERP
          </Button>
        </template>
      </PageHeader>

      <!-- Filtros -->
      <Surface variant="raised" padding="md" class="mb-4">
        <div class="space-y-3">
          <Input v-model="searchQuery" placeholder="Buscar por nome, ID ou cidade…"
            iconLeft="fas fa-magnifying-glass" @keyup.enter="buscar(true)" />

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select v-model="filterSource" :options="sourceOptions" label="Fonte" />
            <Select v-model="filterOverride" :options="overrideOptions" label="Override" />
            <div class="flex items-end gap-2">
              <Button block icon="fas fa-magnifying-glass" @click="buscar(true)">Buscar</Button>
            </div>
            <div class="flex items-end">
              <Button variant="ghost" block icon="fas fa-eraser" @click="clearFilters">Limpar</Button>
            </div>
          </div>

          <!-- Parâmetros ERP -->
          <div class="pt-3 border-t border-line grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input v-model.number="erpLimit" type="number" min="50" step="50"
              label="ERP limit" hint="Tamanho de página na API do ERP (Sienge)." />
            <Input v-model="erpMaxCount" type="number" min="1"
              label="ERP máx" hint="Opcional. Limita o total processado." />
            <div class="flex flex-col justify-end gap-2 pb-1">
              <Switch v-model="erpVerbose" size="sm"
                label="Logs verbose"
                description="Logs de andamento do Sync no servidor" />
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="showRaw" @change="buscar(true)" />
                <span class="text-sm text-ink">Mostrar JSON (debug)</span>
              </label>
            </div>
          </div>
        </div>
      </Surface>

      <!-- Tabela -->
      <Surface variant="raised" padding="none" class="overflow-hidden mb-4">
        <div v-if="error" class="p-8 text-center">
          <i class="fas fa-circle-exclamation text-red-500 text-2xl mb-2"></i>
          <p class="text-sm text-ink-muted">{{ error }}</p>
        </div>

        <div v-else-if="loading" class="animate-pulse divide-y divide-line">
          <div class="h-10 bg-surface-sunken/50"></div>
          <div v-for="i in 8" :key="i" class="h-12 bg-surface-raised"></div>
        </div>

        <EmptyState v-else-if="!items.length"
          icon="far fa-folder-open" title="Nenhum registro" />

        <div v-else class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-surface-sunken/40 border-b border-line">
              <tr>
                <th class="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Fonte</th>
                <th class="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-ink-subtle">CRM ID</th>
                <th class="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-ink-subtle">ERP ID</th>
                <th class="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Empreendimento</th>
                <th class="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Padrão</th>
                <th class="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Override</th>
                <th class="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Efetiva</th>
                <th class="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-ink-subtle">JSON</th>
                <th class="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="row in items" :key="row.id"
                class="hover:bg-surface-sunken/40 transition-colors">
                <td class="px-4 py-3">
                  <Badge :variant="sourceVariant(row.source)" size="sm">
                    <i class="fas mr-1 text-[9px]"
                      :class="row.source === 'crm' ? 'fa-database' : 'fa-building'"></i>
                    {{ fmtSource(row.source) }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-ink-muted text-xs font-mono">{{ row.crm_id ?? '—' }}</td>
                <td class="px-4 py-3 text-ink-muted text-xs font-mono">{{ row.erp_id ?? '—' }}</td>
                <td class="px-4 py-3 max-w-xs truncate text-ink" :title="row.enterprise_name">
                  {{ row.enterprise_name }}
                </td>
                <td class="px-4 py-3 text-ink-muted text-xs">{{ row.default_city || '—' }}</td>
                <td class="px-4 py-3">
                  <Badge v-if="row.city_override" variant="warning" size="sm">{{ row.city_override }}</Badge>
                  <span v-else class="text-ink-subtle">—</span>
                </td>
                <td class="px-4 py-3 text-xs">
                  <span class="font-medium text-ink">{{ row.effective_city || '—' }}</span>
                  <span v-if="row.city_override" class="ml-1 text-[10px] text-ink-subtle">(override)</span>
                </td>
                <td class="px-4 py-3 relative">
                  <button v-if="'raw_payload' in row"
                    :disabled="!row.raw_payload || (typeof row.raw_payload === 'object' && !Object.keys(row.raw_payload).length)"
                    class="px-2 py-1 text-xs rounded-md bg-surface-sunken text-ink-muted border border-line
                           hover:bg-accent-soft hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    @click.stop="toggleJson(row.id)">
                    JSON
                  </button>

                  <div v-if="jsonPopoverOpenId === row.id"
                    class="absolute z-20 mt-2 w-[36rem] max-w-[80vw] right-0 bg-surface-overlay border border-line rounded-xl shadow-overlay p-4"
                    @click.stop>
                    <div class="flex items-center justify-between mb-3">
                      <span class="text-xs font-mono text-ink-muted">raw_payload</span>
                      <div class="flex items-center gap-1">
                        <Button size="sm" variant="ghost" icon="fas fa-copy"
                          @click="navigator.clipboard.writeText(JSON.stringify(row.raw_payload, null, 2))">
                          Copiar
                        </Button>
                        <a :href="'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(row.raw_payload, null, 2))"
                          :download="`raw-${row.source}-${row.erp_id || row.crm_id || row.id}.json`"
                          class="text-xs px-2 py-1 rounded-md bg-surface-sunken hover:bg-accent-soft hover:text-accent text-ink-muted transition-colors">
                          <i class="fas fa-download mr-1 text-[10px]"></i>Baixar
                        </a>
                        <IconButton icon="fas fa-xmark" size="sm" label="Fechar"
                          @click="jsonPopoverOpenId = null" />
                      </div>
                    </div>
                    <pre class="text-xs leading-5 whitespace-pre-wrap overflow-auto max-h-72
                                bg-surface-sunken rounded-lg p-3 text-ink font-mono">{{ JSON.stringify(row.raw_payload, null, 2) }}</pre>
                  </div>
                </td>
                <td class="px-4 py-3 text-right">
                  <Button size="sm" variant="secondary" @click="openOverride(row)">Editar</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Surface>

      <!-- Pagination -->
      <div class="flex items-center justify-between flex-wrap gap-2">
        <p class="text-xs text-ink-muted">
          Total: <span class="font-mono text-ink">{{ total }}</span>
          · Página <span class="font-mono text-ink">{{ page }}</span>
          de <span class="font-mono text-ink">{{ totalPages }}</span>
        </p>
        <div class="flex items-center gap-2">
          <Button variant="secondary" size="sm" :disabled="page <= 1" icon="fas fa-chevron-left"
            @click="goTo(page - 1)">Anterior</Button>
          <Button variant="secondary" size="sm" :disabled="page >= totalPages" icon-right="fas fa-chevron-right"
            @click="goTo(page + 1)">Próxima</Button>
        </div>
      </div>
    </PageContainer>

    <!-- Modal Override -->
    <Modal :open="showOverrideModal" size="md" @close="showOverrideModal = false">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 grid place-items-center shrink-0">
            <i class="fas fa-pen text-sm"></i>
          </div>
          <div>
            <h3 class="text-base font-semibold text-ink">Editar cidade do empreendimento</h3>
            <p class="text-xs text-ink-muted mt-0.5 truncate">{{ editingRow?.enterprise_name }}</p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <div class="rounded-lg border border-line bg-surface-sunken px-3 py-2.5 text-xs text-ink-muted">
          Cidade padrão:
          <strong class="text-ink ml-1">{{ editingRow?.default_city || '—' }}</strong>
        </div>
        <Input v-model.trim="newCity" label="Override de cidade"
          placeholder="Deixe vazio para remover" />
      </div>

      <template #footer>
        <Button variant="ghost" @click="showOverrideModal = false">Cancelar</Button>
        <Button icon="fas fa-floppy-disk" @click="saveOverride">Salvar</Button>
      </template>
    </Modal>

    <!-- Drawer Logs -->
    <Modal :open="showLogs" position="right" size="lg" @close="showLogs = false">
      <template #header>
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
            <i class="fas fa-terminal text-sm"></i>
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-base font-semibold text-ink">Logs do Sync ERP</h3>
            <p class="text-xs text-ink-muted mt-0.5">{{ logs?.length || 0 }} linha(s)</p>
          </div>
          <Button size="sm" variant="ghost" icon="fas fa-copy"
            @click="navigator.clipboard.writeText((logs || []).join('\n'))">
            Copiar
          </Button>
          <a :href="'data:text/plain;charset=utf-8,' + encodeURIComponent((logs || []).join('\n'))"
            download="erp-sync.log"
            class="text-xs px-2.5 py-1.5 rounded-md bg-surface-sunken hover:bg-accent-soft hover:text-accent text-ink-muted transition-colors">
            <i class="fas fa-download mr-1 text-[10px]"></i>Baixar
          </a>
          <Button size="sm" variant="ghost" @click="store.clearLogs()">Limpar</Button>
        </div>
      </template>

      <div class="-m-4 sm:-m-5 h-full p-4 sm:p-5 bg-surface-sunken font-mono text-xs leading-5 whitespace-pre-wrap overflow-y-auto">
        <template v-if="logs?.length">
          <div v-for="(l, i) in logs" :key="i" class="text-ink">{{ l }}</div>
        </template>
        <div v-else class="text-ink-subtle">Sem logs para exibir.</div>
      </div>
    </Modal>

    <!-- Modal Confirmação Dupla -->
    <Modal :open="confirmVisible" size="md" @close="closeConfirm">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 grid place-items-center shrink-0">
            <i class="fas fa-triangle-exclamation text-sm"></i>
          </div>
          <div>
            <h3 class="text-base font-semibold text-ink">
              Sincronizar {{ confirmSource === 'crm' ? 'CRM' : 'ERP' }}
            </h3>
            <p class="text-xs text-ink-muted mt-0.5">
              Passo {{ confirmStep }} de 2 — {{ confirmStep === 1 ? 'aviso' : 'confirmação' }}
            </p>
          </div>
        </div>
      </template>

      <template v-if="confirmStep === 1">
        <div class="space-y-3">
          <div class="rounded-lg border border-line bg-surface-sunken p-4 space-y-2 text-sm text-ink">
            <p>
              Irá <strong>recalcular todos os empreendimentos</strong>
              do {{ confirmSource === 'crm' ? 'CRM' : 'ERP (Sienge)' }}.
            </p>
            <ul class="list-disc pl-4 space-y-1 text-xs text-ink-muted">
              <li>Consulta a API de origem com paginação.</li>
              <li>Atualiza/insere vínculos conforme as regras.</li>
              <li>Não remove overrides existentes.</li>
            </ul>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="space-y-3">
          <p class="text-sm text-ink">Digite exatamente a frase abaixo para confirmar:</p>
          <div class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-mono font-semibold text-amber-700 dark:text-amber-300 text-center tracking-wide">
            {{ confirmRequiredPhrase }}
          </div>
          <Input v-model.trim="confirmPhraseInput" placeholder="Digite aqui…"
            hint="Tudo em maiúsculo." />
        </div>
      </template>

      <template #footer>
        <Button v-if="confirmStep === 2" variant="ghost" @click="confirmStep = 1">Voltar</Button>
        <Button variant="ghost" @click="closeConfirm">Cancelar</Button>
        <Button v-if="confirmStep === 1" @click="confirmStep = 2">Continuar</Button>
        <Button v-else :disabled="!canConfirm" icon="fas fa-play"
          variant="danger" @click="runConfirmedSync">
          Iniciar
        </Button>
      </template>
    </Modal>
  </div>
</template>
