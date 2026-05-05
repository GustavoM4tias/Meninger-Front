<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useProjectionsStore } from '@/stores/Comercial/Projections/projectionsStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

import Favorite from '@/components/config/Favorite.vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Badge from '@/components/UI/Badge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const store = useProjectionsStore();
const auth = useAuthStore();

const isAdmin = computed(() => auth?.user?.role === 'admin');

const currentYear = new Date().getFullYear();
const startMonth = ref(`${currentYear}-01`);
const endMonth = ref(`${currentYear}-12`);

const search = ref('');
const modalOpen = ref(false);

const form = ref({
  name: '',
  is_active: false,
  clone_source_id: null,
});

function validateRange() {
  const s = String(startMonth.value || '');
  const e = String(endMonth.value || '');
  if (!/^\d{4}-\d{2}$/.test(s) || !/^\d{4}-\d{2}$/.test(e)) return false;
  return s <= e;
}

async function refreshList() {
  if (!validateRange()) return;
  await store.fetchList({ start_month: startMonth.value, end_month: endMonth.value });
}

onMounted(async () => {
  await refreshList();
  await store.fetchAllActive();
});

watch([startMonth, endMonth], async () => { await refreshList(); });

const filtered = computed(() => {
  const q = (search.value || '').trim().toLowerCase();
  const updatedAt = (p) => new Date(p.updated_at || p.updatedAt || p.created_at || p.createdAt || 0).getTime();

  return (store.list || [])
    .filter(p => !q || String(p.name || '').toLowerCase().includes(q))
    .sort((a, b) => {
      if (!!a.is_active !== !!b.is_active) return a.is_active ? -1 : 1;
      const ua = updatedAt(a);
      const ub = updatedAt(b);
      if (ua !== ub) return ub - ua;
      return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
    });
});

async function create() {
  const name = (form.value.name || '').trim();
  if (!name) return;

  if (form.value.clone_source_id) {
    await store.cloneProjection({
      source_id: form.value.clone_source_id,
      name,
      is_active: !!form.value.is_active,
    });
  } else {
    await store.createProjection({ name, is_active: !!form.value.is_active });
  }

  modalOpen.value = false;
  form.value = { name: '', is_active: false, clone_source_id: null };

  await store.fetchAllActive();
  await refreshList();
}

const cloneOptions = computed(() => [
  { value: null, label: '— Não clonar —' },
  ...(store.allActive || []).map(p => ({ value: p.id, label: p.name })),
]);

const formatDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt) ? '—' : dt.toLocaleDateString('pt-BR');
};
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] relative">
    <PageContainer size="full">

      <!-- Header -->
      <PageHeader
        subtitle="Projeções por mês (sem vínculo fixo com ano). Filtre pelo intervalo para visualizar."
        icon="fas fa-chart-line">
        <template #title>
          <span>Projeções de vendas</span>
          <Favorite :router="'/comercial/projections'" :section="'Projeção'" />
        </template>
        <template #actions>
          <Button v-if="isAdmin" icon="fas fa-plus" size="sm" @click="modalOpen = true">
            Nova projeção
          </Button>
        </template>
      </PageHeader>

      <!-- Toolbar de filtros -->
      <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient mb-4">
        <div class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Input v-model="search" label="Buscar por nome" placeholder="Nome da projeção..."
            iconLeft="fas fa-magnifying-glass" />
          <Input v-model="startMonth" type="month" label="Mês inicial" />
          <Input v-model="endMonth" type="month" label="Mês final" />
        </div>
        <div v-if="!validateRange()"
          class="px-4 pb-3 -mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
          <i class="fas fa-circle-exclamation"></i>
          Intervalo inválido: o mês inicial deve ser menor ou igual ao mês final.
        </div>
      </section>

      <!-- Lista -->
      <EmptyState v-if="!filtered.length"
        size="lg" icon="fas fa-chart-line"
        title="Nenhuma projeção encontrada"
        :description="search ? 'Ajuste a busca para ver resultados.' : 'Crie sua primeira projeção para começar.'">
        <template v-if="isAdmin && !search" #actions>
          <Button icon="fas fa-plus" @click="modalOpen = true">Nova projeção</Button>
        </template>
      </EmptyState>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <RouterLink v-for="p in filtered" :key="p.id" :to="`/comercial/projections/${p.id}`"
          class="group block p-5 rounded-xl border border-line bg-surface-raised
                 shadow-soft hover:shadow-elevated hover:border-accent/40 hover:-translate-y-0.5
                 transition-all duration-200 ease-out-expo surface-gradient">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-1">
                <i class="fas fa-chart-line text-sm text-accent shrink-0"></i>
                <h3 class="font-semibold text-ink truncate group-hover:text-accent transition-colors">
                  {{ p.name }}
                </h3>
              </div>
              <p class="text-[11px] text-ink-subtle font-mono mt-2">
                <i class="far fa-calendar-plus text-[10px] mr-1"></i>
                Criada {{ formatDate(p.created_at || p.createdAt) }}
              </p>
              <p class="text-[11px] text-ink-subtle font-mono mt-0.5">
                <i class="far fa-clock text-[10px] mr-1"></i>
                Atualizada {{ formatDate(p.updated_at || p.updatedAt || p.created_at || p.createdAt) }}
              </p>
              <p class="text-[11px] text-ink-muted mt-2">
                Visualizando: <span class="font-mono text-ink">{{ startMonth }}</span> →
                <span class="font-mono text-ink">{{ endMonth }}</span>
              </p>
            </div>

            <div class="flex flex-col items-end gap-1 shrink-0">
              <Badge :variant="p.is_active ? 'accent' : 'neutral'" size="sm">
                <i :class="p.is_active ? 'fas fa-circle-check' : 'fas fa-circle-dot'" class="text-[9px]"></i>
                {{ p.is_active ? 'Ativa' : 'Inativa' }}
              </Badge>
              <Badge :variant="p.is_locked ? 'success' : 'danger'" size="sm">
                <i :class="p.is_locked ? 'fas fa-lock' : 'fas fa-lock-open'" class="text-[9px]"></i>
                {{ p.is_locked ? 'Bloqueada' : 'Aberta' }}
              </Badge>
            </div>
          </div>
        </RouterLink>
      </div>
    </PageContainer>

    <!-- Modal de criação -->
    <Modal v-model:open="modalOpen" size="md" title="Nova projeção"
      subtitle="Crie do zero ou clone uma projeção existente">
      <div class="space-y-4">
        <Input v-model="form.name" label="Nome" placeholder="Ex.: Projeção Geral 2026+"
          iconLeft="fas fa-tag" />

        <div>
          <Select v-model="form.clone_source_id" :options="cloneOptions"
            label="Clonar de uma projeção ativa (opcional)" />
          <p class="text-[11px] text-ink-subtle mt-1.5">
            <i class="fas fa-circle-info mr-1"></i>
            A cópia replica <strong>defaults</strong> e <strong>linhas por mês</strong>.
          </p>
        </div>

        <label class="inline-flex items-center gap-2 cursor-pointer text-sm text-ink-muted hover:text-ink transition">
          <input type="checkbox" v-model="form.is_active" class="rounded border-line accent-accent" />
          <span>Ativar após criar</span>
        </label>

        <div class="rounded-lg p-3 border border-amber-500/20 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300">
          <i class="fas fa-lightbulb mr-1"></i>
          Deixe desmarcado para revisar antes. No novo modelo, apenas 1 projeção fica ativa no sistema.
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" @click="modalOpen = false">Cancelar</Button>
        <Button icon="fas fa-check" :disabled="!form.name.trim()" @click="create">Criar</Button>
      </template>
    </Modal>
  </div>
</template>
