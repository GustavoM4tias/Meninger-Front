<template>
    <section class="sr-sec">
        <div class="sr-head">
            <p class="eyebrow">A régua</p>
            <h2 class="display">O que conta como gasto de stand</h2>
            <p>Decide quais títulos do Sienge entram em TODOS os stands. Trocar a régua muda o número de todas as telas, por isso ela pede confirmação e diz o antes e o depois.</p>
        </div>
        <div class="sr-box">
            <div class="row">
                <div class="sr-seg" role="group" aria-label="Origem do gasto">
                    <button v-for="o in OPCOES" :key="o.value" type="button" :aria-pressed="form.expense_source === o.value"
                        :disabled="!canConfigure" :data-tip="EXPLICACAO[o.value]" @click="form.expense_source = o.value">
                        <i :class="o.icon"></i> {{ o.label }}
                    </button>
                </div>
                <button v-if="canConfigure" type="button" class="sr-btn" :disabled="!sujo || store.saving"
                    data-tip="Aplica a nova régua e recalcula o custo de todos os stands" @click="salvar">
                    <i class="fas fa-check"></i>{{ store.saving ? 'Aplicando…' : 'Aplicar' }}
                </button>
            </div>
            <p class="expl">{{ explicacao }}</p>
            <div class="fields">
                <label v-if="form.expense_source !== 'plano'" class="sr-field"
                    data-tip="Departamento do Sienge que marca o título como gasto de stand">
                    <span>Departamento do stand</span>
                    <select v-model="form.department_id" class="sr-input" :disabled="!canConfigure">
                        <option v-for="d in departmentOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
                    </select>
                </label>
                <label v-if="form.expense_source !== 'departamento'" class="sr-field"
                    data-tip="Prefixo das contas do plano financeiro do stand. 20207 = Despesas com Stand">
                    <span>Plano financeiro (prefixo)</span>
                    <input v-model="form.conta_prefix" class="sr-input num" :disabled="!canConfigure" placeholder="20207" />
                </label>
            </div>
            <p v-if="form.expense_source === 'departamento'" class="sr-note">
                <i class="fas fa-circle-info"></i>
                <span>As contas continuam servindo para categorizar: o que vier de fora delas ganha categoria pelas regras automáticas abaixo ou fica sem classificação.</span>
            </p>
            <p v-if="errorMsg" class="sr-note warn"><i class="fas fa-circle-exclamation"></i>{{ errorMsg }}</p>
        </div>
    </section>
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

import '../report/standReport.css';

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

<style scoped>
.row { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center; }
.expl { font-size: 14px; color: var(--sr-muted); max-width: 80ch; }
.fields { display: grid; grid-template-columns: repeat(2, minmax(0, 340px)); gap: 14px; }
@media (max-width: 680px) { .fields { grid-template-columns: 1fr; } }
</style>
