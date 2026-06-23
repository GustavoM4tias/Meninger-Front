<template>
    <!-- Cabeçalho de página no padrão do Office (components/UI/PageHeader.vue):
         tokens semânticos (ink/line/accent/surface) + chip de ícone. Mantém os
         recursos próprios do Academy (breadcrumbs + botão Voltar). -->
    <header class="mb-6 min-w-0">
        <nav v-if="breadcrumbs?.length"
            class="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-subtle">
            <template v-for="(b, i) in breadcrumbs" :key="i">
                <router-link v-if="b.to" :to="b.to" class="transition-colors hover:text-ink">{{ b.label }}</router-link>
                <span v-else>{{ b.label }}</span>
                <span v-if="i < breadcrumbs.length - 1" class="text-line-strong">/</span>
            </template>
        </nav>

        <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div class="flex min-w-0 items-start gap-3">
                <!-- Voltar (recurso do Academy) OU chip de ícone (padrão Office) -->
                <button v-if="backTo" type="button" @click="goBack" title="Voltar"
                    class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-muted transition hover:bg-surface-sunken hover:text-ink">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <div v-else-if="icon"
                    class="hidden h-10 w-10 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent-soft text-accent sm:grid">
                    <i :class="icon"></i>
                </div>

                <div class="min-w-0">
                    <p v-if="eyebrow" class="mb-1 font-mono text-[11px] uppercase tracking-wider text-ink-subtle">
                        {{ eyebrow }}
                    </p>
                    <h1 class="break-words text-lg font-semibold tracking-tight text-ink sm:text-2xl">
                        {{ title }}
                    </h1>
                    <p v-if="subtitle" class="mt-0.5 text-xs text-ink-muted sm:text-sm">{{ subtitle }}</p>
                </div>
            </div>

            <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
                <slot name="actions" />
            </div>
        </div>
    </header>
</template>

<script setup>
import { useRouter } from 'vue-router';

const props = defineProps({
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    breadcrumbs: { type: Array, default: () => [] },
    backTo: { type: Object, default: null }, // router location object
    icon: { type: String, default: '' },     // ex.: 'fas fa-book-open' (chip)
    eyebrow: { type: String, default: '' },
});

const router = useRouter();

function goBack() {
    if (!props.backTo) return;
    router.push(props.backTo);
}
</script>
