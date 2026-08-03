<script setup>
// A escolha forçada do item obrigatório.
//
// Reprovar um item marcado como "sem ele o evento não acontece" não pode passar
// calado: sairia um evento aprovado no papel e impossível na prática. Aqui quem
// decide escolhe explicitamente entre derrubar o evento inteiro ou assumir que
// o item era, na verdade, opcional. O servidor recusa qualquer outro caminho.

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';

defineProps({
    open: { type: Boolean, default: false },
    item: { type: Object, default: null },
    event: { type: Object, default: null },
});

const emit = defineEmits(['close', 'reject-event', 'reclassify']);
</script>

<template>
    <Modal :open="open" title="Este item é obrigatório" size="sm" @close="emit('close')">
        <div class="space-y-4">
            <p class="text-sm text-ink">
                <strong>{{ item?.name }}</strong> foi marcado pelo gestor como obrigatório para
                <strong>{{ event?.title }}</strong>. Reprovar só ele deixaria um evento aprovado que não tem
                como acontecer.
            </p>
            <p class="text-sm text-ink-muted">Escolha o que fazer:</p>

            <div class="space-y-2">
                <button
                    class="w-full rounded-lg border border-line p-3 text-left transition hover:border-accent"
                    @click="emit('reject-event')"
                >
                    <p class="font-medium text-ink">Reprovar o evento inteiro</p>
                    <p class="mt-0.5 text-sm text-ink-muted">
                        O evento e todos os itens dele são reprovados juntos.
                    </p>
                </button>

                <button
                    class="w-full rounded-lg border border-line p-3 text-left transition hover:border-accent"
                    @click="emit('reclassify')"
                >
                    <p class="font-medium text-ink">Reclassificar o item como opcional</p>
                    <p class="mt-0.5 text-sm text-ink-muted">
                        O evento segue sem este item. A mudança fica registrada no histórico com seu nome.
                    </p>
                </button>
            </div>
        </div>

        <template #footer>
            <Button variant="ghost" @click="emit('close')">Cancelar</Button>
        </template>
    </Modal>
</template>
