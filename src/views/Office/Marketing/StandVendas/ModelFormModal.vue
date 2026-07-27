<template>
    <Modal :open="open" size="md" :title="model ? 'Editar modelo' : 'Novo modelo'"
        subtitle="Stand modelo (categoria): valor médio de referência e itens que o compõem."
        @close="$emit('close')">
        <div class="flex flex-col gap-4">
            <Input v-model="form.name" label="Nome do modelo" placeholder="Ex.: Stand contêiner, Loja decorada..." required />

            <div>
                <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Valor médio (R$)</label>
                <div class="grid grid-cols-2 gap-2">
                    <Input v-model="form.avg_value_min" type="number" placeholder="De" />
                    <Input v-model="form.avg_value_max" type="number" placeholder="Até" />
                </div>
                <p class="text-xs text-ink-subtle mt-1.5">Faixa do custo médio de construção. Deixe o "até" vazio para faixa aberta (ex.: 110 mil+).</p>
            </div>

            <div>
                <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Metragem (m²)</label>
                <div class="grid grid-cols-2 gap-2">
                    <Input v-model="form.avg_area_min" type="number" placeholder="De" />
                    <Input v-model="form.avg_area_max" type="number" placeholder="Até" />
                </div>
                <p class="text-xs text-ink-subtle mt-1.5">Deixe o "até" vazio para faixa aberta (ex.: 80 m²+).</p>
            </div>

            <Input v-model="form.description" label="Descrição" placeholder="Opcional" />

            <!-- Itens do stand -->
            <div>
                <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Itens do stand</label>
                <div class="flex gap-2">
                    <Input v-model="newItem" placeholder="Ex.: Ar-condicionado, mobiliário, totem..."
                        class="flex-1" @keyup.enter="addItem" />
                    <Button variant="secondary" size="md" icon="fas fa-plus" @click="addItem">Adicionar</Button>
                </div>
                <div v-if="form.items.length" class="flex flex-wrap gap-1.5 mt-2.5">
                    <span v-for="(item, i) in form.items" :key="`${item}-${i}`"
                        class="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-md bg-surface-sunken border border-line text-xs text-ink">
                        {{ item }}
                        <button type="button" class="w-5 h-5 rounded flex items-center justify-center text-ink-subtle hover:text-red-500 transition-colors"
                            :aria-label="`Remover ${item}`" @click="form.items.splice(i, 1)">
                            <i class="fas fa-xmark text-[10px]"></i>
                        </button>
                    </span>
                </div>
                <p v-else class="text-xs text-ink-subtle mt-2">Nenhum item adicionado ainda.</p>
            </div>

            <div v-if="errorMsg" class="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <i class="fas fa-circle-exclamation"></i>{{ errorMsg }}
            </div>
        </div>

        <template #footer>
            <div class="flex items-center justify-between w-full gap-2">
                <Button v-if="model" variant="danger" size="sm" icon="fas fa-trash" :loading="store.saving"
                    @click="removeModel">
                    Excluir
                </Button>
                <div class="flex items-center gap-2 ml-auto">
                    <Button variant="ghost" size="sm" @click="$emit('close')">Cancelar</Button>
                    <Button variant="primary" size="sm" icon="fas fa-check" :loading="store.saving" @click="save">
                        Salvar
                    </Button>
                </div>
            </div>
        </template>
    </Modal>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useSalesStandStore } from '@/stores/Marketing/SalesStand/salesStandStore';
import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    // Modelo em edição (objeto) ou null p/ criação.
    model: { type: Object, default: null },
});
const emit = defineEmits(['close', 'saved']);

const store = useSalesStandStore();
const newItem = ref('');
const errorMsg = ref('');
const form = ref({ name: '', avg_value_min: '', avg_value_max: '', avg_area_min: '', avg_area_max: '', description: '', items: [] });

watch(() => props.open, (open) => {
    if (!open) return;
    errorMsg.value = '';
    newItem.value = '';
    form.value = props.model
        ? {
            name: props.model.name || '',
            avg_value_min: props.model.avg_value_min != null ? String(Number(props.model.avg_value_min)) : '',
            avg_value_max: props.model.avg_value_max != null ? String(Number(props.model.avg_value_max)) : '',
            avg_area_min: props.model.avg_area_min != null ? String(Number(props.model.avg_area_min)) : '',
            avg_area_max: props.model.avg_area_max != null ? String(Number(props.model.avg_area_max)) : '',
            description: props.model.description || '',
            items: [...(props.model.items || [])],
        }
        : { name: '', avg_value_min: '', avg_value_max: '', avg_area_min: '', avg_area_max: '', description: '', items: [] };
});

function addItem() {
    const v = newItem.value.trim();
    if (!v) return;
    if (!form.value.items.includes(v)) form.value.items.push(v);
    newItem.value = '';
}

async function save() {
    errorMsg.value = '';
    if (!form.value.name.trim()) { errorMsg.value = 'Informe o nome do modelo.'; return; }
    const min = Number(form.value.avg_value_min) || 0;
    const max = Number(form.value.avg_value_max) || 0;
    if (max && min > max) { errorMsg.value = 'O valor "de" não pode ser maior que o valor "até".'; return; }
    const areaMin = Number(form.value.avg_area_min) || 0;
    const areaMax = Number(form.value.avg_area_max) || 0;
    if (areaMax && areaMin > areaMax) { errorMsg.value = 'A metragem "de" não pode ser maior que a metragem "até".'; return; }
    try {
        await store.saveModel({
            name: form.value.name,
            avg_value_min: min,
            avg_value_max: max,
            avg_area_min: areaMin,
            avg_area_max: areaMax,
            description: form.value.description,
            items: form.value.items,
        }, props.model?.id || null);
        emit('saved');
        emit('close');
    } catch (e) {
        errorMsg.value = e.message || 'Erro ao salvar o modelo.';
    }
}

async function removeModel() {
    errorMsg.value = '';
    try {
        await store.deleteModel(props.model.id);
        emit('saved');
        emit('close');
    } catch (e) {
        errorMsg.value = e.message || 'Erro ao excluir o modelo.';
    }
}
</script>
