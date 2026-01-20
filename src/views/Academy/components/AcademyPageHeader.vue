<template>
    <div
        class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
        <div class="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div class="min-w-0">
                <nav v-if="breadcrumbs?.length"
                    class="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <template v-for="(b, i) in breadcrumbs" :key="i">
                        <router-link v-if="b.to" :to="b.to"
                            class="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                            {{ b.label }}
                        </router-link>
                        <span v-else class="text-slate-500 dark:text-slate-400">{{ b.label }}</span>

                        <span v-if="i < breadcrumbs.length - 1" class="text-slate-300 dark:text-slate-700">/</span>
                    </template>
                </nav>

                <div class="flex items-center gap-2">
                    <button v-if="backTo"
                        class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        @click="goBack">
                        Voltar
                    </button>

                    <div class="min-w-0">
                        <h1 class="truncate text-base font-semibold text-slate-900 dark:text-white">
                            {{ title }}
                        </h1>
                        <p v-if="subtitle" class="truncate text-sm text-slate-500 dark:text-slate-400">
                            {{ subtitle }}
                        </p>
                    </div>
                </div>
            </div>

            <div v-if="$slots.actions" class="flex flex-col gap-2 md:flex-row md:items-center">
                <slot name="actions" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const props = defineProps({
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    breadcrumbs: { type: Array, default: () => [] },
    backTo: { type: Object, default: null }, // router location object
});

const router = useRouter();

function goBack() {
    if (!props.backTo) return;
    router.push(props.backTo);
}
</script>
