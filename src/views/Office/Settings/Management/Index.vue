<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useAdminMetaStore } from '@/stores/Settings/Admin/metaStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import Switch from '@/components/UI/Switch.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Favorite from '@/components/config/Favorite.vue';

const router = useRouter();
const authStore = useAuthStore();
const store = useAdminMetaStore();

const toast = (() => {
  try { return useToast(); }
  catch { return { success: console.log, error: console.error }; }
})();

const tabs = [
  { value: 'departments', label: 'Departamentos', icon: 'fas fa-sitemap' },
  { value: 'positions',   label: 'Cargos',        icon: 'fas fa-id-badge' },
  { value: 'categories',  label: 'Categorias',    icon: 'fas fa-tags' },
  { value: 'cities',      label: 'Cidades',       icon: 'fas fa-city' },
];

const activeTab = ref('departments');
const showModal = ref(false);
const editingItem = ref(null);

const form = ref({
  name: '', code: '', description: '',
  departmentId: '',
  is_internal: true, is_partner: false,
  uf: '',
});

// ── Computeds ────────────────────────────────────────
const items = computed(() => ({
  departments: store.departments,
  positions:   store.positions,
  categories:  store.departmentCategories,
  cities:      store.userCities,
}[activeTab.value] || []));

const labelSingular = computed(() => ({
  departments: 'Departamento',
  positions:   'Cargo',
  categories:  'Categoria',
  cities:      'Cidade',
}[activeTab.value]));

const modalTitle = computed(() =>
  editingItem.value ? `Editar ${labelSingular.value}` : `Novo ${labelSingular.value}`
);

const departmentOptions = computed(() => [
  { value: '', label: 'Selecione um departamento' },
  ...store.departments.filter(d => d.active).map(d => ({ value: d.id, label: d.name })),
]);

const departmentNameById = (id) => {
  const dep = store.departments.find(d => d.id === id);
  return dep ? dep.name : null;
};

// ── Form ─────────────────────────────────────────────
function resetForm() {
  form.value = {
    name: '', code: '', description: '',
    departmentId: '',
    is_internal: true, is_partner: false,
    uf: '',
  };
}

function openModal(item) {
  editingItem.value = item || null;
  if (!item) { resetForm(); }
  else if (activeTab.value === 'positions') {
    form.value = {
      name: item.name, code: item.code, description: item.description || '',
      departmentId: item.department_id || item.department?.id || '',
      is_internal: !!item.is_internal, is_partner: !!item.is_partner, uf: '',
    };
  } else if (activeTab.value === 'departments') {
    form.value = {
      name: item.name, code: item.code, description: item.description || '',
      departmentId: '', is_internal: true, is_partner: false, uf: '',
    };
  } else if (activeTab.value === 'categories') {
    form.value = {
      name: item.name, code: item.code, description: item.description || '',
      departmentId: item.department_id || item.department?.id || '',
      is_internal: true, is_partner: false, uf: '',
    };
  } else {
    form.value = {
      name: item.name, uf: item.uf || '',
      code: '', description: '',
      departmentId: '', is_internal: true, is_partner: false,
    };
  }
  showModal.value = true;
}

function closeModal() { showModal.value = false; }

async function saveItem() {
  try {
    let successMessage = '';

    if (activeTab.value === 'positions') {
      if (!form.value.departmentId) { toast.error('Selecione um departamento.'); return; }
      if (!form.value.name.trim() || !form.value.code.trim()) {
        toast.error('Nome e código do cargo são obrigatórios.'); return;
      }
      const payload = {
        name: form.value.name.trim(),
        code: form.value.code.trim().toUpperCase(),
        description: form.value.description?.trim() || null,
        is_internal: !!form.value.is_internal,
        is_partner: !!form.value.is_partner,
        departmentId: Number(form.value.departmentId),
      };
      if (editingItem.value?.id) {
        await store.updatePosition(editingItem.value.id, payload);
        successMessage = 'Cargo atualizado com sucesso!';
      } else {
        await store.createPosition(payload);
        successMessage = 'Cargo criado com sucesso!';
      }
    } else if (activeTab.value === 'departments') {
      if (!form.value.name.trim() || !form.value.code.trim()) {
        toast.error('Nome e código do departamento são obrigatórios.'); return;
      }
      const payload = {
        name: form.value.name.trim(),
        code: form.value.code.trim().toUpperCase(),
        description: form.value.description?.trim() || null,
      };
      if (editingItem.value?.id) {
        await store.updateDepartment(editingItem.value.id, payload);
        successMessage = 'Departamento atualizado com sucesso!';
      } else {
        await store.createDepartment(payload);
        successMessage = 'Departamento criado com sucesso!';
      }
    } else if (activeTab.value === 'categories') {
      if (!form.value.departmentId) { toast.error('Selecione um departamento para a categoria.'); return; }
      if (!form.value.name.trim() || !form.value.code.trim()) {
        toast.error('Nome e código da categoria são obrigatórios.'); return;
      }
      const payload = {
        name: form.value.name.trim(),
        code: form.value.code.trim().toUpperCase(),
        description: form.value.description?.trim() || null,
        departmentId: Number(form.value.departmentId),
      };
      if (editingItem.value?.id) {
        await store.updateDepartmentCategory(editingItem.value.id, payload);
        successMessage = 'Categoria atualizada com sucesso!';
      } else {
        await store.createDepartmentCategory(payload);
        successMessage = 'Categoria criada com sucesso!';
      }
    } else {
      if (!form.value.name.trim()) { toast.error('Nome da cidade é obrigatório.'); return; }
      const payload = {
        name: form.value.name.trim(),
        uf: form.value.uf ? form.value.uf.trim().toUpperCase() : null,
      };
      if (editingItem.value?.id) {
        await store.updateUserCity(editingItem.value.id, payload);
        successMessage = 'Cidade atualizada com sucesso!';
      } else {
        await store.createUserCity(payload);
        successMessage = 'Cidade criada com sucesso!';
      }
    }
    toast.success(successMessage);
    closeModal();
  } catch (e) {
    toast.error(e.message || 'Erro ao salvar dados.');
  }
}

async function deactivateItem(item) {
  const label = `${labelSingular.value.toLowerCase()} "${item.name}"`;
  if (!confirm(`Desativar ${label}?`)) return;
  try {
    const map = {
      positions:   store.deactivatePosition,
      departments: store.deactivateDepartment,
      categories:  store.deactivateDepartmentCategory,
      cities:      store.deactivateUserCity,
    };
    await map[activeTab.value](item.id);
  } catch (e) {
    toast.error(e.message || 'Erro ao desativar.');
  }
}

onMounted(async () => {
  if (!authStore.hasRole('admin')) {
    router.push('/');
    return;
  }
  await Promise.all([
    store.fetchDepartments(),
    store.fetchPositions(),
    store.fetchUserCities(),
    store.fetchDepartmentCategories(),
  ]);
});
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="xl">

      <!-- Header -->
      <PageHeader
        title="Cargos, departamentos e categorias"
        subtitle="Configure departamentos, categorias, cargos e cidades disponíveis para os usuários."
        icon="fas fa-sliders">
        <template #title>
          <span>Cargos, departamentos & categorias</span>
          <Favorite :router="'/settings/management'" :section="'Departamentos'" />
        </template>
        <template #actions>
          <Button icon="fas fa-plus" @click="openModal(null)">
            <span class="hidden sm:inline">Novo {{ labelSingular.toLowerCase() }}</span>
          </Button>
        </template>
      </PageHeader>

      <!-- Tabs -->
      <SegmentedControl v-model="activeTab" :options="tabs" size="md" class="mb-5" />

      <!-- Erro -->
      <div v-if="store.error"
        class="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
        <i class="fas fa-circle-exclamation"></i>{{ store.error }}
      </div>

      <!-- Empty -->
      <EmptyState v-if="!items.length"
        :icon="tabs.find(t => t.value === activeTab)?.icon || 'far fa-folder'"
        :title="`Nenhum ${labelSingular.toLowerCase()} cadastrado`"
        :description="`Crie o primeiro ${labelSingular.toLowerCase()} para começar.`">
        <template #actions>
          <Button icon="fas fa-plus" @click="openModal(null)">
            Novo {{ labelSingular.toLowerCase() }}
          </Button>
        </template>
      </EmptyState>

      <!-- Lista -->
      <div v-else class="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">

        <!-- DEPARTAMENTOS -->
        <template v-if="activeTab === 'departments'">
          <Surface v-for="d in items" :key="d.id" variant="raised" padding="none" class="overflow-hidden">
            <div class="flex items-start justify-between gap-3 p-4 border-b border-line">
              <div class="min-w-0 flex-1">
                <h3 class="text-sm font-semibold text-ink truncate">{{ d.name }}</h3>
                <Badge variant="neutral" size="sm" class="mt-1.5">
                  <i class="fas fa-hashtag text-[9px]"></i>{{ d.code }}
                </Badge>
              </div>
              <Badge :variant="d.active ? 'success' : 'danger'" size="sm">
                {{ d.active ? 'Ativo' : 'Inativo' }}
              </Badge>
            </div>
            <div class="p-4 space-y-2 text-sm">
              <p class="text-ink-muted leading-relaxed">{{ d.description || '—' }}</p>
              <div class="flex items-center gap-1 pt-2 border-t border-line/50">
                <Button size="sm" variant="ghost" icon="fas fa-pen" @click="openModal(d)">Editar</Button>
                <Button v-if="d.active" size="sm" variant="ghost" icon="fas fa-ban"
                  class="text-red-500" @click="deactivateItem(d)">Desativar</Button>
              </div>
            </div>
          </Surface>
        </template>

        <!-- CATEGORIAS -->
        <template v-else-if="activeTab === 'categories'">
          <Surface v-for="c in items" :key="c.id" variant="raised" padding="none" class="overflow-hidden">
            <div class="flex items-start justify-between gap-3 p-4 border-b border-line">
              <div class="min-w-0 flex-1">
                <h3 class="text-sm font-semibold text-ink truncate">{{ c.name }}</h3>
                <div class="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge size="sm">
                    <i class="fas fa-hashtag text-[9px]"></i>{{ c.code }}
                  </Badge>
                  <Badge v-if="c.department || c.department_id" variant="accent" size="sm">
                    <i class="fas fa-sitemap text-[9px]"></i>
                    {{ c.department?.name || departmentNameById(c.department_id) || 'Sem departamento' }}
                  </Badge>
                </div>
              </div>
              <Badge :variant="c.active ? 'success' : 'danger'" size="sm">
                {{ c.active ? 'Ativo' : 'Inativo' }}
              </Badge>
            </div>
            <div class="p-4 space-y-2 text-sm">
              <p class="text-ink-muted leading-relaxed">{{ c.description || '—' }}</p>
              <div class="flex items-center gap-1 pt-2 border-t border-line/50">
                <Button size="sm" variant="ghost" icon="fas fa-pen" @click="openModal(c)">Editar</Button>
                <Button v-if="c.active" size="sm" variant="ghost" icon="fas fa-ban"
                  class="text-red-500" @click="deactivateItem(c)">Desativar</Button>
              </div>
            </div>
          </Surface>
        </template>

        <!-- CARGOS -->
        <template v-else-if="activeTab === 'positions'">
          <Surface v-for="p in items" :key="p.id" variant="raised" padding="none" class="overflow-hidden">
            <div class="flex items-start justify-between gap-3 p-4 border-b border-line">
              <div class="min-w-0 flex-1">
                <h3 class="text-sm font-semibold text-ink truncate">{{ p.name }}</h3>
                <div class="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge size="sm">
                    <i class="fas fa-hashtag text-[9px]"></i>{{ p.code }}
                  </Badge>
                  <Badge v-if="p.department || p.department_id" variant="accent" size="sm">
                    <i class="fas fa-sitemap text-[9px]"></i>
                    {{ p.department?.name || departmentNameById(p.department_id) || 'Sem departamento' }}
                  </Badge>
                  <Badge v-if="p.is_internal" variant="info" size="sm">
                    <i class="fas fa-building text-[9px]"></i>Interno
                  </Badge>
                  <Badge v-if="p.is_partner" variant="success" size="sm">
                    <i class="fas fa-handshake text-[9px]"></i>Parceiro
                  </Badge>
                </div>
              </div>
              <Badge :variant="p.active ? 'success' : 'danger'" size="sm">
                {{ p.active ? 'Ativo' : 'Inativo' }}
              </Badge>
            </div>
            <div class="p-4 space-y-2 text-sm">
              <p class="text-ink-muted leading-relaxed">{{ p.description || '—' }}</p>
              <div class="flex items-center gap-1 pt-2 border-t border-line/50">
                <Button size="sm" variant="ghost" icon="fas fa-pen" @click="openModal(p)">Editar</Button>
                <Button v-if="p.active" size="sm" variant="ghost" icon="fas fa-ban"
                  class="text-red-500" @click="deactivateItem(p)">Desativar</Button>
              </div>
            </div>
          </Surface>
        </template>

        <!-- CIDADES -->
        <template v-else>
          <Surface v-for="c in items" :key="c.id" variant="raised" padding="none" class="overflow-hidden">
            <div class="flex items-start justify-between gap-3 p-4 border-b border-line">
              <div class="min-w-0 flex-1">
                <h3 class="text-sm font-semibold text-ink truncate">{{ c.name }}</h3>
                <Badge size="sm" class="mt-1.5">
                  <i class="fas fa-location-dot text-[9px]"></i>{{ c.uf || 'UF não informada' }}
                </Badge>
              </div>
              <Badge :variant="c.active ? 'success' : 'danger'" size="sm">
                {{ c.active ? 'Ativo' : 'Inativo' }}
              </Badge>
            </div>
            <div class="p-4 space-y-2 text-sm">
              <p class="text-[11px] text-ink-subtle font-mono">ID interno: {{ c.id }}</p>
              <div class="flex items-center gap-1 pt-2 border-t border-line/50">
                <Button size="sm" variant="ghost" icon="fas fa-pen" @click="openModal(c)">Editar</Button>
                <Button v-if="c.active" size="sm" variant="ghost" icon="fas fa-ban"
                  class="text-red-500" @click="deactivateItem(c)">Desativar</Button>
              </div>
            </div>
          </Surface>
        </template>
      </div>
    </PageContainer>

    <!-- Modal -->
    <Modal :open="showModal" size="md" @close="closeModal">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
            <i :class="tabs.find(t => t.value === activeTab)?.icon" class="text-sm"></i>
          </div>
          <div>
            <h2 class="text-base font-semibold text-ink">{{ modalTitle }}</h2>
            <p class="text-xs text-ink-muted mt-0.5">
              {{ activeTab === 'positions' ? 'Defina departamento, nome, código e tipo do cargo.'
              : activeTab === 'departments' ? 'Defina nome, código e descrição do departamento.'
              : activeTab === 'categories' ? 'Defina nome, código e descrição da categoria.'
              : 'Defina nome e UF da cidade.' }}
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Cargos -->
        <template v-if="activeTab === 'positions'">
          <Select v-model="form.departmentId" :options="departmentOptions" label="Departamento" required />
          <Input v-model="form.name" label="Nome do cargo" placeholder="Ex: Gestor Comercial" required />
          <Input v-model="form.code" label="Código (único)" placeholder="Ex: GESTOR_COMERCIAL"
            class="uppercase" required />
          <div>
            <label class="block text-xs font-medium text-ink-muted mb-1.5">Descrição</label>
            <textarea v-model="form.description" rows="3"
              placeholder="Resumo da função deste cargo (opcional)."
              class="w-full px-3.5 py-2 text-sm bg-surface-raised text-ink border border-line rounded-lg
                     placeholder:text-ink-subtle outline-none resize-none transition-all shadow-inner-soft
                     focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20" />
          </div>
          <div class="flex flex-wrap items-center gap-4">
            <Switch v-model="form.is_internal" size="sm" label="Interno" />
            <Switch v-model="form.is_partner" size="sm" label="Parceiro (Imobiliária / Corretor)" />
          </div>
        </template>

        <!-- Departamentos -->
        <template v-else-if="activeTab === 'departments'">
          <Input v-model="form.name" label="Nome do departamento" placeholder="Ex: Marketing" required />
          <Input v-model="form.code" label="Código (único)" placeholder="Ex: MARKETING"
            class="uppercase" required />
          <div>
            <label class="block text-xs font-medium text-ink-muted mb-1.5">Descrição</label>
            <textarea v-model="form.description" rows="3"
              placeholder="Ex: Atividades ligadas à divulgação, branding etc."
              class="w-full px-3.5 py-2 text-sm bg-surface-raised text-ink border border-line rounded-lg
                     placeholder:text-ink-subtle outline-none resize-none transition-all shadow-inner-soft
                     focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20" />
          </div>
        </template>

        <!-- Categorias -->
        <template v-else-if="activeTab === 'categories'">
          <Select v-model="form.departmentId" :options="departmentOptions" label="Departamento" required />
          <Input v-model="form.name" label="Nome da categoria" placeholder="Ex: Mídia, Eventos, Taxas..." required />
          <Input v-model="form.code" label="Código (único)" placeholder="Ex: MIDIA, EVENTOS"
            class="uppercase" required />
          <div>
            <label class="block text-xs font-medium text-ink-muted mb-1.5">Descrição</label>
            <textarea v-model="form.description" rows="3"
              placeholder="Ex: Agrupamento de despesas de mídia, anúncios, etc."
              class="w-full px-3.5 py-2 text-sm bg-surface-raised text-ink border border-line rounded-lg
                     placeholder:text-ink-subtle outline-none resize-none transition-all shadow-inner-soft
                     focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20" />
          </div>
        </template>

        <!-- Cidades -->
        <template v-else>
          <Input v-model="form.name" label="Nome da cidade" placeholder="Ex: Marília" required />
          <Input v-model="form.uf" label="UF" placeholder="SP" maxlength="2" class="w-24 uppercase" />
        </template>
      </div>

      <template #footer>
        <Button variant="ghost" @click="closeModal">Cancelar</Button>
        <Button icon="fas fa-floppy-disk" @click="saveItem">Salvar</Button>
      </template>
    </Modal>
  </div>
</template>
