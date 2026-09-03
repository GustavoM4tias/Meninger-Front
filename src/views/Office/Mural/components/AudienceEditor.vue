<script setup>
// Editor de PÚBLICO-ALVO (assignments) de um comunicado. Trabalha sobre um array
// de { scopeType, scopeValue } via v-model. Escopos: DEPARTMENT | POSITION | CITY |
// USER | ROLE — espelha exatamente o que o backend resolve em destinatários.

import { ref, computed, watch, onMounted } from 'vue';
import { useMuralMetaStore } from '@/stores/Mural/muralMetaStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import Select from '@/components/UI/Select.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
    modelValue: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue']);

const meta = useMuralMetaStore();
const authStore = useAuthStore();

const newType = ref('DEPARTMENT');
const newValue = ref('');
// Recorte da lista de CARGOS por departamento (padrão da casa: cargo é sempre
// de um departamento). Só aparece quando o escopo escolhido é Cargo.
const posDepartment = ref('');

const SCOPE_TYPES = [
    { value: 'DEPARTMENT', label: 'Departamento' },
    { value: 'POSITION', label: 'Cargo' },
    { value: 'CITY', label: 'Cidade' },
    { value: 'USER', label: 'Pessoa' },
    { value: 'ROLE', label: 'Papel' },
];

const ROLE_OPTIONS = [
    { value: 'admin', label: 'Administradores' },
    { value: 'user', label: 'Usuários (não-admin)' },
];

onMounted(() => {
    meta.ensureLoaded();
    if (!authStore.users.length) authStore.getAllUsers();
});

const departmentFilterOptions = computed(() => [
    { value: '', label: 'Todos os departamentos' },
    ...meta.departments.map((d) => ({ value: String(d.id), label: d.name })),
]);

const valueOptions = computed(() => {
    switch (newType.value) {
        case 'DEPARTMENT': return meta.departments.map((d) => ({ value: String(d.id), label: d.name }));
        case 'POSITION': {
            const dep = posDepartment.value;
            const lista = dep
                ? meta.positions.filter((p) => String(p.department_id ?? '') === dep)
                : meta.positions;
            const nomeDepto = (id) => meta.departments.find((d) => String(d.id) === String(id))?.name;
            return lista.map((p) => ({
                value: String(p.code),
                // Sem departamento escolhido, o nome sozinho não diz de que área é.
                label: !dep && nomeDepto(p.department_id) ? `${p.name} · ${nomeDepto(p.department_id)}` : p.name,
            }));
        }
        case 'CITY':       return meta.cities.map((c) => ({ value: String(c.id), label: c.name }));
        case 'USER':       return authStore.activeUsers.map((u) => ({ value: String(u.id), label: u.username }));
        case 'ROLE':       return ROLE_OPTIONS;
        default:           return [];
    }
});

function onTypeChange() {
    newValue.value = '';
    posDepartment.value = '';
}

// Trocar o departamento invalida o cargo escolhido que não é mais dele.
watch(posDepartment, () => {
    if (newType.value !== 'POSITION') return;
    if (!valueOptions.value.some((o) => o.value === newValue.value)) newValue.value = '';
});

function labelFor(a) {
    const v = String(a.scopeValue);
    if (a.scopeType === 'DEPARTMENT') return `Depto: ${meta.departments.find((d) => String(d.id) === v)?.name || v}`;
    if (a.scopeType === 'POSITION')   return `Cargo: ${meta.positions.find((p) => String(p.code) === v)?.name || v}`;
    if (a.scopeType === 'CITY')       return `Cidade: ${meta.cities.find((c) => String(c.id) === v)?.name || v}`;
    if (a.scopeType === 'USER')       return `Pessoa: ${authStore.activeUsers.find((u) => String(u.id) === v)?.username || `#${v}`}`;
    if (a.scopeType === 'ROLE')       return `Papel: ${v === 'admin' ? 'Administradores' : 'Usuários'}`;
    return `${a.scopeType}: ${v}`;
}

function add() {
    if (!newValue.value) return;
    const item = { scopeType: newType.value, scopeValue: String(newValue.value) };
    const exists = props.modelValue.some((a) => a.scopeType === item.scopeType && String(a.scopeValue) === item.scopeValue);
    if (exists) { newValue.value = ''; return; }
    emit('update:modelValue', [...props.modelValue, item]);
    newValue.value = '';
}

function remove(i) {
    const next = props.modelValue.slice();
    next.splice(i, 1);
    emit('update:modelValue', next);
}
</script>

<template>
  <div class="space-y-3">
    <!-- Público-alvo atual -->
    <div v-if="modelValue.length" class="flex flex-wrap gap-2">
      <span
        v-for="(a, i) in modelValue"
        :key="`${a.scopeType}-${a.scopeValue}`"
        class="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-sunken px-2 py-1 text-xs text-ink">
        {{ labelFor(a) }}
        <button type="button" class="text-ink-subtle hover:text-data-neg" @click="remove(i)" aria-label="Remover">
          <i class="fas fa-xmark"></i>
        </button>
      </span>
    </div>
    <p v-else class="text-xs text-ink-subtle">
      Nenhum público-alvo definido. Adicione ao menos um para poder publicar.
    </p>

    <!-- Adicionar escopo -->
    <div class="flex flex-wrap items-end gap-2">
      <div class="w-40">
        <Select v-model="newType" :options="SCOPE_TYPES" size="sm" @change="onTypeChange" />
      </div>
      <div v-if="newType === 'POSITION'" class="w-full sm:w-48">
        <Select v-model="posDepartment" :options="departmentFilterOptions" size="sm" />
      </div>
      <div class="flex-1 min-w-[12rem]">
        <Select
          v-model="newValue"
          :options="valueOptions"
          size="sm"
          :placeholder="meta.loading ? 'Carregando…' : 'Selecione…'" />
      </div>
      <Button variant="secondary" size="sm" icon="fas fa-plus" :disabled="!newValue" @click="add">
        Adicionar
      </Button>
    </div>

    <p v-if="meta.error" class="text-xs text-data-neg">{{ meta.error }}</p>
  </div>
</template>
