<template>
    <div
        class="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/10 p-5">
        <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <i class="fa-solid fa-lock text-amber-600 dark:text-amber-400"></i>
            </div>
            <div class="min-w-0">
                <h3 class="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Trilha bloqueada
                </h3>
                <p class="mt-0.5 text-sm text-amber-800/80 dark:text-amber-300/70">
                    Para liberar esta trilha, conclua antes:
                </p>
                <ul class="mt-2 space-y-1.5">
                    <li v-for="(b, i) in blockedBy" :key="b.slug || `restricted-${i}`"
                        class="flex items-center justify-between gap-3 rounded-xl bg-white/70 dark:bg-slate-900/40 px-3 py-2">
                        <div class="min-w-0">
                            <div class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                <i v-if="b.restricted" class="fa-solid fa-lock mr-1 text-[10px] opacity-60"></i>
                                {{ b.title || b.slug || 'Conteúdo restrito' }}
                            </div>
                            <div class="text-xs text-slate-500 dark:text-slate-400">
                                {{ b.policy === 'LENIENT' ? 'Precisa ter iniciado' : 'Precisa estar 100% concluída' }}
                                <span v-if="b.userProgressPercent != null"> • você está em {{ b.userProgressPercent }}%</span>
                            </div>
                        </div>
                        <!-- Pré-requisito fora do seu público: sem link (fale com seu gestor). -->
                        <button v-if="b.slug" type="button"
                            class="shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            @click="$emit('open', b.slug)">
                            Ir para a trilha
                        </button>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script setup>
defineProps({
    blockedBy: { type: Array, default: () => [] },
});
defineEmits(['open']);
</script>
