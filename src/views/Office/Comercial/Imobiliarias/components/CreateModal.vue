<script setup>
// Cadastro interno: o próprio usuário Office preenche o formulário completo
// (com apoio do cartão CNPJ) e o cadastro roda no CV na hora.

import { computed, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useRealEstateStore } from '@/stores/Comercial/RealEstate/realEstateStore';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import RealEstateForm from '@/components/RealEstate/RealEstateForm.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const store = useRealEstateStore();
const toast = useToast();

const selectedNames = ref([]);
const submitting = ref(false);
const serverError = ref('');
const formKey = ref(0);

const enterpriseNames = computed(() => store.enterprises.map(e => e.nome));

watch(() => props.open, (open) => {
    if (open) {
        selectedNames.value = [];
        serverError.value = '';
        formKey.value++;   // zera o formulário a cada abertura
        store.fetchEnterprises();
    }
});

const parseCard = (file) => store.parseCnpjCard(file);

async function onSubmit(form) {
    serverError.value = '';
    const ents = store.enterprises.filter(e => selectedNames.value.includes(e.nome));
    if (!ents.length) {
        serverError.value = 'Selecione ao menos um empreendimento.';
        return;
    }
    submitting.value = true;
    try {
        await store.createRegistration({ form, enterprises: ents });
        toast.success('Imobiliária cadastrada no CV com sucesso!');
        emit('close');
    } catch (err) {
        serverError.value = err?.message || 'Erro ao cadastrar a imobiliária.';
    } finally {
        submitting.value = false;
    }
}
</script>

<template>
    <Modal
        :open="open"
        title="Nova imobiliária"
        subtitle="Cadastro direto no CV"
        size="lg"
        position="right"
        scrollable
        @close="emit('close')"
    >
        <div class="space-y-6">
            <MultiSelector
                v-model="selectedNames"
                :options="enterpriseNames"
                label="Empreendimentos"
                placeholder="Selecione os empreendimentos da imobiliária"
                overlay
            />
            <RealEstateForm
                :key="formKey"
                :parse-card="parseCard"
                :submitting="submitting"
                :server-error="serverError"
                submit-label="Cadastrar no CV"
                @submit="onSubmit"
            />
        </div>
    </Modal>
</template>
