<template>
    <aside class="w-3/12 h-full overflow-hidden py-4">
        <!-- Cards para mostrar a quantidade de reservas por empreendimento -->
        <div class="cards w-full h-full">
            <h2 class="text-2xl font-semibold ps-2">Reservas X Empreendimentos</h2>
            <div class="overflow-y-auto h-[calc(100%-2rem)] px-2 pt-2 flex flex-col gap-3">
                <div v-for="(count, empreendimento) in porEmpreendimento" :key="empreendimento" @click="$emit('show-reservas-by-empreendimento', empreendimento)">
                    <Card :title="empreendimento" :icon="'fas fa-building'"
                        :class="'!bg-gray-500/15 !border-gray-500/30'" :value="count"
                        :label="`Reservas em ${empreendimento}`" />
                </div>
            </div>
        </div>
    </aside>
</template>

<script setup>
import Card from '@/components/Reports/Reservas/Card.vue';

const props = defineProps({
    porEmpreendimento: {
        type: Object,
        required: true
    }
});

// Define os eventos emitidos pelo componente
defineEmits(['show-reservas-by-empreendimento']);
</script>