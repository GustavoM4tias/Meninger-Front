<script setup>
/**
 * Projeções — lista (tela nova). Cards com status, ativar rápido e EXCLUSÃO real.
 * Criar do zero ou clonar. Mobile-first.
 */
import { ref, computed, onMounted, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useProjectionsStore } from '@/stores/Comercial/Projections/projectionsStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

import Favorite from '@/components/config/Favorite.vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import Badge from '@/components/UI/Badge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import { formatDate } from './projectionUtils';

const store = useProjectionsStore();
const auth = useAuthStore();
const toast = useToast();

const isAdmin = computed(() => auth?.user?.role === 'admin');

const currentYear = new Date().getFullYear();
const startMonth = ref(`${currentYear}-01`);
const endMonth = ref(`${currentYear}-12`);
const search = ref('');

const validRange = computed(() => {
  const s = String(startMonth.value || ''), e = String(endMonth.value || '');
  return /^\d{4}-\d{2}$/.test(s) && /^\d{4}-\d{2}$/.test(e) && s <= e;
});

async function refreshList() {
  if (!validRange.value) return;
  await store.fetchList({ start_month: startMonth.value, end_month: endMonth.value });
}

onMounted(async () => { await refreshList(); await store.fetchAll(); });
watch([startMonth, endMonth], refreshList);

const filtered = computed(() => {
  const q = (search.value || '').trim().toLowerCase();
  const updated = (p) => new Date(p.updated_at || p.updatedAt || p.created_at || p.createdAt || 0).getTime();
  return (store.list || [])
    .filter((p) => !q || String(p.name || '').toLowerCase().includes(q))
    .sort((a, b) => {
      if (!!a.is_active !== !!b.is_active) return a.is_active ? -1 : 1;
      const d = updated(b) - updated(a);
      return d !== 0 ? d : String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
    });
});

/* ── Criar / clonar ────────────────────────────────────────────────────────── */
const modalOpen = ref(false);
const creating = ref(false);
const form = ref({ name: '', is_active: false, clone_source_id: null });

const cloneOptions = computed(() => [
  { value: null, label: '— Criar em branco —' },
  ...(store.allProjections || [])
    .slice()
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'))
    .map((p) => ({ value: p.id, label: p.is_active ? `${p.name} (ativa)` : p.name })),
]);

async function create() {
  const name = (form.value.name || '').trim();
  if (!name) return;
  creating.value = true;
  try {
    if (form.value.clone_source_id) {
      await store.cloneProjection({ source_id: form.value.clone_source_id, name, is_active: !!form.value.is_active });
    } else {
      await store.createProjection({ name, is_active: !!form.value.is_active });
    }
    modalOpen.value = false;
    form.value = { name: '', is_active: false, clone_source_id: null };
    await store.fetchAll();
    await refreshList();
    toast.success('Projeção criada.');
  } catch (e) {
    toast.error(e?.message || 'Erro ao criar projeção.');
  } finally {
    creating.value = false;
  }
}

/* ── Ativar ────────────────────────────────────────────────────────────────── */
async function activate(p) {
  try {
    await store.updateMeta(p.id, { is_active: true });
    await store.fetchAll();
    await refreshList();
    toast.success(`"${p.name}" agora é a projeção ativa.`);
  } catch (e) {
    toast.error(e?.message || 'Erro ao ativar.');
  }
}

/* ── Excluir ───────────────────────────────────────────────────────────────── */
const deleteTarget = ref(null);
const deleting = ref(false);
const deleteConfirmText = ref('');

function askDelete(p) { deleteTarget.value = p; deleteConfirmText.value = ''; }
async function confirmDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.deleteProjection(deleteTarget.value.id);
    toast.success('Projeção excluída.');
    deleteTarget.value = null;
    await store.fetchAll();
    await refreshList();
  } catch (e) {
    toast.error(e?.message || 'Erro ao excluir. Se estiver bloqueada, desbloqueie antes.');
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <PageContainer size="full">
    <PageHeader subtitle="Metas de venda por mês e empreendimento. Uma projeção fica ativa e alimenta o Vendas × Projeção."
      icon="fas fa-bullseye">
      <template #title>
        <span>Projeções de vendas</span>
        <Favorite :router="'/comercial/projections'" :section="'Projeção'" />
      </template>
      <template #actions>
        <PageHelp storage-key="projection-list" title="Como usar as Projeções"
          intro="Cada projeção é um conjunto de metas mensais por empreendimento. Você pode ter várias, mas só uma fica ativa (a que o dashboard Vendas × Projeção usa)."
          :steps="[
            { title: 'Filtre o período', text: 'Ajuste mês inicial/final para ver as projeções daquele intervalo.' },
            { title: 'Abra uma projeção', text: 'Clique no card para editar as metas mês a mês.' },
            { title: 'Crie ou clone', text: 'Nova projeção começa em branco ou copiando uma existente (defaults + metas).' },
            { title: 'Ative a correta', text: 'Use \'Tornar ativa\' para definir qual projeção o dashboard vai comparar.' },
          ]"
          :tips="['Para excluir, a projeção não pode estar bloqueada.', 'Ativar uma projeção desativa automaticamente a anterior.']" />
        <Button v-if="isAdmin" icon="fas fa-plus" size="sm" @click="modalOpen = true">Nova projeção</Button>
      </template>
    </PageHeader>

    <!-- Filtros -->
    <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient mb-4 p-3 sm:p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Input v-model="search" label="Buscar por nome" placeholder="Nome da projeção..." iconLeft="fas fa-magnifying-glass" />
        <Input v-model="startMonth" type="month" label="Mês inicial" />
        <Input v-model="endMonth" type="month" label="Mês final" />
      </div>
      <p v-if="!validRange" class="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
        <i class="fas fa-circle-exclamation"></i> Intervalo inválido: o mês inicial deve ser menor ou igual ao final.
      </p>
    </section>

    <!-- Lista -->
    <EmptyState v-if="!filtered.length" size="lg" icon="fas fa-bullseye"
      title="Nenhuma projeção encontrada"
      :description="search ? 'Ajuste a busca para ver resultados.' : 'Crie sua primeira projeção para começar.'">
      <template v-if="isAdmin && !search" #actions>
        <Button icon="fas fa-plus" @click="modalOpen = true">Nova projeção</Button>
      </template>
    </EmptyState>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="p in filtered" :key="p.id"
        class="group relative flex flex-col p-4 rounded-xl border border-line bg-surface-raised shadow-soft
               hover:shadow-elevated hover:border-accent/40 transition-all duration-200 surface-gradient">
        <RouterLink :to="`/comercial/projections/${p.id}`" class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <h3 class="font-semibold text-ink truncate group-hover:text-accent transition-colors flex items-center gap-2">
                <i class="fas fa-bullseye text-sm text-accent shrink-0"></i>{{ p.name }}
              </h3>
              <p class="text-[11px] text-ink-subtle font-mono mt-2">
                <i class="far fa-clock text-[10px] mr-1"></i>Atualizada {{ formatDate(p.updated_at || p.updatedAt || p.created_at || p.createdAt) }}
              </p>
            </div>
            <div class="flex flex-col items-end gap-1 shrink-0">
              <Badge :variant="p.is_active ? 'accent' : 'neutral'" size="sm">
                <i :class="p.is_active ? 'fas fa-circle-check' : 'fas fa-circle-dot'" class="text-[9px]"></i>
                {{ p.is_active ? 'Ativa' : 'Inativa' }}
              </Badge>
              <Badge :variant="p.is_locked ? 'success' : 'warning'" size="sm">
                <i :class="p.is_locked ? 'fas fa-lock' : 'fas fa-lock-open'" class="text-[9px]"></i>
                {{ p.is_locked ? 'Bloqueada' : 'Aberta' }}
              </Badge>
            </div>
          </div>
        </RouterLink>

        <!-- Ações (admin) -->
        <div v-if="isAdmin" class="flex items-center gap-2 mt-3 pt-3 border-t border-line-subtle">
          <RouterLink :to="`/comercial/projections/${p.id}`"
            class="text-xs font-medium text-accent hover:text-accent-hover flex items-center gap-1.5">
            <i class="fas fa-pen"></i> Editar
          </RouterLink>
          <span class="flex-1"></span>
          <button v-if="!p.is_active" @click="activate(p)" v-tippy:top="'Tornar a projeção ativa'"
            class="h-8 px-2.5 rounded-lg text-xs text-ink-muted hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors flex items-center gap-1.5">
            <i class="fas fa-circle-check"></i> Ativar
          </button>
          <button @click="askDelete(p)"
            :disabled="p.is_locked" v-tippy:top="p.is_locked ? 'Desbloqueie antes de excluir' : 'Excluir projeção'"
            class="h-8 w-8 grid place-items-center rounded-lg text-ink-muted hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink-muted">
            <i class="fas fa-trash-can text-sm"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal criar -->
    <Modal v-model:open="modalOpen" size="md" title="Nova projeção" subtitle="Crie do zero ou clone uma existente">
      <div class="space-y-4">
        <Input v-model="form.name" label="Nome" placeholder="Ex.: Metas 2027" iconLeft="fas fa-tag" />
        <Select v-model="form.clone_source_id" :options="cloneOptions" label="Clonar de (opcional)" />
        <Switch v-model="form.is_active" size="sm" label="Ativar após criar"
          description="Só uma projeção fica ativa - as demais são desativadas." />
      </div>
      <template #footer>
        <Button variant="ghost" @click="modalOpen = false">Cancelar</Button>
        <Button icon="fas fa-check" :disabled="!form.name.trim()" :loading="creating" @click="create">Criar</Button>
      </template>
    </Modal>

    <!-- Modal excluir -->
    <Modal :open="!!deleteTarget" size="md" title="Excluir projeção" @close="deleteTarget = null">
      <div v-if="deleteTarget" class="space-y-3">
        <div class="rounded-lg p-3 border border-red-500/20 bg-red-500/10 text-sm text-red-700 dark:text-red-300">
          <i class="fas fa-triangle-exclamation mr-1.5"></i>
          Isto remove <strong>{{ deleteTarget.name }}</strong> e todas as suas metas, ajustes e histórico. Não dá para desfazer.
        </div>
        <Input v-model="deleteConfirmText" label="Digite EXCLUIR para confirmar" placeholder="EXCLUIR" />
      </div>
      <template #footer>
        <Button variant="ghost" @click="deleteTarget = null">Cancelar</Button>
        <Button variant="danger" icon="fas fa-trash-can" :loading="deleting"
          :disabled="deleteConfirmText.trim().toUpperCase() !== 'EXCLUIR'" @click="confirmDelete">
          Excluir definitivamente
        </Button>
      </template>
    </Modal>
  </PageContainer>
</template>
