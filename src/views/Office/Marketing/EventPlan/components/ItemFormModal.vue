<script setup>
// Cadastro/edição de um item de custo do evento.
// Os dois campos que mais pesam na decisão são "obrigatório" e "orçado":
// o primeiro trava a reprovação isolada do item, o segundo diz a quem decide se
// o número é firme ou chute. Por isso vêm com explicação na própria tela.

import { computed, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import api from '@/utils/EventPlan/api.js';

import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    item: { type: Object, default: null },
    eventTitle: { type: String, default: '' },
    categories: { type: Array, default: () => [] },
    planId: { type: [Number, String], default: '' },
    saving: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'save']);

const toast = useToast();
const uploading = ref(false);

const blank = () => ({
    name: '', category: '', quantity: 1, unit_value: '',
    necessity: 'OPCIONAL', cost_basis: 'ESTIMADO', supplier: '', description: '',
});

const form = ref(blank());

watch(() => props.open, (open) => {
    if (!open) return;
    form.value = props.item ? { ...blank(), ...props.item } : blank();
});

const categoryOptions = computed(() =>
    (props.categories || []).filter(c => c.active !== false).map(c => ({ value: c.label, label: c.label }))
);

const total = computed(() => {
    const value = Number(form.value.quantity || 0) * Number(form.value.unit_value || 0);
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
});

const isRequired = computed({
    get: () => form.value.necessity === 'OBRIGATORIO',
    set: (v) => { form.value.necessity = v ? 'OBRIGATORIO' : 'OPCIONAL'; },
});

const hasQuote = computed({
    get: () => form.value.cost_basis === 'ORCADO',
    set: (v) => { form.value.cost_basis = v ? 'ORCADO' : 'ESTIMADO'; },
});

async function anexarOrcamento(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    uploading.value = true;
    try {
        const { url } = await api.uploadQuote(file, props.planId);
        form.value.attachment_url = url;
        // Anexou orçamento: o item deixa de ser estimativa por definição.
        form.value.cost_basis = 'ORCADO';
        toast.success('Orçamento anexado.');
    } catch (e) {
        toast.error(e?.message || 'Falha ao anexar o orçamento.');
    } finally {
        uploading.value = false;
        event.target.value = '';
    }
}

function save() {
    emit('save', {
        ...form.value,
        quantity: Number(form.value.quantity || 1),
        unit_value: Number(form.value.unit_value || 0),
    });
}
</script>

<template>
    <Modal
        :open="open"
        :title="item ? 'Editar item' : 'Novo item'"
        :subtitle="eventTitle"
        size="md"
        @close="emit('close')"
    >
        <div class="space-y-5">
            <Input v-model="form.name" label="Item" placeholder="Café da padaria, caneca personalizada, panfleto..." required />

            <!-- Quanto custa: o total fica em destaque porque é o número que
                 quem decide vai olhar primeiro. -->
            <div class="rounded-xl border border-line bg-surface-sunken p-3">
                <div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <Input v-model="form.quantity" type="number" label="Quantidade" size="sm" />
                    <Input v-model="form.unit_value" type="number" label="Valor unitário" size="sm" />
                    <div class="text-right sm:pb-1 sm:pl-3">
                        <p class="text-xs text-ink-subtle">Total do item</p>
                        <p class="text-xl font-semibold text-ink">{{ total }}</p>
                    </div>
                </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
                <Select v-model="form.category" label="Categoria" :options="categoryOptions" placeholder="Escolha" />
                <Input v-model="form.supplier" label="Fornecedor" placeholder="Opcional" />
            </div>

            <!-- Os dois campos que mudam como quem decide enxerga o item. -->
            <div class="space-y-3 rounded-xl border border-line p-3">
                <p class="text-xs font-medium uppercase tracking-wide text-ink-subtle">Como quem decide vai ver</p>
                <Switch
                    v-model="isRequired"
                    label="Item obrigatório"
                    description="Sem ele o evento não acontece. Quem decide não consegue reprovar só este item: precisa reprovar o evento inteiro ou reclassificar."
                />
                <Switch
                    v-model="hasQuote"
                    label="Valor já orçado"
                    description="Ligado significa orçamento na mão. Desligado é estimativa, e o Marketing recebe o item como pendência de cotação."
                />
            </div>

            <div class="rounded-lg border border-line p-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="min-w-0">
                        <p class="text-sm font-medium text-ink">Orçamento anexado</p>
                        <p class="text-xs text-ink-muted">
                            PDF, imagem ou planilha. É o que sustenta o valor na hora de quem decide olhar.
                        </p>
                    </div>
                    <label class="shrink-0">
                        <input type="file" class="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.xls,.xlsx"
                            @change="anexarOrcamento" />
                        <span
                            class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm text-ink transition hover:border-accent"
                            :class="uploading ? 'pointer-events-none opacity-60' : ''"
                        >
                            <i :class="uploading ? 'fas fa-spinner fa-spin' : 'fas fa-paperclip'"></i>
                            {{ form.attachment_url ? 'Trocar' : 'Anexar' }}
                        </span>
                    </label>
                </div>
                <a v-if="form.attachment_url" :href="form.attachment_url" target="_blank" rel="noopener"
                    class="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline">
                    <i class="fas fa-file"></i> Ver orçamento anexado
                </a>
            </div>

            <Input v-model="form.description" label="Observação" placeholder="Opcional" />
        </div>

        <template #footer>
            <Button variant="ghost" @click="emit('close')">Cancelar</Button>
            <Button variant="primary" :loading="saving" :disabled="!form.name" @click="save">Salvar</Button>
        </template>
    </Modal>
</template>
