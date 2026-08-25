<script setup>
// Modal de informações do colaborador (mesmo espírito do organograma):
// avatar, nome, cargo e contatos (e-mail / WhatsApp).
//
// O slot `acoes` existe para quem chama acrescentar atalhos da PRÓPRIA tela
// sem criar outro modal de pessoa. O Outlook usa isso para "escrever",
// "ver o que já mandou" e "mensagem no Teams" - antes disso havia dois modais
// de pessoa no Office, com layouts diferentes, para a mesma pergunta.
//
// `subtitle` e `badge` permitem dizer algo que só a tela chamadora sabe
// (presença no Teams, "fora da Menin").
import { computed } from 'vue';
import Modal from './Modal.vue';
import UserAvatar from './UserAvatar.vue';

const props = defineProps({
    user: { type: Object, default: null },
    // Linha extra sob o cargo (ex.: "Em reunião no Teams").
    badge: { type: String, default: '' },
    badgeTone: { type: String, default: 'neutral' },   // neutral | pos | neg | warn
});
const emit = defineEmits(['close']);

const u = computed(() => props.user || {});
const name = computed(() => u.value.username || u.value.name || 'Colaborador');
const whatsapp = computed(() => {
    const d = String(u.value.phone || '').replace(/\D/g, '');
    return d ? `https://wa.me/55${d}` : null;
});
</script>

<template>
    <Modal :open="!!user" size="sm" :title="name" @close="emit('close')">
        <div class="flex flex-col items-center text-center">
            <UserAvatar :name="name" :src="u.avatar_url || u.src" :size="64" :ring="false" />
            <h3 class="mt-3 text-base font-semibold text-ink">{{ name }}</h3>
            <p v-if="u.position" class="text-sm text-ink-muted mt-0.5">{{ u.position }}</p>

            <p v-if="badge" class="inline-flex items-center gap-1.5 text-xs mt-1.5"
                :class="{
                    'text-data-pos': badgeTone === 'pos',
                    'text-data-neg': badgeTone === 'neg',
                    'text-data-warn': badgeTone === 'warn',
                    'text-ink-subtle': badgeTone === 'neutral',
                }">
                <span class="w-1.5 h-1.5 rounded-full" :class="{
                    'bg-data-pos': badgeTone === 'pos',
                    'bg-data-neg': badgeTone === 'neg',
                    'bg-data-warn': badgeTone === 'warn',
                    'bg-ink-subtle': badgeTone === 'neutral',
                }"></span>{{ badge }}
            </p>

            <div v-if="u.email || whatsapp" class="mt-4 w-full grid gap-2"
                :class="(u.email && whatsapp) ? 'grid-cols-2' : 'grid-cols-1'">
                <a v-if="u.email" :href="`mailto:${u.email}`"
                    class="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors shadow-soft">
                    <i class="fas fa-envelope text-[11px]"></i> E-mail
                </a>
                <a v-if="whatsapp" :href="whatsapp" target="_blank" rel="noopener noreferrer"
                    class="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors shadow-soft">
                    <i class="fab fa-whatsapp text-sm"></i> WhatsApp
                </a>
            </div>
            <p v-if="u.email" class="text-xs text-ink-subtle mt-3 break-all">{{ u.email }}</p>

            <!-- Atalhos da tela que chamou. Sem isto, cada tela criava o
                 próprio modal de pessoa. -->
            <div v-if="$slots.acoes" class="w-full grid gap-1.5 mt-4 pt-4 border-t border-line">
                <slot name="acoes" />
            </div>
        </div>
    </Modal>
</template>
