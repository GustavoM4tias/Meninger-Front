<script setup>
// Bolinha de avatar do usuário. Gera a imagem pela URL (ui-avatars) a partir do
// nome, igual ao perfil/organograma. Aceita src explícito se houver foto.
import { computed } from 'vue';

const props = defineProps({
    name: { type: String, default: '' },
    src: { type: String, default: '' },
    size: { type: [Number, String], default: 28 },   // px ou xs|sm|md|lg
    ring: { type: Boolean, default: true },           // anel p/ separar no stack
});

const px = computed(() =>
    typeof props.size === 'number'
        ? props.size
        : ({ xs: 20, sm: 24, md: 32, lg: 40, xl: 64 }[props.size] || 28));

const url = computed(() =>
    props.src
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(props.name || '?')}&rounded=true&background=random&bold=true&format=svg&size=96`);
</script>

<template>
    <img :src="url" :alt="name" :title="name" loading="lazy"
        :style="{ width: px + 'px', height: px + 'px' }"
        class="rounded-full object-cover shrink-0 bg-surface-sunken"
        :class="ring ? 'ring-2 ring-surface' : ''" />
</template>
