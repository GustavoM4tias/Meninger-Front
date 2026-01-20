<template>
    <router-link :to="to" class="block rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200"
        :class="isActive 
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
            : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'">
        {{ label }}
    </router-link>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps({
    to: { type: Object, required: true },
    label: { type: String, required: true },
    group: { type: String, default: '' }, // 'panel' | 'kb' | 'community' | 'tracks'
});

const route = useRoute();

const isActive = computed(() => {
    const name = String(route.name || '');

    if (props.group === 'panel') return name === 'AcademyPanel';
    if (props.group === 'kb') return name.startsWith('AcademyKB');
    if (props.group === 'community') return name.startsWith('AcademyCommunity');
    if (props.group === 'tracks') return name.startsWith('AcademyTrack') || name === 'AcademyTracks';

    const toName = String(props.to?.name || '');
    return !!toName && name === toName;
});
</script>
