<script setup>
// Gera o link de auto-cadastro: a correspondente preenche a própria equipe e
// os usuários entram no CV sozinhos, sem ninguém do Office redigitar.
//
// O link é reutilizável de propósito - correspondente manda gente em levas.
// Quem controla o fim é o prazo opcional ou o cancelamento.

import { computed, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useCorrespondentStore } from '@/stores/Comercial/Correspondents/correspondentStore';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';

const props = defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(['close']);

const store = useCorrespondentStore();
const toast = useToast();

const LP_BASE = import.meta.env.VITE_LP_URL || 'https://lp.menin.com.br';

const empresaId = ref('');
const label = ref('');
const expiraEm = ref('');
const criado = ref(null);

const empresaOptions = computed(() =>
    store.empresasVinculadas.map(e => ({
        value: String(e.id),
        label: `${e.nome}${e.cidade ? ` - ${e.cidade}` : ''} (#${e.cv_idempresa})`,
    })));

const semEmpresa = computed(() => !empresaOptions.value.length);
const linkCriado = computed(() => (criado.value ? `${LP_BASE}/correspondente/${criado.value.token}` : ''));

watch(() => props.open, (aberto) => {
    if (!aberto) return;
    empresaId.value = empresaOptions.value.length === 1 ? empresaOptions.value[0].value : '';
    label.value = '';
    expiraEm.value = '';
    criado.value = null;
    if (!store.empresas.length) store.fetchOverview();
});

async function gerar() {
    if (!empresaId.value) return toast.error('Escolha a empresa.');
    try {
        criado.value = await store.createInvite({
            company_id: Number(empresaId.value),
            label: label.value || null,
            expires_at: expiraEm.value || null,
        });
        toast.success('Link gerado!');
    } catch (err) {
        toast.error(err?.message || 'Não foi possível gerar o link.');
    }
}

async function copiar() {
    try {
        await navigator.clipboard.writeText(linkCriado.value);
        toast.success('Link copiado!');
    } catch {
        toast.error('Não consegui copiar. Selecione e copie manualmente.');
    }
}
</script>

<template>
    <Modal :open="open" size="lg" title="Gerar link de cadastro" @close="emit('close')">
        <div v-if="semEmpresa" class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-ink">
            <p class="font-medium mb-1"><i class="fas fa-triangle-exclamation mr-1.5 text-amber-500"></i>Nenhuma empresa pronta</p>
            <p class="text-ink-muted">
                O link é sempre amarrado a uma empresa com código do CV vinculado.
                Cadastre a empresa e informe o código antes de gerar.
            </p>
        </div>

        <template v-else-if="!criado">
            <Select v-model="empresaId" :options="empresaOptions" label="Empresa correspondente"
                placeholder="Escolha a empresa" required class="mb-3" />
            <Input v-model="label" label="Identificação do link" placeholder="Ex.: Equipe Premium - agosto"
                hint="Só para você reconhecer o link depois. Se deixar vazio, usa o nome da empresa." class="mb-3" />
            <Input v-model="expiraEm" type="date" label="Válido até (opcional)"
                hint="Depois desta data o link para de funcionar. Vazio = sem prazo." />
        </template>

        <template v-else>
            <p class="text-sm text-ink-muted mb-3">
                Envie este link para o responsável da correspondente. Ele preenche a equipe e os cadastros
                entram no CV automaticamente - você acompanha o resultado na aba Cadastros.
            </p>
            <div class="flex items-center gap-2 rounded-xl border border-line bg-surface-sunken/50 px-3 py-2.5 mb-3">
                <i class="fas fa-link text-ink-subtle"></i>
                <span class="min-w-0 flex-1 truncate text-sm text-ink font-mono">{{ linkCriado }}</span>
                <Button variant="secondary" size="sm" icon="fas fa-copy" @click="copiar">Copiar</Button>
            </div>
            <p class="text-xs text-ink-subtle">
                O link continua valendo para vários envios. Para encerrar antes do prazo, cancele na aba Cadastros.
            </p>
        </template>

        <template #footer>
            <template v-if="semEmpresa">
                <Button variant="primary" @click="emit('close')">Entendi</Button>
            </template>
            <template v-else-if="!criado">
                <Button variant="ghost" @click="emit('close')">Cancelar</Button>
                <Button variant="primary" icon="fas fa-link" :loading="store.saving" @click="gerar">Gerar link</Button>
            </template>
            <template v-else>
                <Button variant="primary" @click="emit('close')">Fechar</Button>
            </template>
        </template>
    </Modal>
</template>
