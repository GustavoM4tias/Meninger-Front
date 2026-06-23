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

    <template #footer>
      <Button variant="ghost" @click="$emit('close')">Fechar</Button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useExpensesAdminStore } from '@/stores/Financeiro/Expenses/expensesAdminStore';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
  open: { type: Boolean, required: true },
  // mantido por compatibilidade com a página Custos (não usado aqui)
  costCenterGroups: { type: Array, default: () => [] },
});
const emit = defineEmits(['close', 'changed']);

const adminStore = useExpensesAdminStore();
const toast = (() => {
  try { return useToast(); }
  catch { return { success: () => { }, error: console.error }; }
})();

// Nomes de empreendimento agora vêm da PROJEÇÃO (fonte única). Aqui só Departamentos.
const tabs = [
  { key: 'departments', label: 'Departamentos', icon: 'fas fa-sitemap' },
];
const activeTab = ref('departments');

watch(() => props.open, async (open) => {
  if (open) await adminStore.fetchDepartments();
});

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
</script>
