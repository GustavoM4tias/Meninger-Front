import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useReservaStore = defineStore('reserva', () => {
    const reservas = ref({
        '1': [], // Nova Reserva
        '12': [], // Analise Comercial
        '20': [], // Validação de Dados/Docs
        '15': [], // Geração de Contratos
        '16': [], // Em Assinatura
        '21': [], // Assinado
        '22': [], // Em Contratação Caixa
    });
    const erro = ref(null);
    const total = ref(0);
    const carregando = ref(false);  // Controle de carregamento

    const carregarReservas = async (situacao) => {
        try {
            carregando.value = true;  // Marca como carregando

            const response = await fetch(
                `https://node-back-eight.vercel.app/api/external/reservas?situacao=${situacao}`
            );

            if (!response.ok) {
                throw new Error(`Erro na requisição: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Resposta da API:', data);

            // Adiciona as reservas da situação
            reservas.value[situacao] = reservas.value[situacao].concat(Object.values(data));
            erro.value = null;

            // Atualiza o total de reservas com base no número total de reservas
            total.value = Object.values(reservas.value).reduce((acc, situacao) => acc + situacao.length, 0);
            console.log('Total de reservas:', total.value);
        } catch (e) {
            console.error('Erro ao carregar reservas:', e.message);
            erro.value = e.message;
        } finally {
            carregando.value = false;  // Marca como não carregando
        }
    };

    const carregarTodasReservas = async () => {
        for (const situacao in reservas.value) {
            await carregarReservas(situacao);
        }
    };

    return {
        reservas,
        erro,
        total,
        carregando,
        carregarReservas,
        carregarTodasReservas
    };
});
