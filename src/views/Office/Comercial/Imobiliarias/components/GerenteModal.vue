<script setup>
// Cartão do gerente da imobiliária: dados básicos com atalhos de contato
// (WhatsApp no telefone, mailto no e-mail).

import { computed } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import { whatsappUrl, mailtoUrl } from '@/utils/contactLinks';

const props = defineProps({
    // Linha do relatório (usa os campos gerente_*) ou null para fechado.
    imobiliaria: { type: Object, default: null },
});
const emit = defineEmits(['close']);

const i = computed(() => props.imobiliaria);

const initials = computed(() => {
    const words = String(i.value?.gerente_nome || '').trim().split(/\s+/);
    return ((words[0]?.[0] || '') + (words[1]?.[0] || '')).toUpperCase() || '?';
});

const celular = computed(() => i.value?.gerente_celular || i.value?.gerente_telefone || null);
</script>

<template>
    <Modal :open="!!i" size="sm" @close="emit('close')">
        <template #header>
            <div class="flex items-center gap-3 min-w-0">
                <div class="h-11 w-11 shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center font-semibold">
                    {{ initials }}
                </div>
                <div class="min-w-0">
                    <p class="font-semibold text-ink truncate">{{ i?.gerente_nome || 'Gerente' }}</p>
                    <p class="text-xs text-ink-muted truncate">Gerente · {{ i?.nome }}</p>
                </div>
            </div>
        </template>

        <div v-if="i" class="space-y-2">
            <div v-if="i.gerente_cpf" class="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm">
                <i class="fas fa-id-card text-ink-subtle w-4 text-center"></i>
                <span class="text-ink">{{ i.gerente_cpf }}</span>
            </div>

            <a v-if="i.gerente_email" :href="mailtoUrl(i.gerente_email)"
                class="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm hover:border-accent/60 hover:bg-accent-soft/40 transition-colors group">
                <i class="fas fa-envelope text-ink-subtle w-4 text-center group-hover:text-accent"></i>
                <span class="text-ink truncate flex-1">{{ i.gerente_email }}</span>
                <i class="fas fa-arrow-up-right-from-square text-[10px] text-ink-subtle"></i>
            </a>

            <a v-if="celular" :href="whatsappUrl(celular)" target="_blank" rel="noopener"
                class="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors group">
                <i class="fab fa-whatsapp text-ink-subtle w-4 text-center text-base group-hover:text-emerald-500"></i>
                <span class="text-ink flex-1">{{ celular }}</span>
                <i class="fas fa-arrow-up-right-from-square text-[10px] text-ink-subtle"></i>
            </a>

            <p v-if="!i.gerente_email && !celular && !i.gerente_cpf" class="text-sm text-ink-subtle text-center py-4">
                Sem dados de contato do gerente no CV.
            </p>
        </div>

        <template #footer>
            <div class="flex justify-end">
                <Button variant="ghost" @click="emit('close')">Fechar</Button>
            </div>
        </template>
    </Modal>
</template>
