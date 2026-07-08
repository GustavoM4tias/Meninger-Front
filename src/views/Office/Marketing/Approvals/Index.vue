<template>
    <div class="min-h-[calc(100vh-3.5rem)]">
        <PageContainer size="full">

            <PageHeader icon="fas fa-stamp"
                subtitle="Solicitações do Marketing para a diretoria: verbas, eventos, mídias e serviços com aprovação rápida.">
                <template #title>
                    Aprovações de Marketing
                    <Favorite :router="'/marketing/aprovacoes'" :section="'Aprovações'" />
                </template>
                <template #actions>
                    <Button v-if="store.me.isAdmin" variant="ghost" size="sm" icon="fas fa-sliders-h"
                        @click="$router.push('/marketing/aprovacoes/config')">
                        Configurações
                    </Button>
                    <Button variant="primary" size="sm" icon="fas fa-plus"
                        @click="$router.push('/marketing/aprovacoes/nova')">
                        Nova solicitação
                    </Button>
                </template>
            </PageHeader>

            <!-- Filtros -->
            <Surface variant="raised" padding="md" class="mb-5">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                    <div>
                        <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Status</label>
                        <Select v-model="store.filters.status" :options="statusOptions" placeholder="(Todos)" />
                    </div>
                    <div>
                        <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Tipo</label>
                        <Select v-model="store.filters.type_key" :options="[{ value: '', label: '(Todos)' }, ...store.typeOptions]" placeholder="(Todos)" />
                    </div>
                    <div class="lg:col-span-2">
                        <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Centro de custo</label>
                        <MultiSelector :model-value="ccSelection" @update:modelValue="onCcChange"
                            :options="store.costCenterOptions" placeholder="(Todos)" :page-size="200" single />
                    </div>
                    <div>
                        <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">De</label>
                        <Input v-model="store.filters.from" type="date" />
                    </div>
                    <div>
                        <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Até</label>
                        <Input v-model="store.filters.to" type="date" />
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-3 mt-3">
                    <div class="flex-1 min-w-[220px]">
                        <Input v-model="store.filters.q" placeholder="Buscar por protocolo, descrição ou fornecedor..."
                            @keyup.enter="load" />
                    </div>
                    <Button v-if="store.me.isApprover" :variant="store.filters.mine === 'pending' ? 'primary' : 'secondary'"
                        size="sm" icon="fas fa-user-check" @click="toggleMine">
                        Pendentes de mim
                    </Button>
                    <Button variant="secondary" size="sm" icon="fas fa-magnifying-glass" :loading="store.loading" @click="load">
                        Filtrar
                    </Button>
                </div>

                <Surface v-if="store.error" variant="raised" padding="sm" class="mt-3 border-red-500/30 bg-red-500/10">
                    <div class="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                        <i class="fas fa-circle-exclamation"></i>{{ store.error }}
                    </div>
                </Surface>
            </Surface>

            <!-- Lista -->
            <Surface variant="raised" padding="none" class="overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-line text-left">
                                <th class="px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-muted">Protocolo</th>
                                <th class="px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-muted">Tipo</th>
                                <th class="px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-muted">Solicitante</th>
                                <th class="px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-muted text-right">Valor</th>
                                <th class="px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-muted hidden md:table-cell">Centro de custo</th>
                                <th class="px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-muted hidden md:table-cell">Prazo</th>
                                <th class="px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-muted">Status</th>
                                <th class="px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-muted hidden sm:table-cell">Criada em</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in store.items" :key="item.id"
                                class="border-b border-line/60 hover:bg-surface-sunken/60 cursor-pointer transition-colors"
                                @click="$router.push(`/marketing/aprovacoes/${item.id}`)">
                                <td class="px-4 py-3 font-mono font-semibold text-ink whitespace-nowrap">{{ item.protocol }}</td>
                                <td class="px-4 py-3 text-ink">{{ item.type_label }}</td>
                                <td class="px-4 py-3 text-ink-muted">{{ item.requester?.username || '-' }}</td>
                                <td class="px-4 py-3 text-right font-mono tabular-nums text-ink whitespace-nowrap">{{ fmtBRL(item.amount) }}</td>
                                <td class="px-4 py-3 text-ink-muted hidden md:table-cell">{{ item.cost_center_name || '-' }}</td>
                                <td class="px-4 py-3 text-ink-muted hidden md:table-cell whitespace-nowrap">{{ fmtDate(item.due_date) }}</td>
                                <td class="px-4 py-3">
                                    <Badge :variant="statusMeta(item.status).variant" size="sm">
                                        <i :class="statusMeta(item.status).icon" class="mr-1 text-[10px]"></i>
                                        {{ statusMeta(item.status).label }}
                                    </Badge>
                                </td>
                                <td class="px-4 py-3 text-ink-subtle hidden sm:table-cell whitespace-nowrap">{{ fmtDateTime(item.created_at) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <EmptyState v-if="!store.loading && !store.items.length" icon="fas fa-stamp"
                    title="Nenhuma solicitação encontrada"
                    description="Crie uma nova solicitação ou ajuste os filtros." />
                <div v-if="store.loading" class="py-10 flex justify-center"><Spinner /></div>
            </Surface>

        </PageContainer>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import dayjs from 'dayjs';
import { useApprovalsStore, STATUS_META } from '@/stores/Marketing/Approvals/approvalsStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Select from '@/components/UI/Select.vue';
import Input from '@/components/UI/Input.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Favorite from '@/components/config/Favorite.vue';

const store = useApprovalsStore();

const statusOptions = [
    { value: '', label: '(Todos)' },
    ...Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label })),
];

const ccSelection = ref([]);
function onCcChange(v) {
    const arr = Array.isArray(v) ? v : [];
    ccSelection.value = arr;
    store.filters.cost_center_id = arr.length ? (store.costCenterCodeByOption.get(arr[0]) || '') : '';
    load();
}

function toggleMine() {
    store.filters.mine = store.filters.mine === 'pending' ? '' : 'pending';
    if (store.filters.mine) store.filters.status = 'pending';
    load();
}

const statusMeta = (s) => STATUS_META[s] || STATUS_META.pending;
const fmtBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d) => (d ? dayjs(d).format('DD/MM/YYYY') : '-');
const fmtDateTime = (d) => (d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-');

function load() { store.fetchList(); }

onMounted(async () => {
    await store.fetchMeta();
    await store.fetchList();
});
</script>
