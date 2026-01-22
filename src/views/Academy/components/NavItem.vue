<template>
    <router-link :to="to" :class="[
        'w-full rounded-xl px-3 py-2 text-sm font-medium transition-colors',
        'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
        'flex items-center h-10',
        collapsed ? 'justify-center px-3' : 'gap-2',
        isActive ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : ''
    ]">
        <span class="inline-flex h-6 w-6 items-center justify-center shrink-0" aria-hidden="true">
            <slot name="icon" />
        </span>

        <span v-if="!collapsed" class="truncate">
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
    // remove trailing slash (exceto "/")
    return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

const isActive = computed(() => {
    const target = router.resolve(props.to);
    const targetPath = normalize(target.path);
    const currentPath = normalize(route.path);

    // ativo se:
    // - exatamente igual
    // - OU rota atual começa com "targetPath/" (filhas)
    if (currentPath === targetPath) return true;
    return currentPath.startsWith(targetPath + '/');
});
</script>
