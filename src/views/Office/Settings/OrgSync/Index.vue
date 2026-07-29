<script setup>
import { ref, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useOrgSyncStore } from '@/stores/Settings/Admin/orgSyncStore';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { useToast } from 'vue-toastification';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Surface from '@/components/UI/Surface.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Modal from '@/components/UI/Modal.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Favorite from '@/components/config/Favorite.vue';

const store = useOrgSyncStore();
const carregamento = useCarregamentoStore();
const toast = (() => {
  try { return useToast(); }
  catch { return { success: console.log, error: console.error }; }
})();

const { items, total, companies, page, pageSize, loading, error, filtros } = storeToRefs(store);

const searchQuery = computed({
  get: () => filtros.value.q || '',
  set: (v) => { filtros.value.q = v; },
});
const filterStatus = computed({
  get: () => filtros.value.status || '',
  set: (v) => { filtros.value.status = v; },
});
const filterCompany = computed({
  get: () => filtros.value.companyId || '',
  set: (v) => { filtros.value.companyId = v; },
});

const totalPages = computed(() => Math.max(1, Math.ceil((total.value || 0) / (pageSize.value || 50))));

const statusOptions = [
  { value: '',         label: 'Todos os status' },
  { value: 'paired',   label: 'Pareado (CV + Sienge)' },
  { value: 'cv_only',  label: 'Só CV' },
  { value: 'erp_only', label: 'Só Sienge' },
];

const companyOptions = computed(() => [
  { value: '', label: 'Todas as empresas' },
  ...companies.value.map(c => ({ value: String(c.id), label: c.name })),
]);

const statusMeta = {
  paired:   { label: 'Pareado',  variant: 'success', icon: 'fa-link' },
  cv_only:  { label: 'Só CV',    variant: 'accent',  icon: 'fa-database' },
  erp_only: { label: 'Só Sienge', variant: 'warning', icon: 'fa-building' },
};

async function buscar(reset = false) { await store.fetchList({ resetPage: reset }); }
function clearFilters() {
  searchQuery.value = ''; filterStatus.value = ''; filterCompany.value = '';
  buscar(true);
}
async function goTo(p) {
  if (p < 1 || p > totalPages.value) return;
  page.value = p;
  await buscar(false);
}

// ── Sync com confirmação em 2 passos (mesmo padrão da tela anterior) ─────────
const confirmVisible = ref(false);
const confirmStep = ref(1);
const confirmSource = ref('');
const confirmPhraseInput = ref('');
const confirmRequiredPhrase = computed(() =>
  confirmSource.value === 'crm' ? 'SINCRONIZAR CV' : 'SINCRONIZAR SIENGE'
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
  const source = confirmSource.value;
  closeConfirm();
  try {
    carregamento.iniciarCarregamento();
    const r = await store.runSync(source);
    await Promise.all([buscar(false), store.fetchCompanies()]);
    const c = r?.consolidated || {};
    toast.success(`Sync ${source === 'crm' ? 'CV' : 'Sienge'} concluído. ${c.enterprises ?? 0} empreendimento(s), ${c.companies ?? 0} empresa(s).`);
  } catch (e) {
    toast.error(e.message);
  } finally {
    carregamento.finalizarCarregamento();
  }
}

async function runConsolidate() {
  try {
    carregamento.iniciarCarregamento();
    const r = await store.consolidate();
    await Promise.all([buscar(false), store.fetchCompanies()]);
    toast.success(`Consolidado: ${r.enterprises ?? 0} empreendimento(s).`);
  } catch (e) {
    toast.error(e.message);
  } finally {
    carregamento.finalizarCarregamento();
  }
}

// ── Pareamento manual ────────────────────────────────────────────────────────
const pairModalRow = ref(null);      // linha base (sobrevivente)
const pairSearch = ref('');

const pairCandidates = computed(() => {
  if (!pairModalRow.value) return [];
  // par válido: um tem CV, o outro tem Sienge
  const needErp = !pairModalRow.value.erp_cost_center_id;
  const q = pairSearch.value.trim().toLowerCase();
  return items.value
    .filter(r => r.id !== pairModalRow.value.id)
    .filter(r => needErp ? (r.erp_cost_center_id && !r.cv_id) : (r.cv_id && !r.erp_cost_center_id))
    .filter(r => !q || String(r.name || '').toLowerCase().includes(q));
});

function openPair(row) {
  pairModalRow.value = row;
  pairSearch.value = '';
}

async function confirmPair(candidate) {
  const base = pairModalRow.value;
  if (!confirm(`Parear "${base.name}" com "${candidate.name}"? Os dois registros viram UM (liberações de acesso são unificadas).`)) return;
  try {
    await store.pair(base.id, candidate.id);
    pairModalRow.value = null;
    await buscar(false);
    toast.success('Empreendimentos pareados.');
  } catch (e) {
    toast.error(e.message);
  }
}

// ── Empresa / ativo ──────────────────────────────────────────────────────────
const companyModalRow = ref(null);
const companyModalValue = ref('');

function openCompany(row) {
  companyModalRow.value = row;
  companyModalValue.value = row.company_id ? String(row.company_id) : '';
}

async function saveCompany() {
  try {
    await store.updateEnterprise(companyModalRow.value.id, {
      companyId: companyModalValue.value ? Number(companyModalValue.value) : null,
    });
    companyModalRow.value = null;
    await buscar(false);
    toast.success('Empresa vinculada.');
  } catch (e) {
    toast.error(e.message);
  }
}

async function toggleActive(row) {
  const acao = row.active ? 'Inativar' : 'Reativar';
  if (!confirm(`${acao} "${row.name}"? Empreendimento inativo some das liberações de acesso.`)) return;
  try {
    await store.updateEnterprise(row.id, { active: !row.active });
    await buscar(false);
  } catch (e) {
    toast.error(e.message);
  }
}

onMounted(() => {
  buscar(true);
  store.fetchCompanies();
});
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="xl">

      <!-- Header -->
      <PageHeader
        title="Sincronização de empresas"
        subtitle="Registro unificado de empresas (Sienge) e empreendimentos (CV × Sienge). A cidade é sempre a efetiva das fontes - sem ajustes manuais."
        icon="fas fa-building-circle-arrow-right">
        <template #title>
          <span>Sincronização de empresas</span>
          <Favorite :router="'/settings/empresas'" :section="'Empresas'" />
        </template>
        <template #actions>
          <PageHelp
            title="Como usar a Sincronização de empresas"
            :steps="[
              { title: 'Sincronizar', text: 'Use Sync CV para trazer os empreendimentos do CRM e Sync Sienge para trazer empresas e centros de custo do ERP. Rode os dois na primeira vez.' },
              { title: 'Conferir pareamento', text: 'Cada linha mostra o status: Pareado (CV e Sienge casados), Só CV ou Só Sienge. O ideal é tudo Pareado.' },
              { title: 'Parear manualmente', text: 'Se o mesmo empreendimento aparece em duas linhas (uma Só CV e outra Só Sienge), clique em Parear e escolha a outra metade.' },
              { title: 'Vincular empresa', text: 'Linhas sem empresa podem ser vinculadas manualmente pelo botão Empresa.' },
            ]"
            :tips="[
              'Este cadastro é a base das liberações de acesso por empreendimento na tela de Alçadas.',
              'Empreendimento inativo deixa de aparecer nas liberações, mas o histórico não é apagado.',
            ]" />
          <Button variant="secondary" @click="openConfirm('crm')">
            <img src="/CVLogo.png" alt="CV" class="h-3.5 w-3.5" />
            Sync CV
          </Button>
          <Button @click="openConfirm('erp')" icon="fas fa-arrows-rotate">
            Sync Sienge
          </Button>
          <Button variant="ghost" icon="fas fa-wand-magic-sparkles" @click="runConsolidate">
            Consolidar
          </Button>
        </template>
      </PageHeader>

      <!-- Filtros -->
      <Surface variant="raised" padding="md" class="mb-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div class="lg:col-span-2">
            <Input v-model="searchQuery" placeholder="Buscar por nome ou cidade…"
              iconLeft="fas fa-magnifying-glass" @keyup.enter="buscar(true)" />
          </div>
          <Select v-model="filterStatus" :options="statusOptions" />
          <Select v-model="filterCompany" :options="companyOptions" />
          <div class="flex items-center gap-2">
            <Button block icon="fas fa-magnifying-glass" @click="buscar(true)">Buscar</Button>
            <Button variant="ghost" icon="fas fa-eraser" @click="clearFilters" />
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
          icon="far fa-folder-open" title="Nenhum empreendimento"
          description="Rode o Sync CV e o Sync Sienge para popular o registro." />

        <div v-else class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-surface-sunken/40 border-b border-line">
              <tr>
                <th class="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Empreendimento</th>
                <th class="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Empresa</th>
                <th class="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Cidade</th>
                <th class="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-ink-subtle">CV</th>
                <th class="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-ink-subtle">CC Sienge</th>
                <th class="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
                <th class="px-4 py-2.5 w-44"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="row in items" :key="row.id"
                class="hover:bg-surface-sunken/40 transition-colors"
                :class="{ 'opacity-50': !row.active }">
                <td class="px-4 py-3 max-w-xs">
                  <div class="truncate text-ink font-medium" :title="row.name">{{ row.name || '—' }}</div>
                  <Badge v-if="!row.active" variant="danger" size="sm" class="mt-1">Inativo</Badge>
                </td>
                <td class="px-4 py-3 text-xs text-ink-muted max-w-[180px] truncate" :title="row.company?.name">
                  {{ row.company?.name || '—' }}
                </td>
                <td class="px-4 py-3 text-xs text-ink">
                  {{ row.city || '—' }}<span v-if="row.uf" class="text-ink-subtle">/{{ row.uf }}</span>
                </td>
                <td class="px-4 py-3 text-ink-muted text-xs font-mono">{{ row.cv_id ?? '—' }}</td>
                <td class="px-4 py-3 text-ink-muted text-xs font-mono">{{ row.erp_cost_center_id ?? '—' }}</td>
                <td class="px-4 py-3">
                  <Badge :variant="statusMeta[row.pair_status]?.variant || 'neutral'" size="sm">
                    <i class="fas mr-1 text-[9px]" :class="statusMeta[row.pair_status]?.icon"></i>
                    {{ statusMeta[row.pair_status]?.label || row.pair_status }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1">
                    <Button v-if="row.pair_status !== 'paired'" size="sm" variant="secondary"
                      icon="fas fa-link" @click="openPair(row)">Parear</Button>
                    <Button size="sm" variant="ghost" icon="fas fa-building" @click="openCompany(row)">Empresa</Button>
                    <Button size="sm" variant="ghost"
                      :icon="row.active ? 'fas fa-ban' : 'fas fa-rotate-left'"
                      :class="row.active ? 'text-red-500' : ''"
                      @click="toggleActive(row)" />
                  </div>
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

    <!-- Modal Parear -->
    <Modal :open="!!pairModalRow" size="lg" @close="pairModalRow = null">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
            <i class="fas fa-link text-sm"></i>
          </div>
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-ink">Parear empreendimento</h3>
            <p class="text-xs text-ink-muted mt-0.5 truncate">
              {{ pairModalRow?.name }} ({{ pairModalRow?.cv_id ? 'tem CV' : 'tem Sienge' }}) — escolha a outra metade
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-3">
        <Input v-model="pairSearch" placeholder="Buscar candidato…" iconLeft="fas fa-magnifying-glass" />
        <EmptyState v-if="!pairCandidates.length" icon="far fa-circle-question" title="Nenhum candidato"
          description="Só aparecem aqui registros da página atual com a metade que falta (ajuste a busca/página se necessário)." />
        <div v-else class="divide-y divide-line border border-line rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          <button v-for="c in pairCandidates" :key="c.id"
            class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-sunken/50 transition-colors"
            @click="confirmPair(c)">
            <div class="min-w-0">
              <p class="text-sm text-ink font-medium truncate">{{ c.name || '—' }}</p>
              <p class="text-[11px] text-ink-subtle font-mono">
                {{ c.cv_id ? `CV ${c.cv_id}` : `CC ${c.erp_cost_center_id}` }} · {{ c.city || 'sem cidade' }}
              </p>
            </div>
            <Badge :variant="statusMeta[c.pair_status]?.variant || 'neutral'" size="sm">
              {{ statusMeta[c.pair_status]?.label }}
            </Badge>
          </button>
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" @click="pairModalRow = null">Cancelar</Button>
      </template>
    </Modal>

    <!-- Modal Empresa -->
    <Modal :open="!!companyModalRow" size="md" @close="companyModalRow = null">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
            <i class="fas fa-building text-sm"></i>
          </div>
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-ink">Vincular empresa</h3>
            <p class="text-xs text-ink-muted mt-0.5 truncate">{{ companyModalRow?.name }}</p>
          </div>
        </div>
      </template>

      <Select v-model="companyModalValue" :options="companyOptions" label="Empresa (Sienge)" />

      <template #footer>
        <Button variant="ghost" @click="companyModalRow = null">Cancelar</Button>
        <Button icon="fas fa-floppy-disk" @click="saveCompany">Salvar</Button>
      </template>
    </Modal>

    <!-- Modal Confirmação Dupla (sync) -->
    <Modal :open="confirmVisible" size="md" @close="closeConfirm">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 grid place-items-center shrink-0">
            <i class="fas fa-triangle-exclamation text-sm"></i>
          </div>
          <div>
            <h3 class="text-base font-semibold text-ink">
              Sincronizar {{ confirmSource === 'crm' ? 'CV (CRM)' : 'Sienge (ERP)' }}
            </h3>
            <p class="text-xs text-ink-muted mt-0.5">
              Passo {{ confirmStep }} de 2 — {{ confirmStep === 1 ? 'aviso' : 'confirmação' }}
            </p>
          </div>
        </div>
      </template>

      <template v-if="confirmStep === 1">
        <div class="rounded-lg border border-line bg-surface-sunken p-4 space-y-2 text-sm text-ink">
          <p>
            Consulta a API do {{ confirmSource === 'crm' ? 'CV' : 'Sienge' }} e
            <strong>atualiza o registro unificado</strong> de empresas/empreendimentos.
          </p>
          <ul class="list-disc pl-4 space-y-1 text-xs text-ink-muted">
            <li>Não remove liberações de acesso já concedidas.</li>
            <li>Pareamentos manuais são preservados.</li>
            <li>Cidades passam a refletir exatamente o que está na fonte.</li>
          </ul>
        </div>
      </template>

      <template v-else>
        <div class="space-y-3">
          <p class="text-sm text-ink">Digite exatamente a frase abaixo para confirmar:</p>
          <div class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-mono font-semibold text-amber-700 dark:text-amber-300 text-center tracking-wide">
            {{ confirmRequiredPhrase }}
          </div>
          <Input v-model.trim="confirmPhraseInput" placeholder="Digite aqui…" hint="Tudo em maiúsculo." />
        </div>
      </template>

      <template #footer>
        <Button v-if="confirmStep === 2" variant="ghost" @click="confirmStep = 1">Voltar</Button>
        <Button variant="ghost" @click="closeConfirm">Cancelar</Button>
        <Button v-if="confirmStep === 1" @click="confirmStep = 2">Continuar</Button>
        <Button v-else :disabled="!canConfirm" icon="fas fa-play" variant="danger" @click="runConfirmedSync">
          Iniciar
        </Button>
      </template>
    </Modal>
  </div>
</template>
