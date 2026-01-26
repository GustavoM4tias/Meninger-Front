<template>
    <Teleport to="body">
        <Transition name="fade">
            <div v-if="show"
                class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/25 backdrop-blur-sm px-4"
                @click.self="$emit('close')">
                <div
                    class="relative bg-gray-200 dark:bg-gray-800 m-4 p-4 md:p-6 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-auto shadow-xl">
                    <i class="fas fa-xmark text-3xl absolute right-4 top-4 cursor-pointer text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
                        @click="$emit('close')"></i>

                    <h2 class="text-2xl font-bold mb-1 text-gray-800 dark:text-white">
                        {{ item.cliente }}
                    </h2>
                    <p class="text-gray-500 dark:text-gray-300 mb-2 text-sm">
                        {{ item.empreendimento }}
                    </p>

                    <div class="flex justify-between items-center text-xs text-gray-400 mb-4">
                        <span>{{ item.tokensUsed }} tokens (modelo: {{ item.model }})</span>
                        <span>{{ new Date(item.createdAt).toLocaleString() }}</span>
                    </div>

                    <div class="mb-6">
                        <span class="font-semibold text-sm px-3 py-1 rounded-full" :class="statusBadge(item.status)">
                            {{ item.status }}
                        </span>
                    </div>

                    <div v-if="item.mensagens?.length">
                        <h3 class="text-lg font-bold text-gray-700 dark:text-white mb-3">📋 Detalhes</h3>
                        <div class="space-y-3">
                            <div v-for="(msg, i) in item.mensagens" :key="i" class="p-3 rounded-lg border-l-4 shadow-sm"
                                :class="messageStyle(msg.nivel)">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <h4 class="font-semibold text-gray-700 dark:text-gray-200 mb-1">
                                            {{ iconByNivel(msg.nivel) }} {{ msg.tipo }}
                                        </h4>
                                        <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                            {{ msg.descricao }}
                                        </p>
                                    </div>
                                    <span class="text-xs font-semibold rounded px-2 py-1 h-fit"
                                        :class="badgeStyle(msg.nivel)">
                                        {{ msg.nivel.toUpperCase() }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-else class="text-sm text-gray-600 dark:text-gray-300 mt-4">
                        Nenhuma mensagem encontrada.
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup>
defineProps({
    show: Boolean,
    item: Object
});

defineEmits(['close']);

const statusBadge = (status) => {
    switch (status) {
        case 'APROVADO':
            return 'bg-green-100 text-green-800';
        case 'REPROVADO':
            return 'bg-red-100 text-red-800';
        case 'ERRO':
            return 'bg-yellow-100 text-yellow-800';
        default:
            return 'bg-gray-100 text-gray-700';
    }
};

const badgeStyle = (nivel) => {
    switch (nivel) {
        case 'correto':
            return 'bg-green-200 text-green-800';
        case 'alerta':
            return 'bg-yellow-200 text-yellow-800';
        case 'incorreto':
            return 'bg-red-200 text-red-800';
        default:
            return 'bg-gray-200 text-gray-800';
    }
};

const messageStyle = (nivel) => {
    switch (nivel) {
        case 'correto':
            return 'border-green-400 bg-green-50 dark:bg-green-900/30';
        case 'alerta':
            return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30';
        case 'incorreto':
            return 'border-red-400 bg-red-50 dark:bg-red-900/30';
        default:
            return 'border-gray-400 bg-gray-50 dark:bg-gray-700';
    }
};

const iconByNivel = (nivel) => {
    switch (nivel) {
        case 'correto':
            return '✅';
        case 'alerta':
            return '⚠️';
        case 'incorreto':
            return '❌';
        default:
            return 'ℹ️';
    }
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
