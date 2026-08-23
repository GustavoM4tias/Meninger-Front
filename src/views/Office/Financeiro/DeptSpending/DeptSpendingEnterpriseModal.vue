<template>
    <Modal :open="open" size="lg" :title="companyName"
        :subtitle="subtitle"
        @close="$emit('close')">
        <div class="space-y-6">
            <p v-if="companyId == null"
                class="text-sm text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
                <i class="fas fa-triangle-exclamation mr-1"></i>
                Esta linha não tem empresa Sienge vinculada (sem <code>idCompany</code>), então não dá para salvar a
                configuração de departamentos da empresa.
            </p>

            <!-- Liberação (rascunho → liberado) -->
            <div class="rounded-xl border p-4"
                :class="[enterpriseKey == null ? 'opacity-50 pointer-events-none' : '', isReleased ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5']">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <h4 class="text-sm font-semibold text-ink flex items-center gap-2 mb-1">
                            <i class="fas" :class="isReleased ? 'fa-circle-check text-emerald-500' : 'fa-pen-ruler text-amber-500'"></i>
                            {{ isReleased ? 'Liberado para a diretoria' : 'Rascunho (só admin vê)' }}
                        </h4>
                        <p class="text-xs text-ink-muted">
                            Ajuste os números até ficarem 100%. Ao liberar, este empreendimento passa a aparecer para a
                            diretoria. Vale só para esta etapa: as outras da mesma empresa seguem como estão. Você pode
                            voltar para rascunho a qualquer momento.
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
                <p v-if="releasedInfo" class="mt-1.5 text-micro text-ink-subtle">
                    <i class="fas fa-clock-rotate-left mr-1"></i>{{ releasedInfo }}
                </p>
            </div>

            <!-- Status / categoria -->
            <div :class="enterpriseKey == null ? 'opacity-50 pointer-events-none' : ''">
                <h4 class="text-sm font-semibold text-ink flex items-center gap-2 mb-1">
                    <i class="fas fa-tag text-accent"></i>
                    Status do empreendimento
                </h4>
                <p class="text-xs text-ink-muted mb-2">
                    Por padrão é <strong>automático</strong> (calculado pela projeção e pelo gasto). Force aqui se
                    quiser fixar a categoria desta etapa.
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
                    <strong>apenas nesta empresa</strong> - vale para todas as etapas dela.
                </p>

                <EmptyState v-if="!known.length" size="sm" icon="fas fa-inbox" title="Sem departamentos"
                    description="Nenhum departamento encontrado nas despesas." />

                <div v-else class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    <div v-for="d in known" :key="d"
                        class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-line">
                        <span class="text-sm text-ink">
                            {{ d }}
                            <span class="text-micro text-ink-subtle">(global: {{ adminStore.isMarketing(d) ? 'acompanhado' : 'não' }})</span>
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

            <!-- Departamentos da LOJA (relatório gerencial) -->
            <div :class="companyId == null ? 'opacity-50 pointer-events-none' : ''">
                <h4 class="text-sm font-semibold text-ink flex items-center gap-2 mb-1">
                    <i class="fas fa-store text-accent"></i>
                    Departamentos da Loja
                </h4>
                <p class="text-xs text-ink-muted mb-3">
                    Para o relatório de investimento: quais departamentos compõem o gasto da <strong>loja física</strong>
                    desta empresa (vale para todas as etapas dela). O teto da loja vem do <strong>Custo Loja</strong>
                    cadastrado na projeção de cada etapa.
                    Um departamento marcado aqui sai do bucket de marketing (não conta duas vezes).
                </p>
                <div v-if="known.length" class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    <label v-for="d in known" :key="`loja-${d}`"
                        class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border transition-colors cursor-pointer"
                        :class="lojaState[d] ? 'border-accent/30 bg-accent-soft/40' : 'border-line hover:bg-surface-hover/40'">
                        <span class="text-sm text-ink flex items-center gap-2">
                            <i class="fas fa-store text-[10px]" :class="lojaState[d] ? 'text-accent' : 'text-ink-subtle'"></i>
                            {{ d }}
                        </span>
                        <input type="checkbox" v-model="lojaState[d]"
                            class="h-4 w-4 rounded border-line text-accent focus:ring-accent-ring/30" />
                    </label>
                </div>
                <EmptyState v-else size="sm" icon="fas fa-inbox" title="Sem departamentos"
                    description="Nenhum departamento encontrado nas despesas." />
            </div>

            <p v-if="err" class="text-sm text-red-600 dark:text-red-400">
                <i class="fas fa-circle-exclamation mr-1"></i>{{ err }}
            </p>
        </div>

        <template #footer>
            <Button variant="secondary" @click="$emit('close')">Cancelar</Button>
            <Button variant="primary" :loading="saving" :disabled="companyId == null && enterpriseKey == null"
                @click="save">Salvar</Button>
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
const lojaState = ref({}); // { deptName: bool } — bucket Loja do relatório
const statusOverride = ref(''); // '' = automático
const isReleased = ref(false);
const releaseNotes = ref('');
const releasedInfo = ref('');
const saving = ref(false);
const err = ref(null);

const companyId = computed(() => props.company?.companyId ?? props.company?.header?.companyId ?? null);
// Chave do EMPREENDIMENTO (etapa da projeção = CC): liberação e status vivem aqui.
const enterpriseKey = computed(
    () => props.company?.enterpriseKey ?? props.company?.header?.enterpriseKey ?? props.company?.erpId ?? null
);
const companyName = computed(
    () => props.company?.enterpriseName || props.company?.header?.companyName || 'Empresa'
);
const subtitle = computed(() => {
    if (companyId.value == null && enterpriseKey.value == null) return 'Sem vínculo Sienge';
    const partes = [];
    if (companyId.value != null) partes.push(`Empresa ${companyId.value}`);
    if (enterpriseKey.value != null) partes.push(`CC ${enterpriseKey.value}`);
    return `${partes.join(' · ')} · configuração e liberação`;
});
const known = computed(() => adminStore.known || []);

watch(() => props.open, async (v) => {
    if (!v) return;
    err.value = null;
    if (!adminStore.known.length) await adminStore.fetchMarketingDepartments();
    await adminStore.fetchEnterpriseSettings();

    const cur = (adminStore.enterpriseSettings || []).find(
        (e) => String(e.company_id) === String(companyId.value)
    );
    // Etapa: sem linha própria, herda o que estiver na empresa (compat).
    const stage = (adminStore.stageSettings || []).find(
        (e) => String(e.enterprise_key) === String(enterpriseKey.value)
    );
    const gov = stage || cur;
    statusOverride.value = gov?.status_override || '';
    isReleased.value = !!gov?.is_released;
    releaseNotes.value = gov?.release_notes || '';
    releasedInfo.value = gov?.released_at
        ? `Liberado por ${gov.released_by || '—'} em ${dayjs(gov.released_at).format('DD/MM/YYYY HH:mm')}`
        : '';

    const ov = cur?.marketing_dept_overrides || {};
    const state = {};
    for (const d of known.value) {
        if (Object.prototype.hasOwnProperty.call(ov, d)) state[d] = ov[d] ? 'marketing' : 'not';
        else state[d] = 'default';
    }
    overrideState.value = state;

    const lojaList = Array.isArray(cur?.loja_departments) ? cur.loja_departments : [];
    const lojaMap = {};
    for (const d of known.value) lojaMap[d] = lojaList.includes(d);
    lojaState.value = lojaMap;
});

async function save() {
    if (companyId.value == null && enterpriseKey.value == null) {
        err.value = 'Linha sem vínculo Sienge (sem empresa e sem centro de custo).';
        return;
    }
    saving.value = true;
    err.value = null;
    try {
        // Departamentos e bucket Loja são da EMPRESA; status e liberação, da ETAPA.
        if (companyId.value != null) {
            const overrides = {};
            for (const [d, st] of Object.entries(overrideState.value)) {
                if (st === 'marketing') overrides[d] = true;
                else if (st === 'not') overrides[d] = false;
            }
            await adminStore.setEnterpriseSettings(companyId.value, {
                marketing_dept_overrides: overrides,
                loja_departments: Object.entries(lojaState.value).filter(([, v]) => v).map(([d]) => d),
            });
        }
        if (enterpriseKey.value != null) {
            await adminStore.setStageSettings(enterpriseKey.value, {
                status_override: statusOverride.value || null,
                company_id: companyId.value,
            });
            // liberação é um endpoint separado (trilha released_by/at)
            await adminStore.setEnterpriseRelease(
                enterpriseKey.value, isReleased.value, releaseNotes.value || null, companyId.value
            );
        }
        emit('saved');
        emit('close');
    } catch (e) {
        err.value = e?.message || 'Erro ao salvar.';
    } finally {
        saving.value = false;
    }
}
</script>
