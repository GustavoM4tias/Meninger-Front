<template>
    <div class="space-y-4">
        <Surface variant="raised" padding="md" class="bg-accent-soft/30 border-accent/20">
            <p class="text-sm text-ink-muted">
                Controle quais <strong>departamentos</strong> cada nível enxerga na tela de Custos. A regra é em
                <strong>cascata</strong>: vale o <strong>mais específico</strong> &mdash; usuário &gt; cargo &gt; global.
                Admin sempre vê tudo.
            </p>
        </Surface>

        <!-- Escopo -->
        <div class="flex flex-wrap items-end gap-3">
            <div>
                <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Nível</label>
                <div class="flex items-center bg-surface-sunken rounded-lg p-1 text-sm">
                    <button v-for="s in scopes" :key="s.value" type="button" @click="selectScope(s.value)"
                        class="px-3 py-1.5 rounded-md font-medium transition-colors"
                        :class="scope === s.value ? 'bg-surface-raised text-accent shadow-soft' : 'text-ink-muted hover:text-ink'">
                        {{ s.label }}
                    </button>
                </div>
            </div>

            <div v-if="scope === 'department'" class="min-w-[240px]">
                <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Departamento</label>
                <Select v-model="scopeKey" :options="orgDepartmentOptions" placeholder="Selecione o departamento"
                    @update:modelValue="loadRules" />
            </div>
            <div v-if="scope === 'position'" class="min-w-[240px]">
                <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Cargo</label>
                <Select v-model="scopeKey" :options="positionOptions" placeholder="Selecione o cargo"
                    @update:modelValue="loadRules" />
            </div>
            <div v-if="scope === 'user'" class="min-w-[240px]">
                <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Usuário</label>
                <Select v-model="scopeKey" :options="userOptions" placeholder="Selecione o usuário"
                    @update:modelValue="loadRules" />
            </div>
        </div>

        <p v-if="err" class="text-sm text-red-600 dark:text-red-400">
            <i class="fas fa-circle-exclamation mr-1"></i>{{ err }}
        </p>

        <!-- Departamentos -->
        <div v-if="needsKey && !scopeKey" class="text-center py-10 text-ink-subtle text-sm">
            Selecione {{ scope === 'department' ? 'um departamento' : scope === 'position' ? 'um cargo' : 'um usuário' }} acima para configurar.
        </div>

        <div v-else class="border border-line rounded-lg overflow-hidden">
            <div class="px-3 py-2 bg-surface-sunken/60 border-b border-line flex items-center justify-between">
                <span class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Departamento</span>
                <span class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Visibilidade</span>
            </div>
            <div class="divide-y divide-line max-h-[55vh] overflow-y-auto">
                <div v-for="d in store.departments" :key="d"
                    class="flex items-center justify-between gap-3 px-3 py-2 hover:bg-surface-hover/40">
                    <span class="text-sm text-ink">{{ d }}</span>

                    <!-- global: 2 estados -->
                    <select v-if="scope === 'global'" :value="globalState(d)"
                        @change="onGlobalChange(d, $event.target.value)"
                        class="h-8 px-2 text-xs border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent-ring/30">
                        <option value="visible">Visível</option>
                        <option value="hidden">Oculto</option>
                    </select>

                    <!-- cargo/usuário: 3 estados (herda / força) -->
                    <select v-else :value="overrideState(d)" @change="onOverrideChange(d, $event.target.value)"
                        class="h-8 px-2 text-xs border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent-ring/30"
                        :class="overrideState(d) !== 'inherit' ? 'border-accent/40 text-accent' : ''">
                        <option value="inherit">Herda</option>
                        <option value="visible">Força visível</option>
                        <option value="hidden">Força oculto</option>
                    </select>
                </div>
                <div v-if="!store.departments.length" class="px-3 py-10 text-center text-ink-subtle text-sm">
                    Nenhum departamento encontrado nas despesas.
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useDepartmentVisibilityStore } from '@/stores/Settings/Permissions/departmentVisibilityStore';
import Surface from '@/components/UI/Surface.vue';
import Select from '@/components/UI/Select.vue';

const store = useDepartmentVisibilityStore();

const scopes = [
    { value: 'global', label: 'Global' },
    { value: 'department', label: 'Por departamento' },
    { value: 'position', label: 'Por cargo' },
    { value: 'user', label: 'Por usuário' },
];
const scope = ref('global');
const scopeKey = ref('');
const rules = ref({}); // { [department_name]: hidden } do escopo/chave atual
const err = ref(null);

const needsKey = computed(() => ['department', 'position', 'user'].includes(scope.value));
const orgDepartmentOptions = computed(() => (store.orgDepartments || []).map((d) => ({ value: d, label: d })));
const positionOptions = computed(() => (store.positions || []).map((p) => ({ value: p, label: p })));
const userOptions = computed(() =>
    (store.users || []).map((u) => ({ value: String(u.id), label: u.name || `#${u.id}` }))
);

function selectScope(s) {
    scope.value = s;
    scopeKey.value = '';
    rules.value = {};
    if (s === 'global') loadRules();
}

async function loadRules() {
    if (needsKey.value && !scopeKey.value) { rules.value = {}; return; }
    err.value = null;
    try {
        rules.value = await store.getRules(scope.value, scopeKey.value);
    } catch (e) {
        err.value = e?.message || 'Erro ao carregar regras.';
    }
}

function globalState(d) {
    return rules.value[d] ? 'hidden' : 'visible';
}
function overrideState(d) {
    if (!(d in rules.value)) return 'inherit';
    return rules.value[d] ? 'hidden' : 'visible';
}

async function onGlobalChange(d, val) {
    const hidden = val === 'hidden';
    try {
        await store.setRule('global', '', d, hidden);
        rules.value = { ...rules.value, [d]: hidden };
    } catch (e) {
        err.value = e?.message || 'Erro ao salvar.';
    }
}

async function onOverrideChange(d, val) {
    try {
        if (val === 'inherit') {
            await store.clearRule(scope.value, scopeKey.value, d);
            const next = { ...rules.value };
            delete next[d];
            rules.value = next;
        } else {
            const hidden = val === 'hidden';
            await store.setRule(scope.value, scopeKey.value, d, hidden);
            rules.value = { ...rules.value, [d]: hidden };
        }
    } catch (e) {
        err.value = e?.message || 'Erro ao salvar.';
    }
}

onMounted(async () => {
    await store.fetchMeta();
    await loadRules();
});
</script>
