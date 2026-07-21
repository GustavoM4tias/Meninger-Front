<template>
    <Modal :open="open" size="lg" :title="companyName"
        :subtitle="companyId != null ? `Empresa ${companyId} · configuração e liberação` : 'Sem empresa Sienge vinculada'"
        @close="$emit('close')">
        <div class="space-y-6">
            <p v-if="companyId == null"
                class="text-sm text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
                <i class="fas fa-triangle-exclamation mr-1"></i>
                Esta linha não tem empresa Sienge vinculada (sem <code>idCompany</code>), então não dá para salvar
                configuração nem liberar para a diretoria.
            </p>

            <!-- Liberação (rascunho → liberado) -->
            <div class="rounded-xl border p-4"
                :class="[companyId == null ? 'opacity-50 pointer-events-none' : '', isReleased ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5']">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <h4 class="text-sm font-semibold text-ink flex items-center gap-2 mb-1">
                            <i class="fas" :class="isReleased ? 'fa-circle-check text-emerald-500' : 'fa-pen-ruler text-amber-500'"></i>
                            {{ isReleased ? 'Liberado para a diretoria' : 'Rascunho (só admin vê)' }}
                        </h4>
                        <p class="text-xs text-ink-muted">
                            Ajuste os números até ficarem 100%. Ao liberar, este empreendimento passa a aparecer para a
                            diretoria. Você pode voltar para rascunho a qualquer momento.
                        </p>
                    </div>
                    <button type="button" role="switch" :aria-checked="isReleased" @click.prevent="isReleased = !isReleased"
                        class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
                        :class="isReleased ? 'bg-emerald-500' : 'bg-surface-sunken border border-line'">
                        <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                            :class="isReleased ? 'translate-x-5' : 'translate-x-0.5'"></span>
                    </button>
                </div>
                <textarea v-model="releaseNotes" rows="2" placeholder="Observação da liberação (opcional)"
                    class="mt-3 w-full px-3 py-2 text-sm border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent-ring/30"></textarea>
                <p v-if="releasedInfo" class="mt-1.5 text-[11px] text-ink-subtle">
                    <i class="fas fa-clock-rotate-left mr-1"></i>{{ releasedInfo }}
                </p>
            </div>

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
                    <option value="pre_lancamento">Pré-lançamento</option>
                    <option value="previsao_futura">Previsão Futura</option>
                    <option value="concluido">Concluído</option>
                </select>
            </div>

            <!-- Exceções de departamento -->
            <div :class="companyId == null ? 'opacity-50 pointer-events-none' : ''">
                <h4 class="text-sm font-semibold text-ink flex items-center gap-2 mb-1">
                    <i class="fas fa-bullhorn text-accent"></i>
                    Exceções de departamento
                </h4>
                <p class="text-xs text-ink-muted mb-3">
                    Por padrão segue a regra global. Aqui você força um departamento a ser acompanhado (ou não)
                    <strong>apenas nesta empresa</strong>.
                </p>

                <EmptyState v-if="!known.length" size="sm" icon="fas fa-inbox" title="Sem departamentos"
                    description="Nenhum departamento encontrado nas despesas." />

                <div v-else class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    <div v-for="d in known" :key="d"
                        class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-line">
                        <span class="text-sm text-ink">
                            {{ d }}
                            <span class="text-[10px] text-ink-subtle">(global: {{ adminStore.isMarketing(d) ? 'acompanhado' : 'não' }})</span>
                        </span>
                        <select v-model="overrideState[d]"
                            class="h-8 px-2 text-xs border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent-ring/30">
                            <option value="default">Padrão</option>
                            <option value="marketing">Acompanhar</option>
                            <option value="not">Não acompanhar</option>
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
import dayjs from 'dayjs';
import { useDeptSpendingAdminStore } from '@/stores/Financeiro/DeptSpending/deptSpendingAdminStore';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    company: { type: Object, default: null },
});
const emit = defineEmits(['close', 'saved']);

const adminStore = useDeptSpendingAdminStore();

const overrideState = ref({});
const statusOverride = ref(''); // '' = automático
const isReleased = ref(false);
const releaseNotes = ref('');
const releasedInfo = ref('');
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
    isReleased.value = !!cur?.is_released;
    releaseNotes.value = cur?.release_notes || '';
    releasedInfo.value = cur?.released_at
        ? `Liberado por ${cur.released_by || '—'} em ${dayjs(cur.released_at).format('DD/MM/YYYY HH:mm')}`
        : '';

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
        // liberação é um endpoint separado (trilha released_by/at)
        await adminStore.setEnterpriseRelease(companyId.value, isReleased.value, releaseNotes.value || null);
        emit('saved');
        emit('close');
    } catch (e) {
        err.value = e?.message || 'Erro ao salvar.';
    } finally {
        saving.value = false;
    }
}
</script>
