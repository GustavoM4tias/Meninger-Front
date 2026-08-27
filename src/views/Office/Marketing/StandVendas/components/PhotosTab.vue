<template>
    <div class="flex flex-col gap-5">
        <Surface v-if="canManage" variant="raised" padding="sm">
            <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                <div class="min-w-0 flex-1">
                    <p class="text-sm text-ink font-medium">Fotos do stand</p>
                    <p class="text-xs text-ink-muted mt-0.5">
                        JPG, PNG ou WEBP até 8 MB. {{ images.length }} de {{ max }} fotos.
                    </p>
                </div>
                <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="escolher" />
                <Button variant="primary" size="sm" icon="fas fa-camera" :loading="saving"
                    :disabled="images.length >= max" @click="fileInput?.click()">
                    Adicionar fotos
                </Button>
            </div>
        </Surface>

        <div v-if="images.length" class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            <Surface v-for="img in images" :key="img.id" variant="raised" padding="none"
                class="overflow-hidden flex flex-col group">
                <button type="button" class="relative block w-full aspect-[4/3] bg-surface-sunken overflow-hidden"
                    @click="abrir(img)">
                    <img :src="img.url" :alt="img.caption || 'Foto do stand'" loading="lazy"
                        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </button>
                <div class="p-2.5 flex items-center gap-2">
                    <p class="text-xs text-ink-muted truncate flex-1">{{ img.caption || 'Sem legenda' }}</p>
                    <IconButton v-if="canManage" icon="fas fa-trash" size="sm" variant="ghost"
                        label="Excluir foto" @click="excluir(img)" />
                </div>
            </Surface>
        </div>

        <Surface v-else variant="raised" padding="none">
            <EmptyState icon="fas fa-images" title="Nenhuma foto"
                :description="canManage
                    ? 'Suba as fotos do stand pronto: elas ficam junto do custo e dos itens, no mesmo lugar.'
                    : 'Ninguém subiu foto deste stand ainda.'" />
        </Surface>

        <!-- Foto em tamanho grande -->
        <Modal :open="!!aberta" size="xl" :title="aberta?.caption || 'Foto do stand'" hide-close
            @close="aberta = null">
            <img v-if="aberta" :src="aberta.url" :alt="aberta.caption || 'Foto do stand'"
                class="w-full max-h-[70vh] object-contain rounded-lg bg-surface-sunken" />
            <template #footer>
                <Button variant="ghost" size="sm" @click="aberta = null">Fechar</Button>
            </template>
        </Modal>
    </div>
</template>

<script setup>
// Aba Fotos: como o stand ficou. O arquivo vai para o bucket e a tela guarda
// só a URL — nada de imagem em base64 no banco.
import { ref } from 'vue';
import { useToast } from 'vue-toastification';
import { pedirConfirmacao } from '@/composables/useConfirm';

import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Modal from '@/components/UI/Modal.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const props = defineProps({
    images: { type: Array, default: () => [] },
    canManage: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
    max: { type: Number, default: 24 },
});
const emit = defineEmits(['upload', 'remove']);

const toast = useToast();
const fileInput = ref(null);
const aberta = ref(null);

function escolher(e) {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    const cabem = props.max - props.images.length;
    if (files.length > cabem) {
        toast.info(`Cabem mais ${cabem} foto${cabem === 1 ? '' : 's'} neste stand. As demais foram ignoradas.`);
    }
    const enviar = files.slice(0, Math.max(0, cabem));
    if (enviar.length) emit('upload', enviar);
}

function abrir(img) {
    aberta.value = img;
}

async function excluir(img) {
    if (!await pedirConfirmacao({
        title: 'Excluir esta foto?',
        consequence: 'A foto sai da tela e o arquivo é apagado do armazenamento. Não há como recuperar depois.',
        confirmLabel: 'Excluir foto',
    })) return;
    emit('remove', img);
}
</script>
