<template>
    <Modal :open="open" size="md" :title="stand ? 'Editar stand' : 'Novo stand'"
        subtitle="O custo soma automaticamente os títulos do plano Despesas com Stand (2.02.07) dos centros de custo vinculados."
        @close="$emit('close')">
        <div class="flex flex-col gap-4">
            <Input v-model="form.name" label="Nome do stand" placeholder="Ex.: Stand Três Marias" required />

            <Surface v-if="travado" variant="flat" padding="sm" bordered class="border-data-warn/30 bg-data-warn/10">
                <p class="text-xs text-data-warn flex items-start gap-2">
                    <i class="fas fa-lock mt-0.5"></i>
                    <span>
                        Este stand está <b>definido</b>: o custo de construção já foi congelado sobre estes centros de
                        custo. Para trocar o modelo ou mexer nos centros de custo, reabra o stand antes.
                    </span>
                </p>
            </Surface>

            <div>
                <label class="text-micro font-medium text-ink-muted mb-1.5 block">Stand modelo (categoria)</label>
                <Select v-model="form.model_id" :options="[{ value: '', label: '(Sem modelo)' }, ...store.modelOptions]"
                    placeholder="(Sem modelo)" :disabled="travado"
                    :title="travado ? 'Stand definido: reabra para trocar o modelo' : 'Categoria de stand que serve de referência de valor e de itens'" />
            </div>

            <div>
                <label class="text-micro font-medium text-ink-muted mb-1.5 block">Centros de custo (1 ou mais)</label>
                <MultiSelector v-if="!travado" v-model="ccSelection" :options="store.costCenterOptions"
                    placeholder="Selecione os centros de custo" :page-size="200" overlay />
                <div v-else class="flex flex-wrap gap-1.5 px-3 py-2 rounded-lg border border-line bg-surface-sunken">
                    <span v-for="cc in ccSelection" :key="cc" :title="cc"
                        class="px-2 py-0.5 rounded-md bg-surface border border-line text-micro text-ink-muted">{{ cc }}</span>
                </div>
                <p class="text-xs text-ink-subtle mt-1.5">
                    {{ travado
                        ? 'Travados enquanto o stand estiver definido.'
                        : 'O gasto do stand é a soma dos centros de custo selecionados. Dá para acrescentar e remover à vontade enquanto ele é rascunho.' }}
                </p>
            </div>

            <div v-if="stand">
                <Input v-model="form.maintenance_percent" type="number" label="% de manutenção (fase futura)"
                    placeholder="Ex.: 100"
                    hint="Percentual do recorrente (pós-definição) a lançar como custo de marketing. Ainda sem efeito." />
            </div>

            <Input v-model="form.notes" label="Observações" placeholder="Opcional" />

            <div v-if="errorMsg" class="text-sm text-data-neg flex items-center gap-2">
                <i class="fas fa-circle-exclamation"></i>{{ errorMsg }}
            </div>
        </div>

        <template #footer>
            <div class="flex items-center justify-between w-full gap-2">
                <Button v-if="stand" variant="danger" size="sm" icon="fas fa-trash" :loading="store.saving"
                    @click="removeStand">
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
import { ref, computed, watch } from 'vue';
import { useSalesStandStore } from '@/stores/Marketing/SalesStand/salesStandStore';
import Modal from '@/components/UI/Modal.vue';
import Surface from '@/components/UI/Surface.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    // Stand em edição (objeto) ou null p/ criação.
    stand: { type: Object, default: null },
});
const emit = defineEmits(['close', 'saved', 'deleted']);

const store = useSalesStandStore();
const errorMsg = ref('');
// Stand definido: modelo e centros de custo travam (a API cobra o mesmo). O
// número congelado fala daquele conjunto — trocar sem reabrir seria mentira.
const travado = computed(() => props.stand?.status === 'defined');
const ccSelection = ref([]);
const form = ref({ name: '', model_id: '', notes: '', maintenance_percent: '' });

watch(() => props.open, (open) => {
    if (!open) return;
    errorMsg.value = '';
    if (props.stand) {
        form.value = {
            name: props.stand.name || '',
            model_id: props.stand.model_id || '',
            notes: props.stand.notes || '',
            maintenance_percent: props.stand.maintenance_percent != null ? String(Number(props.stand.maintenance_percent)) : '',
        };
        ccSelection.value = (props.stand.cost_center_ids || [])
            .map((id) => store.costCenterOptionByCode.get(Number(id)))
            .filter(Boolean);
    } else {
        form.value = { name: '', model_id: '', notes: '', maintenance_percent: '' };
        ccSelection.value = [];
    }
});

async function save() {
    errorMsg.value = '';
    if (!form.value.name.trim()) { errorMsg.value = 'Informe o nome do stand.'; return; }
    const ccIds = ccSelection.value
        .map((opt) => store.costCenterCodeByOption.get(opt))
        .filter(Boolean);
    if (!ccIds.length) { errorMsg.value = 'Vincule ao menos um centro de custo.'; return; }
    const payload = {
        name: form.value.name,
        model_id: form.value.model_id || null,
        cost_center_ids: ccIds,
        notes: form.value.notes,
    };
    if (props.stand) {
        payload.maintenance_percent = form.value.maintenance_percent === '' ? null : Number(form.value.maintenance_percent);
    }
    try {
        await store.saveStand(payload, props.stand?.id || null);
        emit('saved');
        emit('close');
    } catch (e) {
        errorMsg.value = e.message || 'Erro ao salvar o stand.';
    }
}

async function removeStand() {
    errorMsg.value = '';
    try {
        await store.deleteStand(props.stand.id);
        emit('deleted', props.stand.id);
        emit('close');
    } catch (e) {
        errorMsg.value = e.message || 'Erro ao excluir o stand.';
    }
}
</script>
