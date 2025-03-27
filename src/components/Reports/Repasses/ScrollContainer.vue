<template>
    <div ref="scrollContainer" class="overflow-auto flex flex-nowrap gap-4 select-none" @mousedown="startDrag"
        @mousemove="onDrag" @mouseup="stopDrag" @mouseleave="stopDrag">
        <div v-for="status in orderedStatuses" :key="status.idsituacao || status.nome"
            class="min-w-[300px] rounded-lg p-4 shadow-md mb-8"
            :style="{ backgroundColor: status.cor_bg || '#ffffff' }">
            <div class="title mb-2">
                <h2 class="text-xl font-semibold text-center truncate" :style="{ color: status.cor_nome || '#000000' }">
                    {{ status.nome }}
                </h2>
                <p class="text-xs text-center" :style="{ color: status.cor_nome || '#000000' }">
                    {{ repassesByStatus[status.nome]?.length || 0 }} Contratos
                </p>
            </div>
            <!-- SE NÃO HÁ REPASSES NESSE STATUS -->
            <div v-if="!repassesByStatus[status.nome] || repassesByStatus[status.nome].length === 0"
                class="text-sm text-gray-300 text-center">
                Nenhum repasse neste status
            </div>

            <!-- LISTA DE REPASSES -->
            <div v-else>
                <repasse-card v-for="repasse in paginatedRepasses(status.nome)" :key="repasse.ID" :repasse="repasse"
                    :expandedDetails="expandedDetails" :status="status" @toggle-details="toggleDetails"
                    :timeDifference="timeDifference" :formatMoney="formatMoney" />

                <!-- Botão "Carregar mais" -->
                <div v-if="hasMoreRepasses(status.nome)" class="flex mt-4">
                    <!-- Botão sobreposto -->
                    <button @click="loadMoreRepasses(status.nome)"
                        class="m-auto px-4 py-1 text-white border border-white rounded-md bg-gray-900/5 hover:bg-gray-900/10 cursor-pointer">
                        Carregar mais
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import RepasseCard from '@/components/Reports/Repasses/RepasseCard.vue';

const props = defineProps({
    orderedStatuses: {
        type: Array,
        required: true
    },
    repassesByStatus: {
        type: Object,
        required: true
    },
    paginatedRepasses: {
        type: Function,
        required: true
    },
    hasMoreRepasses: {
        type: Function,
        required: true
    },
    loadMoreRepasses: {
        type: Function,
        required: true
    },
    expandedDetails: {
        type: Object,
        required: true
    },
    toggleDetails: {
        type: Function,
        required: true
    },
    timeDifference: {
        type: Function,
        required: true
    },
    formatMoney: {
        type: Function,
        required: true
    }
});

// Funções para scroll "PRESS AND PUSH"
const isDragging = ref(false);
const startX = ref(0);
const scrollLeft = ref(0);
const scrollContainer = ref(null);

const startDrag = (e) => {
    // Verificar se o clique foi em um botão
    if (e.target.tagName === 'BUTTON') {
        return;
    }

    isDragging.value = true;
    startX.value = e.pageX - scrollContainer.value.offsetLeft;
    scrollLeft.value = scrollContainer.value.scrollLeft;
};

const onDrag = (e) => {
    if (!isDragging.value) return;
    e.preventDefault();
    const x = e.pageX - scrollContainer.value.offsetLeft;
    const walk = (x - startX.value) * 2;
    scrollContainer.value.scrollLeft = scrollLeft.value - walk;
};

const stopDrag = () => {
    isDragging.value = false;
};
</script>