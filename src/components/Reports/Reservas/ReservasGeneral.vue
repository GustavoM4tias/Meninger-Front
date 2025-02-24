<script setup>
import { ref, computed, watch } from 'vue';
import { useReservaStore } from '../../../stores/Reservation/reservationStore';
import LoadingComponents from '../../Loading/LoadingComponents.vue';

const reservaStore = useReservaStore();
const carregando = computed(() => reservaStore.carregando);
const erro = computed(() => reservaStore.erro);

// Lista de empreendimentos conforme sua lista:
const empreendimentos = ref([
  { id: '', nome: 'Selecione um empreendimento' },
  { id: '31', nome: 'RESIDENCIAL JARDIM DAS ROSAS' },
  { id: '30', nome: 'MOOV ESMERALDAS' },
  { id: '29', nome: 'TERRAS DE SÃO PAULO 5' },
  { id: '26', nome: 'RESIDENCIAL JARDIM MONACO' },
  { id: '25', nome: 'JARDIM DOS BURITIS MOD III - IV' },
  { id: '24', nome: 'JARDIM MARINA FASE 3' },
  { id: '23', nome: 'RESIDENCIAL TRES MARIAS' },
  { id: '22', nome: 'RESIDENCIAL PARQUE DOS IPÊS' },
  { id: '21', nome: 'RESIDENCIAL URBAN ESMERALDAS' },
  { id: '20', nome: 'RESIDENCIAL ADHARA STAR CLUB' },
  { id: '19', nome: 'RESIDENCIAL RESERVA ALTOS DO BOSQUE' },
  { id: '18', nome: 'JARDIM DOS BURITIS MOD I - II' },
  { id: '17', nome: 'EDIFÍCIO CONCEPT' },
  { id: '16', nome: 'TERRAS DE SÃO PAULO' },
  { id: '14', nome: 'EDIFICIO LONDON RESIDENCE' },
  { id: '13', nome: 'EDIFICIO SOUL' },
  { id: '12', nome: 'RESIDENCIAL MAIA STAR CLUB' },
  { id: '11', nome: 'RESIDENCIAL WISH' },
  { id: '10', nome: 'RESIDENCIAL MOND' },
  { id: '9',  nome: 'RESIDENCIAL DRUMOND' },
  { id: '2',  nome: 'BOULEVARD PARK & RESORT LTDA' },
]);

// Inicialmente, nenhuma opção é selecionada (valor vazio)
const selectedEmpreendimento = ref('');

// Sempre que o empreendimento selecionado mudar (e não for vazio), carrega as reservas
watch(selectedEmpreendimento, async (novoId) => {
  if (novoId) {
    // Se ainda não houver reservas para esse empreendimento, carrega-as
    if (!reservaStore.reservas[novoId] || reservaStore.reservas[novoId].length === 0) {
      await reservaStore.carregarReservas(novoId);
    }
  }
});

// Computa as reservas do empreendimento selecionado
const reservasSelecionadas = computed(() => {
  return reservaStore.reservas[selectedEmpreendimento.value] || [];
});

// Agrupa as reservas por situação (usando o campo "idsituacao")
const reservasPorSituacao = computed(() => {
  const groups = {};
  reservasSelecionadas.value.forEach((reserva) => {
    const key = reserva.situacao.idsituacao;
    if (!groups[key]) {
      groups[key] = {
        situacao: reserva.situacao.situacao,
        reservas: []
      };
    }
    groups[key].reservas.push(reserva);
  });
  return groups;
});

// Número de colunas baseadas nas situações distintas
const numeroDeColunas = computed(() => {
  return Object.keys(reservasPorSituacao.value).length || 1;
});
</script>

<template>
  <div class="container mx-auto p-4">
    <!-- Select para escolher o empreendimento -->
    <div class="mb-4">
      <label for="empreendimentoSelect" class="block font-bold mb-2">
        Selecione o Empreendimento:
      </label>
      <select
        id="empreendimentoSelect"
        v-model="selectedEmpreendimento"
        class="border p-2 rounded w-full md:w-1/2"
      >
        <option
          v-for="option in empreendimentos"
          :key="option.id"
          :value="option.id"
        >
          {{ option.nome }} <span v-if="option.id"> (ID: {{ option.id }})</span>
        </option>
      </select>
    </div>

    <!-- Exibe total de reservas e mensagem de erro -->
    <p class="mb-2">Total de Reservas: {{ reservaStore.total }}</p>
    <p v-if="erro" class="text-red-500">Erro: {{ erro }}</p>
    <LoadingComponents v-if="carregando" />

    <!-- Grid: uma coluna para cada situação -->
    <div
      v-if="selectedEmpreendimento"
      class="w-full grid gap-4 px-5"
      :style="{ gridTemplateColumns: `repeat(${numeroDeColunas}, 1fr)` }"
    >
      <template v-if="Object.keys(reservasPorSituacao).length > 0">
        <div
          v-for="(group, key) in reservasPorSituacao"
          :key="key"
          class="bg-gray-800 p-4 rounded"
        >
          <div class="bg-blue-400 text-black font-bold text-center py-3 mb-2 rounded">
            Situação: {{ group.situacao }} ({{ group.reservas.length }})
          </div>
          <ul>
            <li
              v-for="(reserva, index) in group.reservas"
              :key="index"
              class="mb-3 bg-gray-700 p-3 rounded"
            >
              <p><strong>Nome:</strong> {{ reserva.titular.nome }}</p>
              <p>
                <strong>Empreendimento:</strong>
                {{ reserva.unidade.empreendimento }} |
                {{ reserva.unidade.etapa }} |
                {{ reserva.unidade.unidade }} |
                {{ reserva.data }}
              </p>
            </li>
          </ul>
        </div>
      </template>
      <p v-else>
        Nenhuma reserva encontrada para este empreendimento.
      </p>
    </div>
  </div>
</template>

<style scoped>
.clip {
  clip-path: polygon(95% 50%, 90% 90%, 0% 90%, 5% 50%, 0% 10%, 90% 10%);
}
</style>
