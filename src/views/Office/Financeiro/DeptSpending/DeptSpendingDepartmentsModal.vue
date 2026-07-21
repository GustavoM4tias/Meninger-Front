<template>
    <Modal :open="open" size="lg" title="Departamentos acompanhados"
        subtitle="Quais despesas do Custos são somadas como gasto acompanhado nesta tela" @close="$emit('close')">
        <div>
            <p class="text-xs text-ink-muted mb-3">
                Marque os departamentos cujo gasto deve ser <strong>acompanhado</strong>. Vale para todos os
                empreendimentos - exceções por empresa ficam na engrenagem de cada linha do relatório.
                <span class="text-ink-subtle">Na Fase 1 o orçamento é calculado sobre o Marketing.</span>
            </p>

            <Input v-model="search" icon-left="fas fa-search" placeholder="Buscar departamento..." class="mb-3" />

            <div class="flex items-center justify-between mb-2 text-[11px] text-ink-subtle">
                <span class="font-mono tabular-nums">{{ filtered.length }} departamento(s)</span>
                <Badge variant="accent" size="sm">{{ store.marketingCount }} marcado(s)</Badge>
            </div>

            <div v-if="store.isLoading" class="py-10 text-center text-ink-muted text-sm">
                <i class="fas fa-circle-notch fa-spin mr-2"></i> Carregando departamentos...
            </div>

            <EmptyState v-else-if="!filtered.length" size="sm" icon="fas fa-inbox" title="Nenhum departamento"
                :description="search ? 'Nada para essa busca.' : 'Nenhum departamento encontrado nas despesas ainda.'" />

            <div v-else class="space-y-1.5">
                <label v-for="d in filtered" :key="d"
                    class="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer"
                    :class="store.isMarketing(d) ? 'border-accent/30 bg-accent-soft/40' : 'border-line hover:bg-surface-hover/40'">
                    <span class="text-sm text-ink flex items-center gap-2">
                        <i class="fas fa-tag text-[10px]" :class="store.isMarketing(d) ? 'text-accent' : 'text-ink-subtle'"></i>
                        {{ d }}
                    </span>
                    <span class="flex items-center gap-2 shrink-0">
                        <i v-if="store.savingName === d" class="fas fa-circle-notch fa-spin text-accent text-xs"></i>
                        <button type="button" role="switch" :aria-checked="store.isMarketing(d)" @click.prevent="toggle(d)"
                            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                            :class="store.isMarketing(d) ? 'bg-accent' : 'bg-surface-sunken border border-line'">
                            <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                                :class="store.isMarketing(d) ? 'translate-x-4' : 'translate-x-0.5'"></span>
                        </button>
                    </span>
                </label>
            </div>

            <p v-if="store.error" class="mt-3 text-sm text-red-600 dark:text-red-400">
                <i class="fas fa-circle-exclamation mr-1"></i>{{ store.error }}
            </p>
        </div>

        <template #footer>
            <Button variant="primary" @click="$emit('close')">Concluído</Button>
        </template>
    </Modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useDeptSpendingAdminStore } from '@/stores/Financeiro/DeptSpending/deptSpendingAdminStore';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const props = defineProps({ open: { type: Boolean, default: false } });
defineEmits(['close']);

const store = useDeptSpendingAdminStore();
const search = ref('');

const filtered = computed(() => {
    const t = search.value.trim().toLowerCase();
    const list = store.known || [];
    return t ? list.filter((d) => String(d).toLowerCase().includes(t)) : list;
});

async function toggle(d) {
    try {
        await store.setMarketingDepartment(d, !store.isMarketing(d));
    } catch (e) {
        store.error = e?.message || 'Erro ao salvar.';
    }
}

watch(() => props.open, (v) => {
    if (v) {
        search.value = '';
        store.fetchMarketingDepartments();
    }
});
</script>
