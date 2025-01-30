<template>
    <div>
        <p>Reservas: {{ reservaStore.total }}</p>
        <p v-if="erro">Erro: {{ erro }}</p>
        <LoadingComponents v-if="carregando" />
        <div v-else class="w-full grid px-5" :style="{ gridTemplateColumns: `repeat(${numeroDeColunas}, 1fr)` }">
            <!-- Filtra as chaves com reservas -->
            <ul v-for="(situacao, key) in reservasFiltradas" :key="key">
                <p v-if="situacao.length > 0" :class="{
                    'bg-blue-400': key === '1',
                    'bg-emerald-400': key === '12',
                    'bg-red-400': key === '20', 
                    'bg-orange-400': key === '15',
                    'bg-yellow-400': key === '16',
                    'bg-green-400': key === '21',
                    'bg-sky-400': key === '22'
                }" class="text-black font-bold text-center py-6 mx-1 truncate clip scale-[110%]">
                    {{ situacao[0].situacao_nome }} - {{ key }}
                </p>

                <!-- Exibe as reservas dentro da situação -->
                <li class="mb-5 bg-gray-700 m-1" v-for="(reserva, index) in situacao" :key="index">
                    Nome: {{ reserva.titular.nome }}<br>
                    Empreendimento: {{ reserva.unidade.empreendimento }} | {{ reserva.unidade.etapa }} | {{
                        reserva.unidade.unidade }}<br>
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watchEffect } from 'vue';
import { useReservaStore } from '../../../stores/reservasStore';
import LoadingComponents from '../../Loading/LoadingComponents.vue';

const reservaStore = useReservaStore();
const carregando = computed(() => reservaStore.carregando);

onMounted(async () => {
    if (Object.values(reservaStore.reservas).every(situacao => situacao.length === 0)) {
        await reservaStore.carregarTodasReservas();
    }
});

// Filtra as chaves com reservas não vazias
const reservasFiltradas = computed(() => {
    return Object.fromEntries(
        Object.entries(reservaStore.reservas).filter(([key, situacao]) => situacao.length > 0)
    );
});
// Define o número de colunas para o grid
const numeroDeColunas = computed(() => {
    return Math.max(Object.keys(reservasFiltradas.value).length, 1); // Garantir pelo menos 1 coluna
});


watchEffect(() => {
    console.log('Reservas carregadas:', reservaStore.reservas);
});

const reservas = computed(() => reservaStore.reservas);
const erro = computed(() => reservaStore.erro);
</script>

<style scoped>
.clip {
    clip-path: polygon(95% 50%, 90% 90%, 0% 90%, 5% 50%, 0% 10%, 90% 10%); 
}
</style>