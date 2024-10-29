// src/utils/fetchCarregamento.js
import { useCarregamentoStore } from '../stores/carregamento';
 
export async function fetchCarregamento(url, options = {}) {
  const carregamentoStore = useCarregamentoStore();
  carregamentoStore.iniciarCarregamento();

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error('Falha na requisição. Tente novamente mais tarde.');
    }
    return response;
  } catch (error) {
    console.error('Erro na requisição:', error);
    throw error;
  } finally {
    carregamentoStore.finalizarCarregamento();
  }
}