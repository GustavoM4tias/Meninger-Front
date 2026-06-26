<script setup>
// Modal de informações do colaborador (mesmo espírito do organograma):
// avatar, nome, cargo e contatos (e-mail / WhatsApp).
import { computed } from 'vue';
import Modal from './Modal.vue';
import UserAvatar from './UserAvatar.vue';

const props = defineProps({ user: { type: Object, default: null } });
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
        </div>
    </Modal>
</template>
