<script setup>
// Cadastro interno: o próprio usuário Office preenche o formulário completo
// (com apoio do cartão CNPJ) e o cadastro roda no CV na hora.

import { computed, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useRealEstateStore } from '@/stores/Comercial/RealEstate/realEstateStore';
import { useEnterpriseCatalog } from '@/composables/useEnterpriseCatalog';

import Modal from '@/components/UI/Modal.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import RealEstateForm from '@/components/RealEstate/RealEstateForm.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const store = useRealEstateStore();
const toast = useToast();
const catalogo = useEnterpriseCatalog();

// A escolha guarda o ID do empreendimento (o nome muda; o id não). O rótulo
// é o nome atual do catálogo, com o nome vindo de /cv/empreendimentos de
// fallback. Ordenado por id.
const selectedIds = ref([]);
const submitting = ref(false);
const serverError = ref('');
const formKey = ref(0);

const enterpriseOptions = computed(() => catalogo.opcoes(store.enterprises));

watch(() => props.open, (open) => {
    if (open) {
        selectedIds.value = [];
        serverError.value = '';
        formKey.value++;   // zera o formulário a cada abertura
        catalogo.load().catch(() => {});
        store.fetchEnterprises();
    }
});

const parseCard = (file) => store.parseCnpjCard(file);

async function onSubmit(form) {
    serverError.value = '';
    const ids = new Set(selectedIds.value.map(Number));
    const ents = store.enterprises.filter(e => ids.has(Number(e.id)));
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
                v-model="selectedIds"
                :options="enterpriseOptions"
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
