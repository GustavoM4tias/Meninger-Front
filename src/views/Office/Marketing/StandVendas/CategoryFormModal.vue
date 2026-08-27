<template>
    <Modal :open="open" size="md" :title="category ? 'Editar categoria' : 'Nova categoria'"
        subtitle="A categoria puxa o tipo automaticamente para as contas dela — e o tipo você escolhe aqui."
        @close="$emit('close')">
        <div class="flex flex-col gap-4">
            <Input v-model="form.name" label="Nome da categoria" placeholder="Ex.: Aluguel, Decorado, Energia..." required />

            <div>
                <label class="text-micro font-medium text-ink-muted mb-1.5 block">Tipo de gasto</label>
                <SegmentedControl v-model="form.kind" block :options="KIND_OPTIONS" />
                <p class="text-xs text-ink-subtle mt-1.5">{{ kindMeta(form.kind).hint }}</p>
            </div>

            <div>
                <label class="text-micro font-medium text-ink-muted mb-1.5 block">
                    Contas do Sienge (plano 2.02.07)
                </label>
                <Input v-model="buscaConta" size="sm" icon-left="fas fa-magnifying-glass"
                    placeholder="Filtrar por código ou nome da conta" class="mb-2"
                    title="Filtra a lista de contas abaixo" />
                <div class="border border-line rounded-lg divide-y divide-line max-h-64 overflow-y-auto">
                    <label v-for="c in contasFiltradas" :key="c.code"
                        :title="`${c.code} - ${c.name}`
                            + (c.standPlan ? ' (plano de Despesas com Stand)' : ' (fora do plano do stand)')
                            + (c.entries ? ` - ${c.entries} lançamentos no recorte de hoje` : '')"
                        class="px-3 py-2 flex items-center gap-2.5 cursor-pointer hover:bg-surface-sunken/60 transition-colors">
                        <input type="checkbox" class="check shrink-0" :checked="form.conta_codes.includes(c.code)"
                            @change="alternarConta(c.code)" />
                        <span class="font-mono text-micro text-ink-subtle shrink-0">{{ c.code }}</span>
                        <span class="text-sm text-ink truncate flex-1">{{ c.name }}</span>
                        <Badge v-if="!c.standPlan" variant="warning" size="sm" title="Conta de fora do plano do stand">
                            fora do plano
                        </Badge>
                        <Badge v-if="donoDe(c.code)" variant="neutral" size="sm">{{ donoDe(c.code) }}</Badge>
                    </label>
                    <p v-if="!contasFiltradas.length" class="px-3 py-4 text-xs text-ink-subtle text-center">
                        {{ contas.length ? 'Nenhuma conta bate com o filtro.'
                            : 'Não foi possível ler o plano financeiro do Sienge agora.' }}
                    </p>
                </div>
                <p class="text-xs text-ink-subtle mt-1.5">
                    Uma conta pertence a uma categoria só: marcar aqui tira ela da categoria que estiver hoje. As
                    marcadas como "fora do plano" aparecem porque o gasto está sendo apurado pelo departamento.
                </p>
            </div>

            <Input v-model="form.description" label="Descrição" placeholder="Opcional" />

            <div v-if="errorMsg" class="text-sm text-data-neg flex items-center gap-2">
                <i class="fas fa-circle-exclamation"></i>{{ errorMsg }}
            </div>
        </div>

        <template #footer>
            <div class="flex items-center justify-between w-full gap-2">
                <Button v-if="category" variant="danger" size="sm" icon="fas fa-trash" :loading="store.saving"
                    @click="remover">
                    Excluir
                </Button>
                <div class="flex items-center gap-2 ml-auto">
                    <Button variant="ghost" size="sm" @click="$emit('close')">Cancelar</Button>
                    <Button variant="primary" size="sm" icon="fas fa-check" :loading="store.saving" @click="salvar">
                        Salvar
                    </Button>
                </div>
            </div>
        </template>
    </Modal>
</template>

<script setup>
// Categorias de gasto do stand: o padrão que diz, por CONTA do Sienge, se o
// gasto é construção, recorrência ou esporádica. O tipo PUXA automático para
// os lançamentos daquelas contas, e é daqui que se muda. Vale para todos os
// stands — por isso é tela de admin. Reclassificar um lançamento específico
// continua sendo na tela do stand.
import { ref, watch, computed } from 'vue';
import { useSalesStandStore, KIND_OPTIONS, kindMeta } from '@/stores/Marketing/SalesStand/salesStandStore';
import { pedirConfirmacao } from '@/composables/useConfirm';

import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    category: { type: Object, default: null },
});
const emit = defineEmits(['close', 'saved']);

const store = useSalesStandStore();
const errorMsg = ref('');
const form = ref({ name: '', kind: 'recorrencia', conta_codes: [], description: '' });
const buscaConta = ref('');

const contas = computed(() => store.contas);
// Marcadas primeiro: com 59 contas na lista, achar o que já está na categoria
// era rolar até tropecar nelas.
const contasFiltradas = computed(() => {
    const q = buscaConta.value.trim().toLowerCase();
    const marcada = (c) => form.value.conta_codes.includes(c.code);
    return contas.value
        .filter((c) => !q || `${c.code} ${c.name}`.toLowerCase().includes(q))
        .slice()
        .sort((a, b) => Number(marcada(b)) - Number(marcada(a)));
});

// Qual categoria é dona da conta hoje (fora esta) — para não trocar de dono sem querer.
function donoDe(code) {
    const dona = store.categories.find((c) => c.id !== props.category?.id && (c.conta_codes || []).includes(code));
    return dona ? `hoje em ${dona.name}` : '';
}

watch(() => props.open, async (open) => {
    if (!open) return;
    errorMsg.value = '';
    buscaConta.value = '';
    await store.fetchContas();
    form.value = props.category
        ? {
            name: props.category.name || '',
            kind: props.category.kind || 'recorrencia',
            conta_codes: [...(props.category.conta_codes || [])],
            description: props.category.description || '',
        }
        : { name: '', kind: 'recorrencia', conta_codes: [], description: '' };
});

function alternarConta(code) {
    const i = form.value.conta_codes.indexOf(code);
    if (i >= 0) form.value.conta_codes.splice(i, 1);
    else form.value.conta_codes.push(code);
}

async function salvar() {
    errorMsg.value = '';
    if (!form.value.name.trim()) { errorMsg.value = 'Informe o nome da categoria.'; return; }
    try {
        await store.saveCategory({
            name: form.value.name,
            kind: form.value.kind,
            conta_codes: form.value.conta_codes,
            description: form.value.description,
        }, props.category?.id || null);
        emit('saved');
        emit('close');
    } catch (e) {
        errorMsg.value = e.message || 'Erro ao salvar a categoria.';
    }
}

async function remover() {
    if (!await pedirConfirmacao({
        title: `Excluir a categoria ${props.category?.name}?`,
        consequence: 'Os lançamentos das contas dela ficam SEM classificação (não entram nem em construção nem em '
            + 'recorrência) até você criar outra categoria para essas contas ou classificar um a um.',
        confirmLabel: 'Excluir categoria',
    })) return;
    errorMsg.value = '';
    try {
        await store.deleteCategory(props.category.id);
        emit('saved');
        emit('close');
    } catch (e) {
        errorMsg.value = e.message || 'Erro ao excluir a categoria.';
    }
}
</script>

<style scoped>
.check {
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
    accent-color: rgb(var(--accent));
    cursor: pointer;
}
</style>
