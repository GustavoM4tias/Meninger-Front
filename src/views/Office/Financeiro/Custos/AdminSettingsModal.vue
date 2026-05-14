<template>
  <Modal :open="open" size="lg" title="Configurações de Custos" subtitle="Apenas administradores"
    @close="$emit('close')">

    <!-- Tabs -->
    <div class="border-b border-line mb-4">
      <div class="flex gap-1">
        <button v-for="t in tabs" :key="t.key" @click="activeTab = t.key"
          class="px-4 py-2 text-sm font-medium transition-colors relative"
          :class="activeTab === t.key
            ? 'text-accent'
            : 'text-ink-muted hover:text-ink'">
          <i :class="t.icon" class="mr-1.5 text-xs"></i>
          {{ t.label }}
          <span v-if="activeTab === t.key"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full"></span>
        </button>
      </div>
    </div>

    <!-- TAB: Departamentos -->
    <div v-if="activeTab === 'departments'" class="space-y-3">
      <p class="text-xs text-ink-muted">
        Marque os departamentos que <strong>não</strong> devem aparecer no filtro da tela Custos.
        Departamentos ocultos somem da lista de seleção, mas os lançamentos continuam no banco.
      </p>

      <div v-if="adminStore.loadingDepartments" class="text-center py-8 text-ink-muted">
        <i class="fas fa-spinner fa-spin mr-2"></i> Carregando...
      </div>

      <div v-else-if="!adminStore.departments.length" class="text-center py-8 text-ink-subtle text-sm">
        Nenhum departamento encontrado.
      </div>

      <div v-else class="space-y-1 max-h-[60vh] overflow-y-auto pr-1 border border-line rounded">
        <label v-for="d in adminStore.departments" :key="d.name"
          class="flex items-center gap-3 px-3 py-2 hover:bg-surface-hover cursor-pointer">
          <input type="checkbox"
            :checked="!d.hidden"
            @change="toggleDepartment(d, $event.target.checked)"
            class="w-4 h-4 text-emerald-600 border-line rounded focus:ring-emerald-500" />
          <span class="text-sm flex-1" :class="d.hidden ? 'text-ink-subtle line-through' : 'text-ink'">
            {{ d.name }}
          </span>
          <Badge :variant="d.hidden ? 'neutral' : 'success'" size="sm">
            {{ d.hidden ? 'Oculto' : 'Visível' }}
          </Badge>
        </label>
      </div>
    </div>

    <!-- TAB: Empreendimentos -->
    <div v-if="activeTab === 'overrides'" class="space-y-3">
      <p class="text-xs text-ink-muted">
        Sobreponha o nome exibido de um empreendimento (CC). A identidade continua sendo o CC —
        apenas o nome de exibição é alterado. Edite direto na linha e clique em <i class="fas fa-check text-emerald-500"></i> para salvar.
      </p>

      <!-- Busca -->
      <Input v-model="overrideSearch"
        placeholder="Buscar por CC ou nome..."
        icon-left="fas fa-magnifying-glass" />

      <!-- Lista de CCs em uso, com edição inline -->
      <div v-if="!availableCcs.length" class="text-center py-8 text-ink-subtle text-sm">
        Nenhum centro de custo encontrado. Verifique se a tela Custos tem dados.
      </div>

      <div v-else class="border border-line rounded max-h-[60vh] overflow-y-auto">
        <table class="w-full text-sm">
          <thead class="bg-surface-sunken/60 border-b border-line sticky top-0 z-10">
            <tr>
              <th class="px-3 py-2 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle w-20">CC</th>
              <th class="px-3 py-2 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Nome de exibição</th>
              <th class="px-3 py-2 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle w-32">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line/60">
            <tr v-for="cc in filteredCcs" :key="cc.id"
              class="hover:bg-surface-hover/40"
              :class="{ 'bg-amber-50/30 dark:bg-amber-500/5': cc.hasOverride }">
              <td class="px-3 py-2 font-mono tabular-nums align-middle">
                <span class="flex items-center gap-1.5">
                  {{ cc.id }}
                  <i v-if="cc.hasOverride" class="fas fa-star text-amber-500 text-[10px]"
                    title="Tem override ativo"></i>
                </span>
              </td>
              <td class="px-2 py-1.5 align-middle">
                <Input v-model="editing[cc.id]"
                  :placeholder="cc.currentDisplayed || 'Sem nome'"
                  size="sm" />
              </td>
              <td class="px-3 py-2 text-right align-middle whitespace-nowrap">
                <IconButton v-if="canSave(cc)"
                  icon="fas fa-check"
                  size="sm" variant="primary"
                  label="Salvar"
                  :loading="rowSaving === cc.id"
                  @click="saveRow(cc)" />
                <IconButton v-if="cc.hasOverride"
                  icon="fas fa-rotate-left"
                  size="sm" variant="ghost"
                  label="Restaurar padrão"
                  @click="resetRow(cc)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="text-xs text-ink-subtle flex items-center gap-4">
        <span><i class="fas fa-star text-amber-500"></i> = com override</span>
        <span>{{ ccsWithOverride }} de {{ availableCcs.length }} com override</span>
      </div>
    </div>

    <template #footer>
      <Button variant="ghost" @click="$emit('close')">Fechar</Button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useExpensesAdminStore } from '@/stores/Financeiro/Expenses/expensesAdminStore';

import Modal from '@/components/UI/Modal.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';

const props = defineProps({
  open: { type: Boolean, required: true },
  // CCs disponíveis vindos da página Custos: [{ costCenterId, costCenterName }]
  costCenterGroups: { type: Array, default: () => [] },
});
const emit = defineEmits(['close', 'changed']);

const adminStore = useExpensesAdminStore();
const toast = (() => {
  try { return useToast(); }
  catch { return { success: () => { }, error: console.error }; }
})();

const tabs = [
  { key: 'departments', label: 'Departamentos', icon: 'fas fa-sitemap' },
  { key: 'overrides', label: 'Nomes de Empreendimento', icon: 'fas fa-pen-to-square' },
];
const activeTab = ref('departments');

const overrideSearch = ref('');
const editing = ref({});      // { [ccId]: newName }
const rowSaving = ref(null);  // id do CC sendo salvo

watch(() => props.open, async (open) => {
  if (open) {
    await Promise.all([
      adminStore.fetchDepartments(),
      adminStore.fetchOverrides(),
    ]);
    seedEditing();
  }
});

// Pré-preenche o input de cada CC com o valor atualmente exibido (override ou padrão)
function seedEditing() {
  const next = {};
  const overrideByCc = new Map(adminStore.overrides.map(o => [Number(o.cost_center_id), o.display_name]));
  for (const g of props.costCenterGroups || []) {
    const id = Number(g.costCenterId);
    if (!Number.isFinite(id)) continue;
    next[id] = overrideByCc.has(id) ? overrideByCc.get(id) : (g.costCenterName || '');
  }
  editing.value = next;
}

// Lista combinada: CCs em uso + flag "hasOverride" + nome padrão (sem override)
const availableCcs = computed(() => {
  const overrideByCc = new Map(adminStore.overrides.map(o => [Number(o.cost_center_id), o.display_name]));
  return (props.costCenterGroups || [])
    .map(g => {
      const id = Number(g.costCenterId);
      const hasOverride = overrideByCc.has(id);
      // costCenterName vem com override já aplicado pelo backend;
      // pra mostrar o "Original" precisamos derivar — se tem override, original é desconhecido client-side.
      // Mantemos o nome bruto do backend para fins de exibição.
      const overrideName = overrideByCc.get(id) || null;
      const currentDisplayed = g.costCenterName || '';
      const defaultName = hasOverride
        ? null // não temos o "nome padrão" original aqui (backend aplicou override antes)
        : currentDisplayed;
      return { id, currentDisplayed, hasOverride, overrideName, defaultName };
    })
    .sort((a, b) => a.id - b.id);
});

const filteredCcs = computed(() => {
  const q = overrideSearch.value.trim().toLowerCase();
  if (!q) return availableCcs.value;
  return availableCcs.value.filter(cc =>
    String(cc.id).includes(q)
    || (cc.currentDisplayed || '').toLowerCase().includes(q)
  );
});

const ccsWithOverride = computed(() => availableCcs.value.filter(cc => cc.hasOverride).length);

function canSave(cc) {
  const current = (editing.value[cc.id] || '').trim();
  const original = cc.hasOverride ? (cc.overrideName || '') : (cc.currentDisplayed || '');
  return current && current !== original;
}

async function toggleDepartment(d, checked) {
  const hidden = !checked;
  const prev = d.hidden;
  d.hidden = hidden;
  try {
    await adminStore.setDepartmentVisibility(d.name, hidden);
    toast.success(hidden ? `"${d.name}" oculto no filtro.` : `"${d.name}" visível no filtro.`);
    emit('changed');
  } catch (err) {
    d.hidden = prev;
    toast.error(err.message || 'Falha ao atualizar visibilidade.');
  }
}

async function saveRow(cc) {
  const name = (editing.value[cc.id] || '').trim();
  if (!name) return;
  rowSaving.value = cc.id;
  try {
    await adminStore.setOverride(cc.id, name);
    toast.success(`Nome do CC ${cc.id} atualizado.`);
    emit('changed');
    seedEditing();
  } catch (err) {
    toast.error(err.message || 'Falha ao salvar.');
  } finally {
    rowSaving.value = null;
  }
}

async function resetRow(cc) {
  if (!confirm(`Remover override do CC ${cc.id}? O nome volta ao padrão (CRM/Sienge).`)) return;
  try {
    await adminStore.deleteOverride(cc.id);
    toast.success(`Override do CC ${cc.id} removido.`);
    emit('changed');
    seedEditing();
  } catch (err) {
    toast.error(err.message || 'Falha ao remover override.');
  }
}
</script>
