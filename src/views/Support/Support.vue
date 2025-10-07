<template>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div class="max-w-7xl mx-auto px-6 py-8">
            <!-- Header -->
            <div class="mb-8">
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Tickets de Suporte</h1>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Gerencie e acompanhe todos os tickets do sistema
                        </p>
                    </div>
                    <RouterLink :to="{ name: 'Reportar' }"
                        class="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm">
                        <i class="fas fa-plus"></i>
                        <span>Novo Chamado</span>
                    </RouterLink>
                </div>

                <!-- Tabs/Filters -->
                <div class="flex items-center gap-3 overflow-x-auto pb-2">
                    <button v-for="tab in tabs" :key="tab.key" @click="active = tab.key"
                        class="px-5 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all"
                        :class="active === tab.key
                            ? `${tab.color} text-white shadow-md`
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'">
                        {{ tab.label }}
                        <span class="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold"
                            :class="active === tab.key ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'">
                            {{ counts[tab.key] || 0 }}
                        </span>
                    </button>
                </div>
            </div>

            <!-- Tickets Grid -->
            <div class="grid gap-4">
                <div v-for="t in filtered" :key="t.id"
                    class="bg-white dark:bg-gray-800 rounded-xl border-s-4 hover:shadow-lg transition-all overflow-hidden" :class="priorityBorderClass(t.priority)">
                    <div class="p-6">
                        <div class="flex items-start justify-between gap-4 mb-4">
                            <div class="flex-1">
                                <div class="flex items-center gap-3 mb-2">
                                    <span class="text-sm font-mono text-gray-500 dark:text-gray-400">
                                        #{{ t.protocol }}
                                    </span>
                                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                                        :class="priorityClass(t.priority)">
                                        {{ t.priority }}
                                    </span>
                                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold"
                                        :class="statusClass(t.status)">
                                        {{ statusMap[t.status] || t.status }}
                                    </span>
                                </div>
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                    {{ t.title }}
                                </h3>
                                <p v-if="t.description" class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {{ t.description }}
                                </p>
                            </div>

                            <RouterLink :to="{ name: 'Detalhes Suporte', params: { id: t.id } }"
                                class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap">
                                <span>Ver Detalhes</span>
                                <i class="fas fa-arrow-right text-xs"></i>
                            </RouterLink>
                        </div>

                        <!-- Meta Info -->
                        <div class="flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400">
                            <div class="flex items-center gap-2">
                                <i class="fas fa-user"></i>
                                <span>{{ t.requester?.username || 'Usuário' }}</span>
                            </div>
                            <div v-if="t.module" class="flex items-center gap-2">
                                <i class="fas fa-cube"></i>
                                <span class="capitalize">{{ t.module }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i class="fas fa-clock"></i>
                                <span>{{ formatDate(t.created_at) }}</span>
                            </div>
                            <div v-if="t.messages_count > 0" class="flex items-center gap-2">
                                <i class="fas fa-comments"></i>
                                <span>{{ t.messages_count }} mensagens</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-if="!filtered.length"
                    class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <div
                        class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                        <i class="fas fa-inbox text-2xl text-gray-400"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Nenhum chamado encontrado
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        Não há chamados com status "{{tabs.find(t => t.key === active)?.label}}" no momento.
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref, computed, watch } from 'vue';
import { useSupportStore } from '@/stores/Support/supportStore';
import { color } from 'echarts';

const support = useSupportStore();
const active = ref('pending');

const tabs = [
    { key: 'pending', label: 'Pendentes', color: 'bg-orange-500' },
    { key: 'in_progress', label: 'Em Andamento', color: 'bg-yellow-500' },
    { key: 'resolved', label: 'Resolvidos', color: 'bg-emerald-500' },
    { key: 'closed', label: 'Fechados', color: 'bg-red-500' },
];

const statusMap = {
    pending: 'Pendente',
    in_progress: 'Em andamento',
    resolved: 'Resolvido',
    closed: 'Fechado',
};

const counts = support.counts;
const filtered = computed(() => support.list.filter(t => t.status === active.value));

const priorityClass = (priority) => {
    const map = {
        critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
    return map[priority] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
};

const priorityBorderClass = (priority) => {
    const map = {
        critical: 'border-red-300 dark:border-red-600/70 ',
        high: 'border-orange-300 dark:border-orange-600/70',
        medium: 'border-yellow-300 dark:border-yellow-600/70',
        low: 'border-green-300 dark:border-green-600/70',
    };
    return map[priority] || 'border-gray-100  dark:border-gray-700';
};

const statusClass = (status) => {
    const map = {
        pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        closed: 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-400',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
};

const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Agora mesmo';
    if (hours < 24) return `Há ${hours}h`;
    if (hours < 48) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

onMounted(async () => {
    await Promise.all([
        support.fetchCounts(),
        support.fetchTickets({ status: active.value }),
    ]);
});

watch(active, async (st) => {
    await support.fetchTickets({ status: st });
});
</script>