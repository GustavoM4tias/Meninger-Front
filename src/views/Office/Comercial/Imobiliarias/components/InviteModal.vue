<script setup>
// Gera o link público de cadastro: identifica o convite, amarra os
// empreendimentos (só os que o usuário tem acesso) e devolve o link pronto
// para copiar/enviar.

import { computed, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useRealEstateStore } from '@/stores/Comercial/RealEstate/realEstateStore';

import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const LP_HOST = 'https://lp.menin.com.br';

const store = useRealEstateStore();
const toast = useToast();

const label = ref('');
const selectedNames = ref([]);
const creating = ref(false);
const createdUrl = ref('');
const error = ref('');

const enterpriseNames = computed(() => store.enterprises.map(e => e.nome));

watch(() => props.open, (open) => {
    if (open) {
        label.value = '';
        selectedNames.value = [];
        createdUrl.value = '';
        error.value = '';
        store.fetchEnterprises();
    }
});

async function create() {
    error.value = '';
    const ents = store.enterprises.filter(e => selectedNames.value.includes(e.nome));
    if (!ents.length) {
        error.value = 'Selecione ao menos um empreendimento.';
        return;
    }
    creating.value = true;
    try {
        const reg = await store.createInvite({ label: label.value, enterprises: ents });
        createdUrl.value = `${LP_HOST}/imobiliaria/${reg.token}`;
    } catch (err) {
        error.value = err?.message || 'Erro ao gerar o link.';
    } finally {
        creating.value = false;
    }
}

async function copy() {
    try {
        await navigator.clipboard.writeText(createdUrl.value);
        toast.success('Link copiado!');
    } catch {
        toast.error('Não foi possível copiar automaticamente.');
    }
}
</script>

<template>
    <Modal
        :open="open"
        title="Gerar link de cadastro"
        subtitle="Envie o link para o responsável da imobiliária preencher o formulário"
        size="md"
        @close="emit('close')"
    >
        <div v-if="!createdUrl" class="space-y-4">
            <Input
                v-model="label"
                label="Para quem é este link?"
                placeholder="Ex.: Imobiliária do João - Sinop"
                hint="Só para você identificar o convite na lista."
            />
            <MultiSelector
                v-model="selectedNames"
                :options="enterpriseNames"
                label="Empreendimentos"
                placeholder="Selecione os empreendimentos"
                overlay
            />
            <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
        </div>

        <div v-else class="space-y-4">
            <div class="rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-center">
                <i class="fas fa-circle-check text-emerald-500 text-xl"></i>
                <p class="mt-2 text-sm font-medium text-ink">Link gerado!</p>
                <p class="text-xs text-ink-muted">Envie para o responsável da imobiliária. O link é de uso único.</p>
            </div>
            <div class="flex items-center gap-2 rounded-lg border border-line bg-surface-sunken p-2">
                <code class="flex-1 text-xs text-ink-muted break-all">{{ createdUrl }}</code>
                <Button variant="outline" size="sm" icon="fas fa-copy" @click="copy">Copiar</Button>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2">
                <Button variant="ghost" @click="emit('close')">{{ createdUrl ? 'Fechar' : 'Cancelar' }}</Button>
                <Button v-if="!createdUrl" variant="primary" icon="fas fa-link" :loading="creating" @click="create">
                    Gerar link
                </Button>
            </div>
        </template>
    </Modal>
</template>
