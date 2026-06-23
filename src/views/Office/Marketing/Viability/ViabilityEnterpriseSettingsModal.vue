<template>
    <Modal :open="open" size="lg" :title="companyName"
        :subtitle="companyId != null ? `Empresa ${companyId} · configuração da viabilidade` : 'Sem empresa Sienge vinculada'"
        @close="$emit('close')">
        <div class="space-y-6">
            <p v-if="companyId == null"
                class="text-sm text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
                <i class="fas fa-triangle-exclamation mr-1"></i>
                Esta linha não tem empresa Sienge vinculada (sem <code>idCompany</code>), então não dá para salvar
                configuração por empresa.
            </p>

            <!-- Status / categoria -->
            <div :class="companyId == null ? 'opacity-50 pointer-events-none' : ''">
                <h4 class="text-sm font-semibold text-ink flex items-center gap-2 mb-1">
                    <i class="fas fa-tag text-accent"></i>
                    Status do empreendimento
                </h4>
                <p class="text-xs text-ink-muted mb-2">
                    Por padrão é <strong>automático</strong> (calculado pela projeção e pelo gasto). Force aqui se
                    quiser fixar a categoria deste empreendimento.
                </p>
                <select v-model="statusOverride"
                    class="h-9 px-2 text-sm border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent-ring/30">
                    <option value="">Automático</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="previsao_futura">Previsão Futura</option>
                    <option value="concluido">Concluído</option>
                </select>
            </div>

            <!-- Exceções de departamento -->
            <div :class="companyId == null ? 'opacity-50 pointer-events-none' : ''">
                <h4 class="text-sm font-semibold text-ink flex items-center gap-2 mb-1">
                    <i class="fas fa-bullhorn text-accent"></i>
                    Exceções de departamento (marketing)
                </h4>
                <p class="text-xs text-ink-muted mb-3">
                    Por padrão segue a regra global. Aqui você força um departamento a contar (ou não) como marketing
                    <strong>apenas nesta empresa</strong>.
                </p>

                <EmptyState v-if="!known.length" size="sm" icon="fas fa-inbox" title="Sem departamentos"
                    description="Nenhum departamento encontrado nas despesas." />

                <div v-else class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    <div v-for="d in known" :key="d"
                        class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-line">
                        <span class="text-sm text-ink">
                            {{ d }}
                            <span class="text-[10px] text-ink-subtle">(global: {{ adminStore.isMarketing(d) ? 'marketing' : 'não' }})</span>
                        </span>
                        <select v-model="overrideState[d]"
                            class="h-8 px-2 text-xs border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent-ring/30">
                            <option value="default">Padrão</option>
                            <option value="marketing">Marketing</option>
                            <option value="not">Não marketing</option>
                        </select>
                    </div>
                </div>
            </div>

            <p v-if="err" class="text-sm text-red-600 dark:text-red-400">
                <i class="fas fa-circle-exclamation mr-1"></i>{{ err }}
            </p>
        </div>

        <template #footer>
            <Button variant="secondary" @click="$emit('close')">Cancelar</Button>
            <Button variant="primary" :loading="saving" :disabled="companyId == null" @click="save">Salvar</Button>
        </template>
    </Modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useViabilityAdminStore } from '@/stores/Marketing/Viability/viabilityAdminStore';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    company: { type: Object, default: null },
});
const emit = defineEmits(['close', 'saved']);

const adminStore = useViabilityAdminStore();

const overrideState = ref({});
const statusOverride = ref(''); // '' = automático
const saving = ref(false);
const err = ref(null);

const companyId = computed(() => props.company?.companyId ?? props.company?.header?.companyId ?? null);
const companyName = computed(
    () => props.company?.enterpriseName || props.company?.header?.companyName || 'Empresa'
);
const known = computed(() => adminStore.known || []);

watch(() => props.open, async (v) => {
    if (!v) return;
    err.value = null;
    if (!adminStore.known.length) await adminStore.fetchMarketingDepartments();
    await adminStore.fetchEnterpriseSettings();

    const cur = (adminStore.enterpriseSettings || []).find(
        (e) => String(e.company_id) === String(companyId.value)
    );
    statusOverride.value = cur?.status_override || '';

    const ov = cur?.marketing_dept_overrides || {};
    const state = {};
    for (const d of known.value) {
        if (Object.prototype.hasOwnProperty.call(ov, d)) state[d] = ov[d] ? 'marketing' : 'not';
        else state[d] = 'default';
    }
    overrideState.value = state;
});

async function save() {
    if (companyId.value == null) {
        err.value = 'Empresa sem company_id (sem vínculo Sienge).';
        return;
    }
    saving.value = true;
    err.value = null;
    try {
        const overrides = {};
        for (const [d, st] of Object.entries(overrideState.value)) {
            if (st === 'marketing') overrides[d] = true;
            else if (st === 'not') overrides[d] = false;
        }
        await adminStore.setEnterpriseSettings(companyId.value, {
            marketing_dept_overrides: overrides,
            status_override: statusOverride.value || null,
        });
        emit('saved');
        emit('close');
    } catch (e) {
        err.value = e?.message || 'Erro ao salvar.';
    } finally {
        saving.value = false;
    }
}
</script>
