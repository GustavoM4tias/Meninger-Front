<template>
    <section class="sr-sec">
        <div class="sr-head-row">
            <div class="sr-head">
                <p class="eyebrow">Classificação automática</p>
                <h2 class="display">Como cada lançamento ganha natureza e fase sozinho</h2>
            </div>
            <div v-if="canConfigure" class="acts">
                <button v-if="!store.autoRules.is_default" type="button" class="sr-btn ghost" :disabled="store.saving"
                    data-tip="Troca as regras ajustadas aqui pelas padrão do sistema" @click="restaurar">
                    <i class="fas fa-rotate-left"></i>Voltar às padrão
                </button>
                <button type="button" class="sr-btn" data-tip="Cria uma regra por palavra no fornecedor ou na observação do título" @click="nova">
                    <i class="fas fa-plus"></i>Nova regra
                </button>
            </div>
        </div>

        <ol class="passos">
            <li v-for="(p, i) in PASSOS" :key="p.t" :data-tip="tipPasso(p, i)">
                <span class="n num">{{ i + 1 }}</span>
                <span><b>{{ p.t }}</b><span>{{ p.d }}</span></span>
            </li>
        </ol>

        <div class="sr-box">
            <div class="janela">
                <label class="sr-field" data-tip="Dias contados da inauguração. Pago até o fim da janela, e que não é conta mensal, vira implantação">
                    <span>Janela de montagem (dias)</span>
                    <input v-model="dias" type="number" min="0" max="365" class="sr-input num" :disabled="!canConfigure" />
                </label>
                <p class="expl">
                    Pago até o fim da janela e que não é conta mensal vira <b :style="{ color: corFase('construcao') }">implantação</b>;
                    obra paga depois dela vira <b :style="{ color: corFase('esporadica') }">ajuste</b>. Stand sem data de inauguração não usa a janela.
                </p>
                <button v-if="canConfigure" type="button" class="sr-btn ghost"
                    :disabled="Number(dias) === Number(store.autoRules.assembly_days) || store.saving"
                    data-tip="Grava a janela e reclassifica todos os stands" @click="salvarDias">
                    <i class="fas fa-check"></i>Aplicar
                </button>
            </div>
        </div>

        <div class="sr-box">
            <div class="rh">
                <div><h3>Regras por palavra</h3><p class="sub">Só para o lançamento que a conta não categoriza (adiantamento, brindes, despesas diversas). Vale a primeira que casar, de cima para baixo.</p></div>
                <span class="sr-chip" :data-tip="store.autoRules.is_default ? 'Ninguém ajustou as regras ainda: valem as do sistema' : 'As regras foram ajustadas nesta tela'">
                    {{ store.autoRules.is_default ? 'Regras padrão do sistema' : 'Regras ajustadas na tela' }}
                </span>
            </div>
            <ul class="regras">
                <li v-for="(r, idx) in regras" :key="r.id" :class="{ off: r.is_active === false }" :style="{ animationDelay: idx * 40 + 'ms' }">
                    <span class="ord num" :data-tip="`Ordem ${idx + 1}: é testada depois das de cima`">{{ idx + 1 }}</span>
                    <div class="rb" :data-tip="tipRegra(r)">
                        <div class="rt">
                            <b>{{ r.name }}</b>
                            <i class="fas fa-arrow-right"></i>
                            <span class="cat"><i class="sw" :style="{ background: corFase(categoria(r)?.kind) }"></i>{{ categoria(r)?.name || 'Categoria removida' }}</span>
                            <span v-if="r.is_active === false" class="sr-chip">desligada</span>
                        </div>
                        <div class="terms"><span v-for="t in r.terms" :key="t" class="sr-chip mono">{{ t }}</span></div>
                    </div>
                    <div v-if="canConfigure" class="ra">
                        <button type="button" class="sr-icon-btn" :disabled="idx === 0" aria-label="Subir" data-tip="Subir: testar antes" @click="mover(idx, -1)"><i class="fas fa-arrow-up"></i></button>
                        <button type="button" class="sr-icon-btn" :disabled="idx === regras.length - 1" aria-label="Descer" data-tip="Descer: testar depois" @click="mover(idx, 1)"><i class="fas fa-arrow-down"></i></button>
                        <button type="button" class="sr-icon-btn" :aria-label="r.is_active === false ? 'Ligar' : 'Desligar'"
                            :data-tip="r.is_active === false ? 'Ligar a regra' : 'Desligar sem apagar'" @click="alternar(idx)">
                            <i :class="r.is_active === false ? 'fas fa-toggle-off' : 'fas fa-toggle-on'"></i>
                        </button>
                        <button type="button" class="sr-icon-btn" aria-label="Editar" data-tip="Editar nome, categoria e palavras" @click="editar(idx)"><i class="fas fa-pen"></i></button>
                    </div>
                </li>
                <li v-if="!regras.length" class="vazio">Nenhuma regra. Lançamento sem categoria pela conta fica sem classificação.</li>
            </ul>
            <p v-if="errorMsg" class="sr-note warn"><i class="fas fa-circle-exclamation"></i>{{ errorMsg }}</p>
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
    </section>
</template>

<style scoped>
.acts { display: flex; gap: 8px; flex-wrap: wrap; }
.passos { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; padding: 0; margin: 0; list-style: none; border-top: 2px solid var(--sr-ink); border-bottom: 1px solid var(--sr-line); }
.passos li { display: grid; grid-template-columns: auto 1fr; gap: 10px; padding: 14px 14px 16px; }
.passos li:first-child { padding-left: 0; }
.passos li + li { border-left: 1px solid var(--sr-line); }
.passos .n { font-family: var(--sr-display); font-size: 26px; font-weight: 700; line-height: 1; color: var(--sr-accent); }
.passos b { display: block; font-size: 14px; }
.passos span span { display: block; font-size: 13px; color: var(--sr-muted); }
.janela { display: grid; grid-template-columns: 200px minmax(0, 1fr) auto; gap: 16px; align-items: end; }
.expl { font-size: 13.5px; color: var(--sr-muted); }
.rh { display: flex; justify-content: space-between; gap: 12px; align-items: start; flex-wrap: wrap; }
.regras { display: grid; padding: 0; margin: 0; list-style: none; border-top: 1px solid var(--sr-line); }
.regras li { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--sr-line); animation: sr-rise 0.35s ease both; }
.regras li.off { opacity: 0.5; }
.regras .ord { font-size: 13px; color: var(--sr-muted); }
.rb { display: grid; gap: 6px; min-width: 0; }
.rt { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.rt b { font-size: 14.5px; }
.rt > i { font-size: 11px; color: var(--sr-muted); }
.cat { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--sr-muted); }
.terms { display: flex; flex-wrap: wrap; gap: 4px; }
.ra { display: flex; gap: 2px; }
.vazio { color: var(--sr-muted); font-size: 14px; }
@media (max-width: 860px) {
    .passos { grid-template-columns: 1fr 1fr; }
    .passos li:nth-child(odd) { padding-left: 0; border-left: 0; }
    .passos li:nth-child(n+3) { border-top: 1px solid var(--sr-line); }
    .janela { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
    .regras li { grid-template-columns: 24px minmax(0, 1fr); }
    .ra { grid-column: 2; }
}
</style>

<script setup>
// As regras que classificam sozinhas. Mexer aqui reclassifica TODOS os stands
// na próxima abertura (nada é gravado por lançamento; o que foi classificado à
// mão continua valendo sobre a regra).
import { ref, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useSalesStandStore } from '@/stores/Marketing/SalesStand/salesStandStore';
import { pedirConfirmacao } from '@/composables/useConfirm';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Modal from '@/components/UI/Modal.vue';
import { FASE, faseLabel, escHtml } from '../report/reportModel';
import '../report/standReport.css';

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
const corFase = (k) => (FASE[k] || FASE.sem_classificacao).color;
const tipPasso = (p, i) => `<b>${i + 1}. ${p.t}</b><span class="t">${p.d}</span>`;
const tipRegra = (r) => {
    const c = categoria(r);
    return `<b>${escHtml(r.name)}</b><span class="t">Fornecedor ou observação com ${r.terms.map(escHtml).join(', ')} vira ${escHtml(c?.name || 'categoria removida')} (${faseLabel(c?.kind)}).${r.is_active === false ? ' Desligada.' : ''}</span>`;
};

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
