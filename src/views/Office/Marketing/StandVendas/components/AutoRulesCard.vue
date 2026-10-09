<template>
    <Panel title="Classificação automática" icon="fas fa-wand-magic-sparkles"
        subtitle="Como cada lançamento ganha categoria e tipo sozinho, em todos os stands.">
        <template v-if="canConfigure" #actions>
            <Button v-if="!store.autoRules.is_default" variant="ghost" size="sm" icon="fas fa-rotate-left"
                :loading="store.saving" @click="restaurar">
                Voltar às regras padrão
            </Button>
            <Button variant="primary" size="sm" icon="fas fa-plus" @click="nova">Nova regra</Button>
        </template>

        <div class="flex flex-col gap-5">
            <!-- A ordem de autoridade, em uma linha por passo. -->
            <ol class="grid grid-cols-1 md:grid-cols-4 gap-2">
                <li v-for="(p, i) in PASSOS" :key="p.t"
                    class="rounded-lg border border-line bg-surface-sunken/60 px-3 py-2.5 flex flex-col gap-0.5">
                    <span class="metric-label">{{ i + 1 }}. {{ p.t }}</span>
                    <span class="text-xs text-ink-muted leading-relaxed">{{ p.d }}</span>
                </li>
            </ol>

            <!-- Janela de montagem -->
            <div class="flex flex-col sm:flex-row sm:items-end gap-3">
                <div class="w-full sm:w-48">
                    <Input v-model="dias" type="number" size="sm" label="Janela de montagem (dias)"
                        :disabled="!canConfigure" placeholder="35" />
                </div>
                <p class="text-xs text-ink-muted leading-relaxed flex-1">
                    Contados da inauguração. Pago até o fim da janela e que não é conta mensal vira
                    <b class="text-series-1">construção</b>; obra paga depois dela vira <b class="text-series-3">esporádico</b>.
                    Stand sem data de inauguração não usa a janela.
                </p>
                <Button v-if="canConfigure" variant="secondary" size="sm" icon="fas fa-check"
                    :disabled="Number(dias) === Number(store.autoRules.assembly_days)" :loading="store.saving"
                    @click="salvarDias">
                    Aplicar
                </Button>
            </div>

            <!-- Regras -->
            <div class="flex flex-col gap-2">
                <div class="flex items-baseline justify-between gap-2">
                    <p class="text-sm font-semibold text-ink">Regras por palavra</p>
                    <p class="text-micro text-ink-subtle">
                        {{ store.autoRules.is_default ? 'Regras padrão do sistema' : 'Regras ajustadas na tela' }} · vale a primeira que casar
                    </p>
                </div>
                <p class="text-xs text-ink-muted">
                    Só para lançamento que a conta não categoriza (adiantamento a fornecedor, brindes, despesas diversas).
                    Olham o nome do fornecedor e a observação do título.
                </p>
                <ul class="flex flex-col divide-y divide-line-subtle rounded-lg border border-line bg-surface-raised">
                    <li v-for="(r, idx) in regras" :key="r.id"
                        class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 py-2.5 stagger-in"
                        :class="{ 'opacity-50': r.is_active === false }" :style="{ '--i': idx }">
                        <span class="font-mono text-xs text-ink-subtle w-5 shrink-0">{{ idx + 1 }}</span>
                        <div class="flex-1 min-w-0 flex flex-col gap-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="text-sm font-medium text-ink">{{ r.name }}</span>
                                <i class="fas fa-arrow-right text-micro text-ink-subtle"></i>
                                <span class="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                                    <span class="w-2 h-2 rounded-full" :class="kindMeta(categoria(r)?.kind).dot"></span>
                                    {{ categoria(r)?.name || 'Categoria removida' }}
                                </span>
                            </div>
                            <div class="flex flex-wrap gap-1">
                                <span v-for="t in r.terms" :key="t"
                                    class="px-1.5 py-0.5 rounded bg-surface-sunken border border-line text-micro font-mono text-ink-muted">{{ t }}</span>
                            </div>
                        </div>
                        <div v-if="canConfigure" class="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                            <IconButton icon="fas fa-arrow-up" size="sm" variant="ghost" label="Subir" :disabled="idx === 0"
                                @click="mover(idx, -1)" />
                            <IconButton icon="fas fa-arrow-down" size="sm" variant="ghost" label="Descer"
                                :disabled="idx === regras.length - 1" @click="mover(idx, 1)" />
                            <IconButton :icon="r.is_active === false ? 'fas fa-toggle-off' : 'fas fa-toggle-on'" size="sm"
                                variant="ghost" :label="r.is_active === false ? 'Ligar regra' : 'Desligar regra'"
                                @click="alternar(idx)" />
                            <IconButton icon="fas fa-pen" size="sm" variant="ghost" label="Editar regra" @click="editar(idx)" />
                        </div>
                    </li>
                    <li v-if="!regras.length" class="px-3 py-4 text-sm text-ink-muted">Nenhuma regra. Lançamento sem categoria pela conta fica sem classificação.</li>
                </ul>
            </div>

            <div v-if="errorMsg" class="text-sm text-data-neg flex items-center gap-2">
                <i class="fas fa-circle-exclamation"></i>{{ errorMsg }}
            </div>
        </div>

        <Modal :open="modal.open" size="md" :title="modal.idx === null ? 'Nova regra' : 'Editar regra'"
            subtitle="Lançamento sem categoria pela conta cujo fornecedor ou observação tenha uma das palavras cai na categoria escolhida."
            @close="modal.open = false">
            <div class="flex flex-col gap-4">
                <Input v-model="modal.name" label="Nome da regra" placeholder="Ex.: Móveis comprados por adiantamento" />
                <div>
                    <label class="text-micro font-medium text-ink-muted mb-1.5 block">Categoria</label>
                    <Select v-model="modal.category_id" :options="store.categoryOptions" placeholder="Escolha a categoria" />
                </div>
                <div>
                    <label class="text-micro font-medium text-ink-muted mb-1.5 block">Palavras (uma por linha ou separadas por vírgula)</label>
                    <textarea v-model="modal.terms" rows="5"
                        class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink font-mono focus-ring"
                        placeholder="MOVEIS&#10;PLANEJAD*&#10;AR CONDICIONADO"></textarea>
                    <p class="text-xs text-ink-subtle mt-1.5">
                        Sem acento e sem diferença de maiúscula. Palavra inteira por padrão ("SINO" não pega "SINOP");
                        com * no fim vale o começo da palavra ("CONSTRU*" pega construção e construtora).
                    </p>
                </div>
                <div v-if="modal.erro" class="text-sm text-data-neg">{{ modal.erro }}</div>
            </div>
            <template #footer>
                <div class="flex items-center justify-between w-full gap-2">
                    <Button v-if="modal.idx !== null" variant="danger" size="sm" icon="fas fa-trash" @click="remover">Excluir</Button>
                    <div class="flex items-center gap-2 ml-auto">
                        <Button variant="ghost" size="sm" @click="modal.open = false">Cancelar</Button>
                        <Button variant="primary" size="sm" icon="fas fa-check" :loading="store.saving" @click="salvarModal">Salvar</Button>
                    </div>
                </div>
            </template>
        </Modal>
    </Panel>
</template>

<script setup>
// As regras que classificam sozinhas. Mexer aqui reclassifica TODOS os stands
// na próxima abertura (nada é gravado por lançamento; o que foi classificado à
// mão continua valendo sobre a regra).
import { ref, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useSalesStandStore, kindMeta } from '@/stores/Marketing/SalesStand/salesStandStore';
import { pedirConfirmacao } from '@/composables/useConfirm';
import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Modal from '@/components/UI/Modal.vue';

defineProps({
    canConfigure: { type: Boolean, default: false },
});

const PASSOS = [
    { t: 'À mão', d: 'O que alguém classificou no lançamento vale sobre tudo.' },
    { t: 'Pela conta', d: 'A conta do Sienge cai numa categoria (tabela abaixo), e a categoria dá o tipo.' },
    { t: 'Por palavra', d: 'Sem categoria pela conta, a primeira regra que casar com fornecedor ou observação.' },
    { t: 'Janela de montagem', d: 'Ajusta o tipo pela data: o que foi pago para montar o stand vira construção.' },
];

const store = useSalesStandStore();
const toast = useToast();
const errorMsg = ref('');
const dias = ref(35);
const regras = ref([]);

watch(() => store.autoRules, (a) => {
    regras.value = (a?.rules || []).map((r) => ({ ...r, terms: [...(r.terms || [])] }));
    dias.value = a?.assembly_days ?? 35;
}, { immediate: true, deep: true });

const catById = computed(() => new Map(store.categories.map((c) => [Number(c.id), c])));
const categoria = (r) => catById.value.get(Number(r.category_id));

async function gravar(lista, msg) {
    errorMsg.value = '';
    try {
        await store.saveSettings({ auto_rules: lista });
        toast.success(msg);
        return true;
    } catch (e) {
        errorMsg.value = e.message || 'Não foi possível salvar as regras.';
        return false;
    }
}

function mover(idx, delta) {
    const lista = regras.value.slice();
    const [r] = lista.splice(idx, 1);
    lista.splice(idx + delta, 0, r);
    gravar(lista, 'Ordem das regras salva.');
}
function alternar(idx) {
    const lista = regras.value.map((r, i) => (i === idx ? { ...r, is_active: r.is_active === false } : r));
    gravar(lista, lista[idx].is_active === false ? 'Regra desligada.' : 'Regra ligada.');
}

async function salvarDias() {
    errorMsg.value = '';
    try {
        await store.saveSettings({ assembly_days: Number(dias.value) });
        toast.success(`Janela de montagem: ${dias.value} dias depois da inauguração.`);
    } catch (e) {
        errorMsg.value = e.message || 'Não foi possível salvar a janela.';
    }
}

async function restaurar() {
    if (!await pedirConfirmacao({
        title: 'Voltar às regras padrão?',
        consequence: 'As regras ajustadas aqui são trocadas pelas padrão do sistema, e todos os stands se reclassificam por elas. A classificação feita à mão nos lançamentos não muda.',
        confirmLabel: 'Voltar ao padrão',
    })) return;
    gravar(null, 'Regras padrão restauradas.');
}

const modal = ref({ open: false, idx: null, name: '', category_id: '', terms: '', erro: '' });
function nova() {
    modal.value = { open: true, idx: null, name: '', category_id: '', terms: '', erro: '' };
}
function editar(idx) {
    const r = regras.value[idx];
    modal.value = { open: true, idx, name: r.name, category_id: r.category_id, terms: (r.terms || []).join('\n'), erro: '' };
}
async function salvarModal() {
    const m = modal.value;
    const terms = m.terms.split(/[\n,;]+/).map((t) => t.trim()).filter(Boolean);
    if (!m.name.trim()) { m.erro = 'Dê um nome para a regra.'; return; }
    if (!m.category_id) { m.erro = 'Escolha a categoria.'; return; }
    if (!terms.length) { m.erro = 'Informe ao menos uma palavra.'; return; }
    const regra = { id: m.idx === null ? undefined : regras.value[m.idx].id, name: m.name.trim(), category_id: Number(m.category_id), terms, is_active: true };
    const lista = regras.value.slice();
    if (m.idx === null) lista.push(regra); else lista[m.idx] = { ...lista[m.idx], ...regra };
    if (await gravar(lista, 'Regra salva. Os stands já se reclassificam por ela.')) modal.value.open = false;
}
async function remover() {
    const r = regras.value[modal.value.idx];
    if (!await pedirConfirmacao({
        title: `Excluir a regra "${r.name}"?`,
        consequence: 'Os lançamentos que só ela classificava voltam para "sem classificação" em todos os stands, até outra regra ou alguém pegá-los.',
        confirmLabel: 'Excluir regra',
        tone: 'danger',
    })) return;
    const lista = regras.value.filter((_, i) => i !== modal.value.idx);
    if (await gravar(lista, 'Regra excluída.')) modal.value.open = false;
}
</script>
