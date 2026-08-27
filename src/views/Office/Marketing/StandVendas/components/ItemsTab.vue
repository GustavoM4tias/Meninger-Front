<template>
    <div class="flex flex-col gap-5">
        <Surface variant="raised" padding="sm" class="flex flex-col sm:flex-row sm:items-center gap-3">
            <p class="text-sm text-ink-muted min-w-0 flex-1">
                <span class="text-ink font-medium">{{ presentes }} de {{ lista.length }}</span> itens marcados como
                presentes<span v-if="modelName"> — a lista nasce do modelo <span class="text-ink">{{ modelName }}</span>,
                    e o que este stand tem de diferente você marca aqui.</span>
            </p>
            <div v-if="canManage" class="flex items-center gap-2 shrink-0">
                <Button v-if="sujo" variant="ghost" size="sm" icon="fas fa-arrow-rotate-left" @click="reverter">
                    Descartar
                </Button>
                <Button variant="primary" size="sm" icon="fas fa-check" :disabled="!sujo" :loading="saving"
                    @click="salvar">
                    Salvar itens
                </Button>
            </div>
        </Surface>

        <Surface variant="raised" padding="none" class="overflow-hidden">
            <div class="divide-y divide-line">
                <label v-for="(item, i) in lista" :key="item.label"
                    class="px-4 py-3 flex items-center gap-3 transition-colors"
                    :class="[canManage ? 'cursor-pointer hover:bg-surface-sunken/60' : '', item.present ? '' : 'opacity-60']">
                    <input type="checkbox" class="check shrink-0" :checked="item.present" :disabled="!canManage"
                        @change="marcar(i, $event.target.checked)" />
                    <span class="min-w-0 flex-1 text-sm"
                        :class="item.present ? 'text-ink' : 'text-ink-muted line-through decoration-line'">
                        {{ item.label }}
                    </span>
                    <Badge v-if="item.custom" variant="accent" size="sm">próprio deste stand</Badge>
                    <IconButton v-if="canManage && item.custom" icon="fas fa-trash" size="sm" variant="ghost"
                        :aria-label="`Remover ${item.label}`" @click.prevent="remover(i)" />
                </label>
            </div>

            <EmptyState v-if="!lista.length" size="sm" icon="fas fa-list-check" title="Nenhum item"
                description="Atribua um modelo ao stand para herdar a lista de itens, ou adicione os itens deste stand abaixo." />

            <div v-if="canManage" class="p-4 border-t border-line bg-surface-sunken/40 flex flex-col sm:flex-row gap-2">
                <Input v-model="novo" size="sm" placeholder="Item que este stand tem além do modelo"
                    class="flex-1" @keyup.enter="adicionar" />
                <Button variant="secondary" size="sm" icon="fas fa-plus" @click="adicionar">Adicionar item</Button>
            </div>
        </Surface>
    </div>
</template>

<script setup>
// Aba Itens do stand: a lista do modelo com o que ESTE stand tem e o que não
// tem, mais os itens próprios. O modelo continua sendo a referência da
// categoria — aqui é a realidade de um stand só.
import { ref, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';

import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import IconButton from '@/components/UI/IconButton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const props = defineProps({
    items: { type: Array, default: () => [] },
    modelName: { type: String, default: '' },
    canManage: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
});
const emit = defineEmits(['save']);

const toast = useToast();
const lista = ref([]);
const novo = ref('');

const clonar = () => (props.items || []).map((i) => ({ ...i }));
const original = ref('');

watch(() => props.items, () => {
    lista.value = clonar();
    original.value = JSON.stringify(lista.value);
}, { immediate: true, deep: true });

const presentes = computed(() => lista.value.filter((i) => i.present).length);
const sujo = computed(() => JSON.stringify(lista.value) !== original.value);

function marcar(i, valor) {
    if (!props.canManage) return;
    lista.value[i].present = valor;
}

function adicionar() {
    const label = novo.value.trim();
    if (!label) return;
    if (lista.value.some((i) => i.label.toLowerCase() === label.toLowerCase())) {
        toast.info('Esse item já está na lista.');
        novo.value = '';
        return;
    }
    lista.value.push({ label, present: true, custom: true, from_model: false });
    novo.value = '';
}

function remover(i) {
    lista.value.splice(i, 1);
}

function reverter() {
    lista.value = clonar();
}

function salvar() {
    emit('save', lista.value.map((i) => ({ label: i.label, present: i.present, custom: i.custom })));
}
</script>

<style scoped>
.check {
    width: 1.05rem;
    height: 1.05rem;
    border-radius: 0.25rem;
    accent-color: rgb(var(--accent));
}
</style>
