import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useReservaStore = defineStore('reserva', () => {
  // Inicia como objeto vazio; as chaves serão criadas dinamicamente
  const reservas = ref({});
  const erro = ref(null);
  const total = ref(0);
  const carregando = ref(false); // Controle de carregamento

  const carregarReservas = async (idempreendimento) => {
    try {
      carregando.value = true; // Marca como carregando

      // URL com parâmetros para trazer todos os registros
      const url = `http://localhost:5000/api/external/reservas?situacao=todas&idempreendimento=${idempreendimento}&registros_por_pagina=500&pagina=1`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Resposta da API:', data);

      // Salva os registros retornados (substituindo os anteriores, se houver)
      reservas.value[idempreendimento] = Object.values(data);
      erro.value = null;

      // Atualiza o total de reservas (soma todas as reservas de todas as chaves)
      total.value = Object.values(reservas.value).reduce(
        (acc, arr) => acc + arr.length,
        0
      );
      console.log('Total de reservas:', total.value);
    } catch (e) {
      console.error('Erro ao carregar reservas:', e.message);
      erro.value = e.message;
    } finally {
      carregando.value = false; // Marca como não carregando
    }
  };

  const carregarTodasReservas = async () => {
    // Caso deseje carregar para todos os empreendimentos já cadastrados na store:
    for (const idempreendimento in reservas.value) {
      await carregarReservas(idempreendimento);
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
