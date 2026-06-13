<template>
    <router-link :to="to" :title="collapsed ? label : undefined" :class="[
        'group relative flex h-11 items-center rounded-xl px-3 transition-all duration-150',
        collapsed ? 'justify-center' : '',
        isActive
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
    ]">
        <!-- barra de acento (ativo) -->
        <span v-if="isActive"
            class="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-indigo-500"
            aria-hidden="true"></span>

        <span class="inline-flex h-6 w-6 shrink-0 items-center justify-center transition-colors" :class="isActive
            ? 'text-indigo-600 dark:text-indigo-300'
            : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'" aria-hidden="true">
            <slot name="icon" />
        </span>

        <span v-if="!collapsed" class="ml-2.5 truncate text-sm font-medium">
            {{ label }}
        </span>
    </router-link>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const props = defineProps({
    to: { type: [Object, String], required: true },
    label: { type: String, required: true },
    collapsed: { type: Boolean, default: false }
});

const route = useRoute();
const router = useRouter();

function normalize(path) {
    if (!path) return '/';
    return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

const isActive = computed(() => {
    const target = router.resolve(props.to);
    const targetPath = normalize(target.path);
    const currentPath = normalize(route.path);
    if (currentPath === targetPath) return true;
    return currentPath.startsWith(targetPath + '/');
});
</script>
