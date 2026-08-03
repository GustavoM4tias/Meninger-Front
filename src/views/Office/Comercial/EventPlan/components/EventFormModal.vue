<script setup>
// Cadastro/edição de um evento proposto.
// O aviso da janela de aprovação aparece aqui, no momento em que o gestor
// escolhe a data: evento nos primeiros dias do mês pode acontecer antes de ser
// decidido, e ele precisa saber disso antes de enviar, não depois.

import { computed, ref, watch } from 'vue';
import { PRIORITY_LABEL } from '@/stores/Comercial/EventPlan/eventPlanStore';

import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    event: { type: Object, default: null },
    referenceMonth: { type: String, default: '' },
    priorityWindowDays: { type: Number, default: 10 },
    saving: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'save']);

const blank = () => ({
    title: '', kind: '', event_date: '', event_end_date: '',
    priority: 'IMPORTANTE', objective: '', expected_audience: '',
});

const form = ref(blank());

watch(() => props.open, (open) => {
    if (!open) return;
    form.value = props.event ? { ...blank(), ...props.event } : blank();
});

const priorityOptions = Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }));

const monthPrefix = computed(() => String(props.referenceMonth || '').slice(0, 7));

const dateOutOfMonth = computed(() => {
    if (!form.value.event_date || !monthPrefix.value) return false;
    return form.value.event_date.slice(0, 7) !== monthPrefix.value;
});

const inPriorityWindow = computed(() => {
    if (!form.value.event_date || dateOutOfMonth.value) return false;
    return Number(form.value.event_date.slice(8, 10)) <= props.priorityWindowDays;
});

function save() {
    emit('save', {
        ...form.value,
        expected_audience: form.value.expected_audience === '' ? null : Number(form.value.expected_audience),
        event_end_date: form.value.event_end_date || null,
    });
}
</script>

<template>
    <Modal :open="open" :title="event ? 'Editar evento' : 'Novo evento'" size="md" @close="emit('close')">
        <div class="space-y-5">
            <Input v-model="form.title" label="Nome do evento" placeholder="Café da manhã Dia dos Pais" required />

            <div class="rounded-xl border border-line bg-surface-sunken p-3">
                <p class="mb-2 text-xs font-medium uppercase tracking-wide text-ink-subtle">Quando acontece</p>
                <div class="grid gap-3 sm:grid-cols-2">
                    <Input v-model="form.event_date" type="date" label="Data" size="sm" required />
                    <Input v-model="form.event_end_date" type="date" label="Data final" size="sm"
                        hint="Só para evento de mais de um dia" />
                </div>
            </div>

            <p v-if="dateOutOfMonth" class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-sm text-amber-700 dark:text-amber-400">
                <i class="fas fa-triangle-exclamation mr-1"></i>
                Esta data está fora do mês do plano. Confira antes de salvar.
            </p>
            <p v-else-if="inPriorityWindow" class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-sm text-amber-700 dark:text-amber-400">
                <i class="fas fa-clock mr-1"></i>
                Este evento acontece nos primeiros dias do mês. A aprovação corre depois do envio e pode se estender por
                esses dias, então ele vai para o topo da fila de quem decide. Vale enviar o plano o quanto antes.
            </p>

            <div class="grid gap-4 sm:grid-cols-2">
                <Select v-model="form.priority" label="Prioridade" :options="priorityOptions"
                    hint="Ajuda quem decide a escolher se o mês estourar" />
                <Input v-model="form.kind" label="Tipo" placeholder="Pedágio, feirão, ação..." />
            </div>

            <Input v-model="form.objective" label="Para que serve"
                placeholder="Captar leads na região do empreendimento" />
            <Input v-model="form.expected_audience" type="number" label="Público estimado" />
        </div>

        <template #footer>
            <Button variant="ghost" @click="emit('close')">Cancelar</Button>
            <Button variant="primary" :loading="saving" :disabled="!form.title || !form.event_date" @click="save">
                Salvar
            </Button>
        </template>
    </Modal>
</template>
