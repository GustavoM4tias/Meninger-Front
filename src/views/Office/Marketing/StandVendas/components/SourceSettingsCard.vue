<template>
    <Panel title="O que conta como gasto de stand" icon="fas fa-filter"
        subtitle="A régua que decide quais lançamentos do Sienge entram em TODOS os stands.">
        <template v-if="canConfigure" #actions>
            <Button variant="primary" size="sm" icon="fas fa-check" :disabled="!sujo" :loading="store.saving"
                title="Aplica a nova régua e recalcula o custo de todos os stands" @click="salvar">
                Aplicar
            </Button>
        </template>

        <div class="flex flex-col gap-4">
            <div>
                <SegmentedControl v-if="canConfigure" v-model="form.expense_source" block size="sm" :options="OPCOES" />
                <div v-else class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-surface-sunken border border-line">
                    <i :class="modoAtual.icon" class="text-micro text-ink-subtle"></i>
                    <span class="text-sm text-ink">{{ modoAtual.label }}</span>
                </div>
                <p class="text-xs text-ink-muted mt-2 leading-relaxed">{{ explicacao }}</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div v-if="form.expense_source !== 'plano'">
                    <label class="text-micro font-medium text-ink-muted mb-1.5 block">Departamento do stand</label>
                    <Select v-model="form.department_id" size="sm" :disabled="!canConfigure"
                        title="Departamento do Sienge que marca o título como gasto de stand"
                        :options="departmentOptions" />
                </div>
                <div v-if="form.expense_source !== 'departamento'">
                    <Input v-model="form.conta_prefix" size="sm" label="Plano financeiro (prefixo)"
                        :disabled="!canConfigure" placeholder="20207"
                        title="Prefixo das contas do plano financeiro do stand"
                        hint="20207 = Despesas com Stand" />
                </div>
            </div>

            <p v-if="form.expense_source === 'departamento'" class="text-xs text-ink-subtle leading-relaxed">
                As contas do plano <span class="font-mono text-ink-muted">{{ form.conta_prefix }}</span> continuam
                servindo para categorizar: o que aparecer de fora delas cai em "sem classificação" até ganhar uma
                categoria.
            </p>

            <div v-if="errorMsg" class="text-sm text-data-neg flex items-center gap-2">
                <i class="fas fa-circle-exclamation"></i>{{ errorMsg }}
            </div>
        </div>
    </Panel>
</template>

<script setup>
// A régua do módulo, em tela. Trocar isto reescreve o custo de todos os stands
// — por isso é admin, e por isso a tela diz o que cada modo faz antes de
// aplicar, em vez de só perguntar "tem certeza?".
import { ref, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useSalesStandStore } from '@/stores/Marketing/SalesStand/salesStandStore';
import { pedirConfirmacao } from '@/composables/useConfirm';
import { fmtBRL } from '../standFormat';

import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

const props = defineProps({
    canConfigure: { type: Boolean, default: false },
});

const OPCOES = [
    { value: 'departamento', label: 'Departamento', icon: 'fas fa-sitemap' },
    { value: 'plano', label: 'Plano financeiro', icon: 'fas fa-list-ol' },
    { value: 'ambos', label: 'Os dois', icon: 'fas fa-code-branch' },
];

const EXPLICACAO = {
    departamento: 'Entra o que foi apropriado no departamento do stand, rateado pelo percentual dessa apropriação. '
        + 'Quem lançou o título é quem decide o que é stand.',
    plano: 'Entra o que foi apropriado numa conta do plano financeiro do stand, seja qual for o departamento.',
    ambos: 'Entra só o que é as duas coisas ao mesmo tempo: apropriado no departamento do stand E numa conta do '
        + 'plano do stand. É a régua mais apertada — o que ficar de fora some da tela.',
};

const store = useSalesStandStore();
const toast = useToast();
const errorMsg = ref('');
const form = ref({ expense_source: 'departamento', department_id: '', conta_prefix: '20207' });
const original = ref('');

const explicacao = computed(() => EXPLICACAO[form.value.expense_source] || '');
const modoAtual = computed(() => OPCOES.find((o) => o.value === form.value.expense_source) || OPCOES[0]);
const sujo = computed(() => JSON.stringify(form.value) !== original.value);

const departmentOptions = computed(() => (store.departments || [])
    .map((d) => ({ value: d.id, label: `${d.name} (${d.id})` })));

watch(() => store.settings, (cfg) => {
    if (!cfg) return;
    form.value = {
        expense_source: cfg.expense_source,
        department_id: cfg.department_id,
        conta_prefix: String(cfg.conta_prefix || ''),
    };
    original.value = JSON.stringify(form.value);
}, { immediate: true });

async function salvar() {
    errorMsg.value = '';
    const antes = store.stands.reduce((s, x) => s + Number(x.spend_total || 0), 0);
    const modo = OPCOES.find((o) => o.value === form.value.expense_source)?.label;
    if (!await pedirConfirmacao({
        title: `Passar a apurar o gasto por ${modo}?`,
        consequence: `${EXPLICACAO[form.value.expense_source]} Vale para os ${store.stands.length} stands de uma vez. `
            + `Hoje eles somam ${fmtBRL(antes)}, e esse número vai mudar. Nenhuma classificação feita à mão se perde.`,
        confirmLabel: 'Aplicar régua',
        tone: 'accent',
    })) return;
    try {
        await store.saveSettings({
            expense_source: form.value.expense_source,
            department_id: Number(form.value.department_id) || undefined,
            conta_prefix: form.value.conta_prefix,
        });
        original.value = JSON.stringify(form.value);
        const depois = store.stands.reduce((s, x) => s + Number(x.spend_total || 0), 0);
        toast.success(`Régua aplicada: ${fmtBRL(antes)} → ${fmtBRL(depois)}.`);
    } catch (e) {
        errorMsg.value = e.message || 'Erro ao salvar a configuração.';
    }
}
</script>
