<script setup>
// Bolinhas alinhadas (sobrepostas) p/ 1+ pessoas. Clique emite o usuário
// (abre um modal de info no pai). Mostra "+N" quando passa do limite.
import { computed } from 'vue';
import UserAvatar from './UserAvatar.vue';

const props = defineProps({
    users: { type: Array, default: () => [] },        // [{ id, username|name, ... }]
    size: { type: [Number, String], default: 28 },
    max: { type: Number, default: 4 },
    clickable: { type: Boolean, default: true },
});
const emit = defineEmits(['select']);

const shown = computed(() => (props.users || []).slice(0, props.max));
const extra = computed(() => Math.max(0, (props.users || []).length - props.max));
const px = computed(() =>
    typeof props.size === 'number'
        ? props.size
        : ({ xs: 20, sm: 24, md: 32, lg: 40, xl: 64 }[props.size] || 28));
</script>

<template>
    <div v-if="(users || []).length" class="flex items-center">
        <button v-for="(u, i) in shown" :key="u.id || i" type="button"
            :class="['relative rounded-full transition-transform', i > 0 ? '-ml-2' : '', clickable ? 'hover:scale-110 hover:z-10 focus:z-10 focus:outline-none' : 'cursor-default']"
            :style="{ zIndex: shown.length - i }"
            @click.stop="clickable && emit('select', u)">
            <UserAvatar :name="u.username || u.name" :src="u.avatar_url || u.src" :size="size" />
        </button>
        <span v-if="extra"
            class="-ml-2 grid place-items-center rounded-full bg-surface-sunken text-ink-muted text-[10px] font-semibold ring-2 ring-surface"
            :style="{ width: px + 'px', height: px + 'px' }">+{{ extra }}</span>
    </div>
</template>
