<template>
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('close')"></div>

        <!-- card -->
        <div
            class="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border dark:border-gray-700 flex flex-col">
            <!-- header -->
            <div class="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-700 text-white flex items-center justify-between shrink-0">
                <h3 class="text-lg font-bold flex items-center gap-2">
                    <i class="fas fa-sliders-h"></i>
                    Configurações da Viabilidade
                </h3>
                <button @click="$emit('close')"
                    class="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- body -->
            <div class="p-6 overflow-y-auto">
                <div class="mb-4">
                    <h4 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                        <i class="fas fa-bullhorn text-violet-500"></i>
                        Departamentos que contam como marketing
                    </h4>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                        Marque, dentre os departamentos vindos do Custos, quais devem ser somados como
                        <strong>gasto de marketing</strong> no relatório. Vale para todos os empreendimentos
                        (exceções por empreendimento são configuradas na linha de cada um).
                    </p>
                </div>

                <!-- busca -->
                <div class="relative mb-3">
                    <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                    <input v-model="search" type="text" placeholder="Buscar departamento..."
                        class="w-full h-10 pl-9 pr-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/60 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400/50" />
                </div>

                <p v-if="store.error" class="mb-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                    <i class="fas fa-exclamation-circle mr-1"></i>{{ store.error }}
                </p>

                <div class="flex items-center justify-between mb-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <span>{{ filteredDepartments.length }} departamento(s)</span>
                    <span class="font-semibold text-violet-600 dark:text-violet-400">
                        {{ store.marketingCount }} marcado(s) como marketing
                    </span>
                </div>

                <!-- lista -->
                <div v-if="store.isLoading" class="py-10 text-center text-gray-500 dark:text-gray-400">
                    <i class="fas fa-circle-notch fa-spin mr-2"></i> Carregando departamentos...
                </div>

                <div v-else-if="!filteredDepartments.length" class="py-10 text-center text-gray-500 dark:text-gray-400">
                    <i class="fas fa-inbox text-3xl opacity-40 mb-2 block"></i>
                    <p class="text-sm">Nenhum departamento encontrado nas despesas{{ search ? ' para essa busca' : '' }}.</p>
                </div>

                <div v-else class="space-y-1.5">
                    <label v-for="dept in filteredDepartments" :key="dept"
                        class="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-colors cursor-pointer"
                        :class="store.isMarketing(dept)
                            ? 'border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40'">
                        <span class="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <i class="fas fa-tag text-[10px]"
                                :class="store.isMarketing(dept) ? 'text-violet-500' : 'text-gray-400'"></i>
                            {{ dept }}
                        </span>

                        <!-- switch -->
                        <span class="flex items-center gap-2 shrink-0">
                            <i v-if="store.savingName === dept" class="fas fa-circle-notch fa-spin text-violet-400 text-xs"></i>
                            <button type="button" role="switch" :aria-checked="store.isMarketing(dept)"
                                @click.prevent="toggle(dept)"
                                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                                :class="store.isMarketing(dept) ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-600'">
                                <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                                    :class="store.isMarketing(dept) ? 'translate-x-4' : 'translate-x-0.5'"></span>
                            </button>
                        </span>
                    </label>
                </div>
            </div>

            <!-- footer -->
            <div class="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 flex justify-end shrink-0">
                <button @click="$emit('close')"
                    class="h-10 px-5 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold text-sm hover:opacity-90 transition-opacity">
                    Concluído
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useViabilityAdminStore } from '@/stores/Marketing/Viability/viabilityAdminStore';

const props = defineProps({ open: { type: Boolean, default: false } });
defineEmits(['close']);

const store = useViabilityAdminStore();
const search = ref('');

const filteredDepartments = computed(() => {
    const term = search.value.trim().toLowerCase();
    const list = store.known || [];
    if (!term) return list;
    return list.filter((d) => String(d).toLowerCase().includes(term));
});

async function toggle(dept) {
    const next = !store.isMarketing(dept);
    try {
        await store.setMarketingDepartment(dept, next);
    } catch (e) {
        store.error = e?.message || 'Erro ao salvar.';
    }
}

// Carrega ao abrir
watch(() => props.open, (v) => {
    if (v) {
        search.value = '';
        store.fetchMarketingDepartments();
    }
});
</script>
