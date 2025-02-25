// src/utils/fetchCarregamento.js
import { useCarregamentoStore } from '../../stores/Config/carregamento';

export async function fetchCarregamento(url, options = {}) {
  const carregamentoStore = useCarregamentoStore();
  carregamentoStore.iniciarCarregamento();

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      let errorMessage = 'Falha na requisição. Tente novamente mais tarde.';

      try { 
        const errorData = await response.json(); 
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (jsonError) { 
      } 
      throw new Error(errorMessage);
    }
    return response;
  } catch (error) {
    console.error('Erro na requisição:', error);
    throw error;
  } finally {
    carregamentoStore.finalizarCarregamento();
  }
}
